# 🚀 Background Jobs & Async Email Sending

## Tại sao cần Async?

### Vấn đề với Sync API:

```
500 emails × 1.2s = 600s = 10 phút
→ HTTP timeout sau 30-60s
→ Client nhận timeout nhưng server vẫn gửi
→ Không biết kết quả cuối cùng
```

### Giải pháp Async:

```
1. Client gửi request
2. Server tạo background job
3. Response ngay lập tức (<1s)
4. Client poll job status
5. Nhận kết quả khi hoàn thành
```

---

## 🎯 Tính năng mới

### ✅ Concurrent Batch Sending

- **10 emails cùng lúc** (thay vì 1)
- **2 giây delay** giữa batches
- **500 emails trong ~2-3 phút** (thay vì 10 phút)

### ✅ Background Processing

- API response ngay lập tức
- Không bị HTTP timeout
- Track progress realtime

### ✅ Detailed Logging

```
[JOB] job-123 - Batch 5/50 - Sending 10 emails...
[JOB] job-123 - Progress: 50/500 (10%) - Success: 48, Failed: 2
[JOB] job-123 - Waiting 2000ms before next batch...
[JOB] job-123 - COMPLETED in 2m 34s - Success: 488, Failed: 12
```

---

## 📖 API Usage

### 1. Gửi email async (Recommended)

```bash
POST /api/send-emails-async/:filename
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/send-emails-async/1768467000-test.xlsx
```

**Response (ngay lập tức):**

```json
{
  "success": true,
  "message": "Đang gửi email trong background",
  "job": {
    "id": "job-1768467123-abc123",
    "filename": "1768467000-test.xlsx",
    "totalEmails": 500,
    "status": "pending",
    "estimatedTime": "3 phút",
    "statusUrl": "/api/job-status/job-1768467123-abc123",
    "createdAt": "2026-01-15T10:30:00.000Z"
  }
}
```

### 2. Check job status

```bash
GET /api/job-status/:jobId
```

**Example:**

```bash
curl http://localhost:3000/api/job-status/job-1768467123-abc123
```

**Response (đang chạy):**

```json
{
  "success": true,
  "job": {
    "id": "job-1768467123-abc123",
    "filename": "1768467000-test.xlsx",
    "status": "in_progress",
    "progress": {
      "total": 500,
      "sent": 234,
      "failed": 12,
      "current": 246,
      "percentage": 49
    },
    "createdAt": "2026-01-15T10:30:00.000Z",
    "startedAt": "2026-01-15T10:30:01.000Z",
    "completedAt": null
  }
}
```

**Response (hoàn thành):**

```json
{
  "success": true,
  "job": {
    "id": "job-1768467123-abc123",
    "filename": "1768467000-test.xlsx",
    "status": "completed",
    "progress": {
      "total": 500,
      "sent": 488,
      "failed": 12,
      "current": 500,
      "percentage": 100
    },
    "createdAt": "2026-01-15T10:30:00.000Z",
    "startedAt": "2026-01-15T10:30:01.000Z",
    "completedAt": "2026-01-15T10:32:45.000Z",
    "duration": "2m 44s",
    "summary": {
      "total": 500,
      "success": 488,
      "failed": 12
    },
    "results": [
      {
        "email": "customer1@gmail.com",
        "status": "success",
        "orderCount": 2
      },
      {
        "email": "customer2@gmail.com",
        "status": "failed",
        "error": "Invalid recipient",
        "orderCount": 1
      }
    ],
    "resultsNote": "Showing 10 of 500 results"
  }
}
```

### 3. List all jobs

```bash
GET /api/jobs
```

**Response:**

```json
{
  "success": true,
  "count": 5,
  "total": 5,
  "jobs": [
    {
      "id": "job-1768467123-abc123",
      "filename": "test.xlsx",
      "status": "completed",
      "progress": {
        "total": 500,
        "sent": 488,
        "failed": 12,
        "current": 500,
        "percentage": 100
      },
      "createdAt": "2026-01-15T10:30:00.000Z",
      "startedAt": "2026-01-15T10:30:01.000Z",
      "completedAt": "2026-01-15T10:32:45.000Z"
    }
  ]
}
```

---

## 🔄 Workflow

### Full Example:

```bash
# 1. Upload file
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/upload -F "file=@test.xlsx")
FILENAME=$(echo $UPLOAD_RESPONSE | jq -r '.file.filename')
echo "Uploaded: $FILENAME"

# 2. Start async job
JOB_RESPONSE=$(curl -s -X POST http://localhost:3000/api/send-emails-async/$FILENAME)
JOB_ID=$(echo $JOB_RESPONSE | jq -r '.job.id')
echo "Job created: $JOB_ID"

# 3. Poll status every 5 seconds
while true; do
    STATUS=$(curl -s http://localhost:3000/api/job-status/$JOB_ID)
    JOB_STATUS=$(echo $STATUS | jq -r '.job.status')
    PROGRESS=$(echo $STATUS | jq -r '.job.progress.percentage')
    
    echo "Status: $JOB_STATUS - Progress: $PROGRESS%"
    
    if [ "$JOB_STATUS" = "completed" ] || [ "$JOB_STATUS" = "failed" ]; then
        echo "Final result:"
        echo $STATUS | jq '.job.summary'
        break
    fi
    
    sleep 5
done
```

### Frontend Example (JavaScript):

