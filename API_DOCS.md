# API Documentation - Email Service

API Server để upload file Excel và gửi email tự động.

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. Health Check
Kiểm tra server có đang chạy không.

**Request:**
```http
GET /
```

**Response:**
```json
{
    "status": "OK",
    "message": "Email API Server is running",
    "endpoints": {
        "upload": "POST /api/upload",
        "preview": "GET /api/preview/:filename",
        "sendEmails": "POST /api/send-emails/:filename",
        "listFiles": "GET /api/files"
    }
}
```

---

### 2. Upload File Excel
Upload file .xlsx chứa dữ liệu đơn hàng.

**Request:**
```http
POST /api/upload
Content-Type: multipart/form-data

file: <file.xlsx>
```

**Response:**
```json
{
    "success": true,
    "message": "Upload file thành công",
    "file": {
        "filename": "1234567890-test.xlsx",
        "originalName": "test.xlsx",
        "size": 12345,
        "path": "/path/to/uploads/1234567890-test.xlsx"
    },
    "preview": {
        "totalEmails": 428,
        "totalOrders": 493
    }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.xlsx"
```

---

### 3. Preview Dữ Liệu
Xem trước dữ liệu từ file đã upload.

**Request:**
```http
GET /api/preview/:filename
```

**Parameters:**
- `filename` (string, required): Tên file đã upload

**Response:**
```json
{
    "success": true,
    "data": {
        "totalEmails": 428,
        "recipients": [
            {
                "email": "example@gmail.com",
                "name": "Nguyễn Văn A",
                "phone": "0123456789",
                "orderCount": 2
            }
        ]
    }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/preview/1234567890-test.xlsx
```

---

### 4. Gửi Email
Gửi email tự động cho tất cả khách hàng trong file.

**Request:**
```http
POST /api/send-emails/:filename
```

**Parameters:**
- `filename` (string, required): Tên file đã upload

**Response:**
```json
{
    "success": true,
    "message": "Hoàn thành gửi email",
    "summary": {
        "total": 428,
        "success": 425,
        "failed": 3
    },
    "results": [
        {
            "email": "example1@gmail.com",
            "status": "success",
            "orderCount": 2
        },
        {
            "email": "example2@gmail.com",
            "status": "failed",
            "error": "Invalid email address",
            "orderCount": 1
        }
    ]
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/send-emails/1234567890-test.xlsx
```

---

### 5. Liệt Kê File
Xem danh sách các file đã upload.

**Request:**
```http
GET /api/files
```

**Response:**
```json
{
    "success": true,
    "files": [
        {
            "filename": "1234567890-test.xlsx",
            "size": 12345,
            "uploadedAt": "2024-01-15T10:30:00.000Z"
        }
    ]
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/files
```

---

### 6. Xóa File
Xóa file đã upload.

**Request:**
```http
DELETE /api/files/:filename
```

**Parameters:**
- `filename` (string, required): Tên file cần xóa

**Response:**
```json
{
    "success": true,
    "message": "Xóa file thành công"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/files/1234567890-test.xlsx
```

---

## Error Responses

Tất cả endpoint có thể trả về error với format:

```json
{
    "success": false,
    "message": "Error message",
    "error": "Detailed error"
}
```

**Common Error Codes:**
- `400` - Bad Request (thiếu thông tin, file không hợp lệ)
- `404` - Not Found (file không tồn tại)
- `500` - Internal Server Error (lỗi server, lỗi SMTP)

---

## Workflow

### Quy trình sử dụng API:

1. **Upload file Excel:**
   ```bash
   POST /api/upload
   ```
   → Nhận về `filename`

2. **Preview dữ liệu (optional):**
   ```bash
   GET /api/preview/{filename}
   ```
   → Kiểm tra số lượng email, khách hàng

3. **Gửi email:**
   ```bash
   POST /api/send-emails/{filename}
   ```
   → Server tự động gửi email cho tất cả khách hàng

4. **Xóa file (optional):**
   ```bash
   DELETE /api/files/{filename}
   ```

---

## Testing với Postman

### 1. Upload File
- Method: POST
- URL: `http://localhost:3000/api/upload`
- Body: form-data
  - Key: `file`
  - Type: File
  - Value: Chọn file .xlsx

### 2. Preview
- Method: GET
- URL: `http://localhost:3000/api/preview/{filename}`
  - Thay `{filename}` bằng tên file từ response upload

### 3. Send Emails
- Method: POST
- URL: `http://localhost:3000/api/send-emails/{filename}`

---

## Notes

- File upload sẽ được lưu trong thư mục `uploads/`
- Mỗi email có delay 1 giây để tránh spam
- Cần có file `.env` với thông tin SMTP
- Chỉ chấp nhận file `.xlsx`
- File sẽ không tự động xóa sau khi gửi email (cần xóa thủ công qua API)

---

## Environment Variables

File `.env` cần có các biến:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_NAME=Storydesk
FROM_EMAIL=your-email@gmail.com
EMAIL_SUBJECT=Xác nhận đơn hàng của bạn
```
