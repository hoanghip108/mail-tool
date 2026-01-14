# 📚 Swagger Documentation

API documentation được tạo tự động bằng Swagger UI.

## 🌐 Truy cập Swagger UI

Sau khi start server, mở trình duyệt và truy cập:

```
http://localhost:3000/api-docs
```

## ✨ Tính năng

Swagger UI cung cấp:

- ✅ **Interactive API Documentation** - Xem chi tiết tất cả endpoints
- ✅ **Try it out** - Test API trực tiếp từ trình duyệt
- ✅ **Request/Response Examples** - Ví dụ về request và response
- ✅ **Schema Documentation** - Chi tiết về data models
- ✅ **Error Codes** - Danh sách mã lỗi và ý nghĩa

## 📖 Sử dụng Swagger UI

### 1. Xem danh sách API

Tất cả endpoints được nhóm theo tags:
- **Health** - Health check
- **Files** - Upload và quản lý file
- **Email** - Gửi email

### 2. Test API trực tiếp

1. Click vào endpoint muốn test
2. Click nút **"Try it out"**
3. Điền parameters/body
4. Click **"Execute"**
5. Xem kết quả response

### 3. Upload File qua Swagger

1. Mở endpoint `POST /api/upload`
2. Click **"Try it out"**
3. Click **"Choose File"**
4. Chọn file .xlsx
5. Click **"Execute"**
6. Copy `filename` từ response để dùng cho các API khác

### 4. Gửi Email

1. Đã upload file và có `filename`
2. Mở endpoint `POST /api/send-emails/{filename}`
3. Click **"Try it out"**
4. Paste `filename` vào parameter
5. Click **"Execute"**
6. Xem progress và kết quả

## 🔧 Customization

### Thay đổi thông tin API

Chỉnh sửa file `swagger.js`:

```javascript
info: {
    title: "Email Automation API",
    version: "1.0.0",
    description: "API để upload file Excel và gửi email tự động",
    contact: {
        name: "Your Name",
        email: "your-email@example.com",
    },
}
```

### Thêm endpoint mới

Thêm JSDoc comment vào endpoint trong `server.js`:

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     tags: [YourTag]
 *     summary: Your summary
 *     description: Your description
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/api/your-endpoint", (req, res) => {
    // Your code
});
```

### Thêm tag mới

Trong `swagger.js`:

```javascript
tags: [
    {
        name: "Your Tag",
        description: "Your tag description",
    },
]
```

## 📝 Export API Documentation

### Export OpenAPI Spec

Truy cập:
```
http://localhost:3000/api-docs.json
```

Lưu file JSON này để:
- Import vào Postman
- Generate client code
- Share với team

### Generate Client Code

Sử dụng OpenAPI Generator:

```bash
# Install
npm install -g @openapitools/openapi-generator-cli

# Generate JavaScript client
openapi-generator-cli generate \
  -i http://localhost:3000/api-docs.json \
  -g javascript \
  -o ./client

# Generate Python client
openapi-generator-cli generate \
  -i http://localhost:3000/api-docs.json \
  -g python \
  -o ./client-python
```

## 🎯 Best Practices

1. **Luôn cập nhật documentation** khi thêm/sửa API
2. **Thêm examples** cho mọi endpoint
3. **Document error cases** rõ ràng
4. **Sử dụng descriptions** chi tiết
5. **Group endpoints** theo tags hợp lý

## 🔗 Tài liệu tham khảo

- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express)

## 💡 Tips

### Test nhanh với cURL

Copy cURL command từ Swagger UI:
1. Click "Try it out" → "Execute"
2. Scroll xuống phần "Curl"
3. Copy và chạy trong terminal

### Import vào Postman

1. Export OpenAPI spec: `http://localhost:3000/api-docs.json`
2. Mở Postman → Import → File
3. Chọn file JSON vừa tải
4. Tất cả API sẽ được import tự động

### Share với team

Send link Swagger UI cho team:
```
http://your-domain:3000/api-docs
```

Hoặc share file OpenAPI JSON để họ import vào tool của mình.

---

## ⚠️ Lưu ý

- Swagger UI chỉ nên enable trong môi trường dev/staging
- Production nên tắt hoặc protect bằng authentication
- File upload qua Swagger có giới hạn size
- Một số API có thể mất nhiều thời gian (gửi email hàng loạt)
