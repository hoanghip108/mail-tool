# Email Automation System

Hệ thống tự động gửi email xác nhận đơn hàng cho khách hàng dựa trên dữ liệu từ file Excel.

## 🎯 Tính năng

- ✅ Upload file Excel (.xlsx) qua API
- ✅ Tự động nhóm đơn hàng theo email
- ✅ Gửi email HTML đẹp với template tùy chỉnh
- ✅ API REST để quản lý và gửi email
- ✅ Preview dữ liệu trước khi gửi
- ✅ Báo cáo chi tiết kết quả gửi email

## 📋 Yêu cầu

- Node.js đã cài đặt
- File Excel chứa dữ liệu đơn hàng (`test.xlsx`)
- Tài khoản email SMTP (Gmail, Outlook, Yahoo, v.v.)

## 🚀 Cài đặt

1. Cài đặt các package cần thiết:
```bash
npm install
```

2. Tạo file cấu hình `.env`:
```bash
cp .env.example .env
```

3. Mở file `.env` và điền thông tin SMTP của bạn:

### Với Gmail:
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

**Lưu ý với Gmail:**
- Bạn cần tạo App Password (không dùng mật khẩu Gmail thông thường)
- Truy cập: https://myaccount.google.com/apppasswords
- Chọn "Mail" và thiết bị của bạn
- Copy mật khẩu 16 ký tự vào `SMTP_PASS`

### Với Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Với Yahoo:
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

## 🚀 Sử dụng

### Phương án 1: API Server (Khuyến nghị)

Chạy API server:
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

**📚 Swagger UI (Interactive API Docs):**
```
http://localhost:3000/api-docs
```

**Các API endpoints:**
- `POST /api/upload` - Upload file xlsx
- `GET /api/preview/:filename` - Xem trước dữ liệu
- `POST /api/send-emails/:filename` - Gửi email tự động
- `GET /api/files` - Liệt kê file đã upload
- `DELETE /api/files/:filename` - Xóa file

📖 Xem chi tiết tại:
- [API_DOCS.md](./API_DOCS.md) - Markdown docs
- [SWAGGER.md](./SWAGGER.md) - Swagger guide
- `http://localhost:3000/api-docs` - Interactive Swagger UI

**Test với cURL:**
```bash
# Upload file
curl -X POST http://localhost:3000/api/upload -F "file=@test.xlsx"

# Preview (thay YOUR_FILENAME)
curl http://localhost:3000/api/preview/YOUR_FILENAME

# Gửi email
curl -X POST http://localhost:3000/api/send-emails/YOUR_FILENAME
```

### Phương án 2: Command Line Script

#### 1. Gửi email từ file:
```bash
npm run send
# hoặc: node send-emails.js
```

#### 2. Test gửi 1 email:
```bash
npm run test-email
# hoặc: node test-email.js
```

#### 3. Tách file Excel:
```bash
node split-orders.js
```

## 📊 Cấu trúc Email

Email sẽ bao gồm:
- **Header**: Logo/tên công ty
- **Thông tin khách hàng**: Tên, SĐT, Email
- **Chi tiết đơn hàng**: 
  - Sản phẩm (màu sắc, size)
  - Số lượng
  - Địa chỉ nhận hàng
  - Thời gian nhận
  - Mã giao dịch
  - Trạng thái thanh toán
- **Lưu ý**: Thời gian xử lý, liên hệ hỗ trợ
- **Footer**: Thông tin công ty

## 🎨 Tùy chỉnh Template Email

Chỉnh sửa file `email-template.js` để thay đổi:
- Nội dung email
- Màu sắc, font chữ
- Logo, thông tin công ty
- Các trường dữ liệu hiển thị

## ⚠️ Lưu ý

1. **Test trước khi gửi hàng loạt**: Thử gửi đến email của bạn trước
2. **Giới hạn gửi**: 
   - Gmail: ~500 email/ngày
   - Outlook: ~300 email/ngày
   - Yahoo: ~500 email/ngày
3. **Delay giữa email**: Script tự động delay 1s giữa mỗi email
4. **Spam filter**: Nội dung email nên chuyên nghiệp để tránh bị đánh dấu spam

## 🔧 Xử lý lỗi thường gặp

### "Invalid login"
- Kiểm tra username/password trong `.env`
- Với Gmail: Đảm bảo dùng App Password, không phải mật khẩu thường

### "Connection timeout"
- Kiểm tra kết nối internet
- Kiểm tra firewall/antivirus
- Thử port khác (465 thay vì 587)

### "Too many recipients"
- Đã vượt quá giới hạn gửi email
- Đợi 24h hoặc chia nhỏ danh sách

## 📝 File Structure

```
├── test.xlsx              # File dữ liệu đầu vào
├── split-orders.js        # Script tách file Excel
├── send-emails.js         # Script gửi email
├── email-template.js      # Template nội dung email
├── .env                   # Cấu hình SMTP (không commit)
├── .env.example           # Mẫu cấu hình
├── package.json           # Dependencies
└── README.md             # Hướng dẫn này
```

## 💡 Tips

- Test với 1-2 email trước khi gửi hàng loạt
- Backup file Excel trước khi chạy
- Kiểm tra spam folder nếu không thấy email
- Tùy chỉnh subject line để tăng tỷ lệ mở email