```javascript
// 1. Start job
const startJob = async (filename) => {
    const response = await fetch(`/api/send-emails-async/${filename}`, {
        method: 'POST'
    });
    const data = await response.json();
    return data.job.id;
};

// 2. Poll status
const pollJobStatus = async (jobId, onProgress) => {
    const poll = async () => {
        const response = await fetch(`/api/job-status/${jobId}`);
        const data = await response.json();
        const job = data.job;
        
        // Callback with progress
        onProgress(job);
        
        // Continue polling if not done
        if (job.status === 'in_progress' || job.status === 'pending') {
            setTimeout(poll, 3000); // Poll every 3s
        }
    };
    
    poll();
};

// 3. Usage
const filename = '1768467000-test.xlsx';
const jobId = await startJob(filename);

pollJobStatus(jobId, (job) => {
    console.log(`Progress: ${job.progress.percentage}%`);
    console.log(`Success: ${job.progress.sent}, Failed: ${job.progress.failed}`);
    
    if (job.status === 'completed') {
        console.log('✅ Completed!', job.summary);
    }
});
```

---

## ⚡ Performance

### Comparison:

| Method | 500 Emails | Concurrent | Timeout Risk |
|--------|-----------|------------|--------------|
| **Old (Sequential)** | ~10 phút | 1 | ❌ High |
| **Sync (Batch)** | ~3 phút | 10 | ⚠️ Medium |
| **Async (Batch)** | ~3 phút | 10 | ✅ None |

### Concurrent Settings:

```javascript
// In server.js
const CONCURRENT_LIMIT = 10;  // Emails per batch
const BATCH_DELAY = 2000;     // Milliseconds between batches

// Calculations:
// 500 emails / 10 = 50 batches
// 50 batches × 2s = 100s = ~2 phút
// + SMTP overhead = ~3 phút total
```

### Adjust for your needs:

| Concurrent | Batch Delay | 500 Emails | Risk |
|------------|-------------|------------|------|
| 5 | 3s | ~5 phút | ✅ Very Safe |
| **10** | **2s** | **~3 phút** | **✅ Recommended** |
| 15 | 1s | ~2 phút | ⚠️ Aggressive |
| 20 | 500ms | ~1 phút | ❌ Risky |

---

## 📊 Monitoring

### Server Logs:

```bash
# Docker
docker logs -f email-automation-api | grep "\[JOB\]"

# Output:
[JOB] Created job job-1768467123-abc123 for 500 emails
[JOB] job-1768467123-abc123 - Starting batch sending: 500 emails, 10 concurrent
[JOB] job-1768467123-abc123 - Batch 1/50 - Sending 10 emails...
[JOB] job-1768467123-abc123 - Progress: 10/500 (2%) - Success: 9, Failed: 1
[JOB] job-1768467123-abc123 - Waiting 2000ms before next batch...
[JOB] job-1768467123-abc123 - Batch 2/50 - Sending 10 emails...
...
[JOB] job-1768467123-abc123 - COMPLETED in 2m 44s - Success: 488, Failed: 12
```

### Realtime Dashboard (Future):

```
╔═══════════════════════════════════════╗
║  Job: job-1768467123-abc123          ║
║  Status: IN PROGRESS                 ║
║  ━━━━━━━━━━━━━━━━━━━━━━░░░░ 75%     ║
║  Sent: 375 / 500                     ║
║  Failed: 8                           ║
║  Time Elapsed: 2m 15s                ║
║  ETA: 55s                            ║
╚═══════════════════════════════════════╝
```

---

## 🔧 Configuration

### Environment Variables:

```bash
# .env
CONCURRENT_LIMIT=10      # Optional, default: 10
BATCH_DELAY=2000         # Optional, default: 2000ms
MAX_JOBS_IN_MEMORY=100   # Optional, default: unlimited
```

### Runtime Tuning:

Edit `server.js`:

```javascript
// For conservative sending (Gmail Free)
const CONCURRENT_LIMIT = 5;
const BATCH_DELAY = 3000;

// For aggressive sending (Workspace + dedicated SMTP)
const CONCURRENT_LIMIT = 15;
const BATCH_DELAY = 1000;
```

---

## ⚠️ Important Notes

### 1. **In-Memory Storage**

Jobs are stored in memory. **Will be lost on server restart**.

For production, consider:
- Redis for job queue
- Database for job history
- Persistent storage

### 2. **Job Cleanup**

Currently keeps all jobs in memory. Implement cleanup:

```javascript
// Auto-cleanup after 1 hour
setInterval(() => {
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, job] of jobs.entries()) {
        if (job.completedAt && new Date(job.completedAt).getTime() < oneHourAgo) {
            jobs.delete(id);
            console.log(`[CLEANUP] Removed job ${id}`);
        }
    }
}, 3600000); // Every hour
```

### 3. **Concurrent Limits**

Gmail Workspace:
- Max ~15 concurrent SMTP connections
- **Recommend 10** to be safe
- Monitor for errors

### 4. **Error Recovery**

If server crashes mid-job:
- Job progress is lost
- Some emails may have been sent
- No automatic resume

**Future improvement:** Save progress to database for resume capability.

---

## 🚀 Migration Guide

### Before (Sync only):

```bash
POST /api/send-emails/:filename
→ Wait 10 phút
→ Might timeout
→ No progress tracking
```

### After (Async):

```bash
POST /api/send-emails-async/:filename
→ Response in < 1s
→ No timeout
→ Poll GET /api/job-status/:jobId
→ Track progress realtime
```

### Both APIs Available:

- **`/api/send-emails/:filename`** - Sync (for small files < 50 emails)
- **`/api/send-emails-async/:filename`** - Async (recommended for all)

---

## ✅ Summary

✅ **10x concurrent sending** - 10 emails at once  
✅ **3x faster** - 3 phút thay vì 10 phút  
✅ **No timeout** - Background processing  
✅ **Progress tracking** - Realtime status  
✅ **Detailed logs** - Every batch logged  
✅ **Production ready** - Safe defaults  

**Recommend:** Always use `/api/send-emails-async` for files with > 50 emails! 🚀
