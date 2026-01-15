# 🚀 Quick Start: Async Email Sending

## TL;DR

```bash
# 1. Upload file
curl -X POST http://localhost:3000/api/upload -F "file=@test.xlsx"

# 2. Start async job (returns immediately)
curl -X POST http://localhost:3000/api/send-emails-async/FILENAME.xlsx

# 3. Check progress
curl http://localhost:3000/api/job-status/JOB_ID

# Or use the test script:
./test-async.sh
```

---

## ⚡ What Changed?

### Before:
```
500 emails = 10 phút
❌ Timeout risk
❌ No progress tracking
❌ 1 email at a time
```

### After:
```
500 emails = ~3 phút
✅ No timeout (background job)
✅ Realtime progress
✅ 10 emails concurrent
✅ Detailed logs
```

---

## 📋 API Endpoints

### New Endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/send-emails-async/:filename` | POST | Start background job |
| `/api/job-status/:jobId` | GET | Check job progress |
| `/api/jobs` | GET | List recent jobs |

### Existing (updated):

| Endpoint | Method | Notes |
|----------|--------|-------|
| `/api/send-emails/:filename` | POST | Now uses concurrent (still may timeout) |

---

## 🎯 Use Cases

### Case 1: Small file (< 50 emails)
```bash
# Either sync or async works
POST /api/send-emails/:filename
```

### Case 2: Medium file (50-200 emails)
```bash
# Recommend async to avoid timeout
POST /api/send-emails-async/:filename
```

### Case 3: Large file (200+ emails)
```bash
# MUST use async
POST /api/send-emails-async/:filename
```

---

## 📊 Performance

| Emails | Old (Sequential) | New (Concurrent) | Speedup |
|--------|------------------|------------------|---------|
| 50 | ~1 min | ~15 sec | 4x |
| 100 | ~2 min | ~30 sec | 4x |
| 500 | ~10 min | ~3 min | 3.3x |
| 1000 | ~20 min | ~6 min | 3.3x |

---

## 🔍 Example: 500 Emails

### Step-by-step:

```bash
# 1. Upload
$ curl -X POST http://localhost:3000/api/upload -F "file=@test.xlsx"
{
  "success": true,
  "file": {
    "filename": "1768467000-test.xlsx"
  },
  "preview": {
    "totalEmails": 500
  }
}

# 2. Start job
$ curl -X POST http://localhost:3000/api/send-emails-async/1768467000-test.xlsx
{
  "success": true,
  "message": "Đang gửi email trong background",
  "job": {
    "id": "job-1768467123-abc123",
    "totalEmails": 500,
    "status": "pending",
    "estimatedTime": "3 phút",
    "statusUrl": "/api/job-status/job-1768467123-abc123"
  }
}

# 3. Poll status (after 30 seconds)
$ curl http://localhost:3000/api/job-status/job-1768467123-abc123
{
  "success": true,
  "job": {
    "id": "job-1768467123-abc123",
    "status": "in_progress",
    "progress": {
      "total": 500,
      "sent": 145,
      "failed": 5,
      "current": 150,
      "percentage": 30
    }
  }
}

# 4. Poll again (after 3 minutes)
$ curl http://localhost:3000/api/job-status/job-1768467123-abc123
{
  "success": true,
  "job": {
    "status": "completed",
    "progress": {
      "total": 500,
      "sent": 488,
      "failed": 12,
      "percentage": 100
    },
    "duration": "2m 54s",
    "summary": {
      "total": 500,
      "success": 488,
      "failed": 12
    }
  }
}
```

---

## 🖥️ Server Logs

### What you'll see:

```
[JOB] Created job job-1768467123-abc123 for 500 emails
[JOB] job-1768467123-abc123 - Starting batch sending: 500 emails, 10 concurrent
[JOB] job-1768467123-abc123 - Batch 1/50 - Sending 10 emails...
[JOB] job-1768467123-abc123 - Progress: 10/500 (2%) - Success: 9, Failed: 1
[JOB] job-1768467123-abc123 - Waiting 2000ms before next batch...
[JOB] job-1768467123-abc123 - Batch 2/50 - Sending 10 emails...
[JOB] job-1768467123-abc123 - Progress: 20/500 (4%) - Success: 19, Failed: 1
...
[JOB] job-1768467123-abc123 - Batch 50/50 - Sending 10 emails...
[JOB] job-1768467123-abc123 - Progress: 500/500 (100%) - Success: 488, Failed: 12
[JOB] job-1768467123-abc123 - COMPLETED in 2m 54s - Success: 488, Failed: 12
```

### Watch logs:

```bash
# Docker
docker logs -f email-automation-api | grep "\[JOB\]"

# Local
npm start | grep "\[JOB\]"
```

---

## 🧪 Testing

### Automatic test script:

```bash
./test-async.sh
```

**Output:**

```
======================================
Test Async Email Sending
======================================

1. Checking server...
✓ Server is running

2. Getting uploaded files...
Using file: 1768467000-test.xlsx

3. Starting async email job...
✓ Job created
  Job ID: job-1768467123-abc123
  Total emails: 500
  Estimated time: 3 phút

4. Monitoring progress...

[████████████████████████████████████████] 100% | 500/500 | ✓ 488 | ✗ 12 | Status: completed

✓ Job completed!
  Duration: 2m 54s
  Total: 500
  Success: 488
  Failed: 12

======================================
Test completed!
======================================
```

---

## ⚙️ Configuration

### Concurrent settings (in server.js):

```javascript
const CONCURRENT_LIMIT = 10;  // Send 10 emails at once
const BATCH_DELAY = 2000;     // 2 seconds between batches
```

### Adjust for your needs:

```javascript
// Conservative (safer, slower)
const CONCURRENT_LIMIT = 5;
const BATCH_DELAY = 3000;

// Aggressive (faster, riskier)
const CONCURRENT_LIMIT = 15;
const BATCH_DELAY = 1000;
```

---

## 🚨 Important Notes

### 1. **Job Storage**
- Jobs stored in memory
- Lost on server restart
- Production: use Redis/Database

### 2. **Concurrent Limits**
- Gmail Workspace: max ~15 connections
- Recommend: 10 concurrent
- Monitor for errors

### 3. **Polling**
- Client should poll every 3-5 seconds
- Don't poll too frequently (rate limiting)

### 4. **Cleanup**
- Jobs stay in memory forever (current implementation)
- TODO: Auto-cleanup old jobs

---

## 📚 Documentation

Full docs:
- `ASYNC_JOBS.md` - Complete async documentation
- `API_DOCS.md` - All API endpoints
- Swagger UI: `http://localhost:3000/api-docs`

---

## ✅ Summary

**Use async API for:**
- ✅ Files with > 50 emails
- ✅ Production deployments
- ✅ When you need progress tracking
- ✅ To avoid timeout issues

**Current setup:**
- ⚡ 10 concurrent emails
- ⏱️ 2s delay between batches
- 📊 Realtime progress tracking
- 🚀 3x faster than before

**Ready to use!** 🎉
