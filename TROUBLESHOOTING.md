# 🔧 Troubleshooting Guide

Common issues and solutions.

## 🐛 Error: "EISDIR: illegal operation on a directory, read"

### Symptom
```json
{
  "success": false,
  "message": "Lỗi khi gửi email",
  "error": "EISDIR: illegal operation on a directory, read"
}
```

### Cause
Script đang cố đọc một thư mục (directory) thay vì file.

### Solutions

#### 1. Kiểm tra filename
Đảm bảo bạn đang truyền **filename cụ thể**, không phải tên thư mục:

**❌ Sai:**
```bash
POST /api/send-emails/uploads
POST /api/send-emails/
POST /api/send-emails/.gitkeep
```

**✅ Đúng:**
```bash
POST /api/send-emails/1234567890-test.xlsx
```

#### 2. List files trước
```bash
# Get list of available files
curl https://phuphiem-api.site/api/files

# Copy exact filename from response
# Then use it:
curl -X POST https://phuphiem-api.site/api/send-emails/{filename}
```

#### 3. Docker Volume Issues

**Kiểm tra uploads directory trong container:**

```bash
# Check files in container
docker-compose exec email-api ls -la /app/uploads/

# Should see files like:
# 1234567890-test.xlsx
# Not just .gitkeep or empty
```

**Fix volume mount:**

In `docker-compose.yml`:
```yaml
volumes:
  - ./uploads:/app/uploads  # ✅ Correct
  # NOT:
  # - uploads:/app/uploads  # ❌ Wrong (named volume)
```

#### 4. Check file permissions

```bash
# On host
ls -la uploads/

# Should show files with read permissions
# If not:
chmod 644 uploads/*.xlsx
```

#### 5. Verify upload worked

```bash
# Upload file
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.xlsx"

# Response will include filename:
{
  "filename": "1234567890-test.xlsx"  # ← Use this exact name
}

# Then send emails with that filename
curl -X POST http://localhost:3000/api/send-emails/1234567890-test.xlsx
```

---

## 🐛 Error: "File không tồn tại"

### Symptom
```json
{
  "success": false,
  "message": "File không tồn tại",
  "filename": "test.xlsx"
}
```

### Solutions

#### 1. Upload file trước
```bash
curl -X POST http://localhost:3000/api/upload -F "file=@test.xlsx"
```

#### 2. Check exact filename
Filename trong container có thể khác trên host:
```bash
# List files
curl http://localhost:3000/api/files
```

#### 3. Docker volume sync
```bash
# Restart container to sync volumes
docker-compose restart
```

---

## 🐛 SMTP Connection Error

### Symptom
```json
{
  "success": false,
  "message": "Không thể kết nối đến SMTP server",
  "error": "getaddrinfo ENOTFOUND smtp.gmail.com"
}
```

### Solutions

#### 1. Check .env file
```bash
# In container
docker-compose exec email-api cat .env

# Should show:
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### 2. Mount .env correctly
```yaml
# docker-compose.yml
volumes:
  - ./.env:/app/.env:ro  # :ro = read-only
```

#### 3. Test SMTP
```bash
docker-compose exec email-api node test-email.js
```

#### 4. Network issues
```bash
# Check if container can reach internet
docker-compose exec email-api ping -c 3 smtp.gmail.com
```

---

## 🐛 CORS Errors

See [CORS_DEBUG.md](./CORS_DEBUG.md) and [AWS_DEPLOY.md](./AWS_DEPLOY.md)

---

## 🐛 Upload Fails

### Symptom
File upload returns error or file not saved.

### Solutions

#### 1. Check uploads directory exists
```bash
# In container
docker-compose exec email-api ls -la /app/uploads/

# Should exist and be writable
```

#### 2. Create if missing
```bash
# In Dockerfile (already done)
RUN mkdir -p uploads

# Or manually in container
docker-compose exec email-api mkdir -p /app/uploads
```

#### 3. Fix permissions
```bash
# On host
chmod 755 uploads/
chmod 644 uploads/*

# In container
docker-compose exec email-api chmod 755 /app/uploads
```

#### 4. Check multer config
File size limit: **50MB** (already configured)

For larger files, update `server.js`:
```javascript
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
```

---

## 🐛 Container Won't Start

### Check logs
```bash
docker-compose logs email-api

# Common issues:
# - Port 3000 already in use
# - Missing .env file
# - Syntax error in code
```

### Solutions

#### Port conflict
```bash
# Find process using port 3000
lsof -i :3000

# Kill it or change port in docker-compose.yml
ports:
  - "3001:3000"  # Use different host port
```

#### Missing dependencies
```bash
# Rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

---

## 🐛 Email Sending Slow

### Symptom
Sending 400+ emails takes very long.

### Cause
1 second delay between each email.

### Solutions

#### Reduce delay (carefully!)
In `server.js`:
```javascript
// Change from 1000ms to 500ms
await new Promise((resolve) => setTimeout(resolve, 500));
```

**Warning**: Too fast may trigger spam filters!

#### Use queue system (advanced)
Implement Redis + Bull queue for background processing.

---

## 📝 Debug Checklist

When something fails:

1. **Check logs**
   ```bash
   docker-compose logs -f
   ```

2. **Verify files exist**
   ```bash
   curl http://localhost:3000/api/files
   ```

3. **Test endpoints**
   ```bash
   curl http://localhost:3000/
   ```

4. **Check container status**
   ```bash
   docker-compose ps
   ```

5. **Inspect container**
   ```bash
   docker-compose exec email-api sh
   ls -la /app/uploads/
   cat .env
   ```

6. **Test SMTP**
   ```bash
   docker-compose exec email-api node test-email.js
   ```

7. **Check permissions**
   ```bash
   ls -la uploads/
   ```

8. **Rebuild if needed**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

---

## 🆘 Still Need Help?

1. Collect information:
   - Error message (full)
   - Docker logs: `docker-compose logs --tail=50`
   - Request you're making (cURL command)
   - File list: `curl http://localhost:3000/api/files`

2. Check documentation:
   - [README.md](./README.md)
   - [DOCKER.md](./DOCKER.md)
   - [AWS_DEPLOY.md](./AWS_DEPLOY.md)
   - [CORS_DEBUG.md](./CORS_DEBUG.md)

3. Test with provided tools:
   - `test-cors.html`
   - `test-api.sh`
   - `test-aws-cors.sh`
