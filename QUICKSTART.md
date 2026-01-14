# 🚀 Quick Start Guide

## Khởi động nhanh trong 3 bước

### Bước 1: Cấu hình Email (chỉ làm 1 lần)

Tạo file `.env` với nội dung:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

FROM_NAME=Storydesk
FROM_EMAIL=your-email@gmail.com
EMAIL_SUBJECT=[STORYDESK] XÁC NHẬN ĐƠN HÀNG NGẦU DESK
```

💡 **Với Gmail**: Tạo App Password tại https://myaccount.google.com/apppasswords

### Bước 2: Start Server

```bash
npm start
```

Server chạy tại: **http://localhost:3000**

### Bước 3: Sử dụng API

#### Cách 1: Dùng cURL (Terminal)

```bash
# Upload file
curl -X POST http://localhost:3000/api/upload -F "file=@test.xlsx"

# Kết quả trả về filename, ví dụ: "1234567890-test.xlsx"

# Gửi email (thay YOUR_FILENAME bằng filename trên)
curl -X POST http://localhost:3000/api/send-emails/YOUR_FILENAME
```

#### Cách 2: Dùng Postman

1. **Upload File:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/upload`
   - Body: form-data
     - Key: `file` (type: File)
     - Value: Chọn file .xlsx

2. **Gửi Email:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/send-emails/{filename}`
   - Thay `{filename}` bằng tên file từ bước 1

#### Cách 3: Dùng Script Test

```bash
./test-api.sh
```

Script này sẽ tự động:
- Upload file test.xlsx
- Preview dữ liệu
- Hỏi xác nhận trước khi gửi email

---

## 📝 API Endpoints Chính

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/upload` | POST | Upload file xlsx |
| `/api/preview/:filename` | GET | Xem trước dữ liệu |
| `/api/send-emails/:filename` | POST | Gửi email tự động |
| `/api/files` | GET | Liệt kê file |

📖 **Chi tiết**: Xem [API_DOCS.md](./API_DOCS.md)

---

## ⚡ Tips

### Test an toàn
```bash
npm run test-email
```
→ Gửi 1 email mẫu đến chính email của bạn

### Preview trước khi gửi
```bash
curl http://localhost:3000/api/preview/YOUR_FILENAME
```
→ Xem có bao nhiêu email sẽ được gửi

### Kiểm tra file đã upload
```bash
curl http://localhost:3000/api/files
```

---

## 🔧 Troubleshooting

### Server không start?
- Kiểm tra port 3000 có bị chiếm không
- Thử port khác: `PORT=4000 npm start`

### Lỗi SMTP?
- Kiểm tra file `.env` có đúng không
- Với Gmail: Đảm bảo dùng App Password
- Test kết nối: `npm run test-email`

### Upload file lỗi?
- Chỉ chấp nhận file `.xlsx`
- File phải có cột: "Email Address", "Số điện thoại", "Tên người nhận"

---

## 📞 Support

- 📧 Email: support@storydesk.co
- 📱 Instagram: @storydesk.co

---

## 🎯 Workflow Hoàn Chỉnh

```
1. Chuẩn bị file Excel với dữ liệu đơn hàng
2. Start server: npm start
3. Upload file qua API
4. Preview để kiểm tra (optional)
5. Gửi email tự động
6. Kiểm tra kết quả
7. Xóa file nếu cần (optional)
```

**Thời gian ước tính**: ~2-5 phút cho 400+ emails (có delay 1s giữa mỗi email)
