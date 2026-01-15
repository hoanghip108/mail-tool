# 🔧 CORS Debugging Guide

Hướng dẫn debug và fix lỗi CORS.

## 🧪 Test CORS

### 1. Dùng HTML Test Tool

Mở file `test-cors.html` trong trình duyệt:

```bash
open test-cors.html
# hoặc kéo thả vào trình duyệt
```

Test các endpoint và xem CORS headers.

### 2. Dùng Browser DevTools

**Chrome/Edge:**
```
F12 → Network tab → Chọn request → Headers
```

Kiểm tra:
- **Request Headers**: `Origin`, `Access-Control-Request-Method`
- **Response Headers**: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`

### 3. Dùng cURL

```bash
# Test preflight (OPTIONS)
curl -X OPTIONS http://localhost:3000/api/upload \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v

# Test actual request
curl -X GET http://localhost:3000/ \
  -H "Origin: http://localhost:3000" \
  -v
```

## 🔍 Common Issues

### Issue 1: "No 'Access-Control-Allow-Origin' header"

**Nguyên nhân:**
- Server không set CORS headers
- CORS middleware chưa được load

**Fix:**
```javascript
// Đảm bảo CORS middleware là middleware đầu tiên
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    // ... other headers
    next();
});
```

### Issue 2: "Preflight request failed"

**Nguyên nhân:**
- Server không handle OPTIONS method
- OPTIONS request return error status

**Fix:**
```javascript
if (req.method === "OPTIONS") {
    return res.status(200).end();
}
```

### Issue 3: "Credentials flag is true but Access-Control-Allow-Credentials is not"

**Nguyên nhân:**
- Frontend gửi credentials nhưng server không cho phép

**Fix:**
```javascript
res.setHeader("Access-Control-Allow-Credentials", "true");
```

### Issue 4: Ngrok CORS Error

**Nguyên nhân:**
- Ngrok warning page chặn request

**Fix:**
```javascript
// Thêm header
res.setHeader(
    "Access-Control-Allow-Headers",
    "... ngrok-skip-browser-warning ..."
);

// Frontend thêm header
fetch(url, {
    headers: {
        'ngrok-skip-browser-warning': 'true'
    }
})
```

## ✅ Checklist

- [ ] CORS middleware là middleware đầu tiên
- [ ] Handle OPTIONS method
- [ ] Set `Access-Control-Allow-Origin`
- [ ] Set `Access-Control-Allow-Methods`
- [ ] Set `Access-Control-Allow-Headers`
- [ ] Set `Access-Control-Max-Age` (optional, for caching)
- [ ] Test với browser DevTools
- [ ] Test với cURL
- [ ] Test với HTML tool

## 🔧 Current CORS Config

File: `server.js`

```javascript
app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "...");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
    
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    
    next();
});
```

## 📝 Test Results Format

**Success:**
```
✅ Request successful
Status: 200
Headers: {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, ...",
  ...
}
```

**Error:**
```
❌ CORS Error
Error: Failed to fetch
Origin: http://localhost:3000
Blocked by CORS policy
```

## 🌐 Browser Specific Issues

### Chrome/Edge
- Strict CORS enforcement
- Check DevTools Console for detailed error

### Firefox
- More permissive
- May cache OPTIONS response

### Safari
- Most strict
- May require explicit credentials handling

## 🚀 Production Tips

1. **Whitelist specific origins:**
```javascript
const allowedOrigins = [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
];

const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
}
```

2. **Use CORS package:**
```javascript
const cors = require('cors');
app.use(cors({
    origin: true,
    credentials: true
}));
```

3. **Log CORS requests:**
```javascript
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
    next();
});
```

## 📞 Need Help?

1. Check browser console
2. Check server logs
3. Use test-cors.html tool
4. Test with cURL
5. Check if server is actually running on 0.0.0.0

## 🔗 Resources

- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [CORS NPM Package](https://www.npmjs.com/package/cors)
- [Chrome CORS Errors](https://developer.chrome.com/blog/cors-errors/)
