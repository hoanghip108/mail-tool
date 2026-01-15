# 🚀 AWS Deployment Guide

Hướng dẫn deploy lên AWS và fix CORS issues.

## ✅ Current Setup

- **Domain**: https://phuphiem-api.site
- **Server**: AWS (EC2/ECS/Lambda?)
- **Protocol**: HTTPS
- **CORS**: Đã cấu hình

## 🔧 CORS Configuration

### Server Config (server.js)

CORS đã được cấu hình để hỗ trợ:
- ✅ HTTP/HTTPS
- ✅ Domain: `https://phuphiem-api.site`
- ✅ Localhost (development)
- ✅ Preflight caching (24h)
- ✅ HSTS header cho HTTPS

### Allowed Origins

Trong `server.js`:
```javascript
const allowedOrigins = [
    'http://localhost:3000',
    'https://phuphiem-api.site',
    'http://phuphiem-api.site',
];
```

## 🧪 Test CORS

### 1. Browser DevTools

```javascript
// Paste vào Console
fetch('https://phuphiem-api.site/', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
})
.then(res => res.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

### 2. cURL Test

```bash
# Test preflight
curl -X OPTIONS https://phuphiem-api.site/api/upload \
  -H "Origin: https://phuphiem-api.site" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v

# Test GET request
curl https://phuphiem-api.site/ \
  -H "Origin: https://phuphiem-api.site" \
  -v

# Test upload
curl -X POST https://phuphiem-api.site/api/upload \
  -H "Origin: https://phuphiem-api.site" \
  -F "file=@test.xlsx" \
  -v
```

### 3. Swagger UI

Truy cập: https://phuphiem-api.site/api-docs

- Select server: **"Production (AWS)"**
- Test các endpoints trực tiếp

## 🔍 Common AWS CORS Issues

### Issue 1: ALB/Load Balancer Strips Headers

**Symptom**: CORS headers bị mất khi qua Load Balancer

**Fix**: 
1. Check ALB Target Group settings
2. Ensure "Preserve Host Header" is enabled
3. Add CORS headers at ALB level (optional)

**ALB Rule (optional):**
```json
{
  "Type": "forward",
  "ResponseHeadersConfig": {
    "CustomHeadersConfig": {
      "Items": [
        {
          "Key": "Access-Control-Allow-Origin",
          "Value": "*"
        }
      ]
    }
  }
}
```

### Issue 2: CloudFront Caching OPTIONS

**Symptom**: OPTIONS response cached incorrectly

**Fix CloudFront Behavior:**
- Cache Policy: Managed-CachingDisabled for OPTIONS
- Origin Request Policy: Include all headers
- Add "OPTIONS" to allowed methods

### Issue 3: HTTPS → HTTP Backend

**Symptom**: Mixed content errors

**Fix**:
- Ensure backend accepts HTTPS
- Or use `x-forwarded-proto` header
- Update security group to allow 443

### Issue 4: API Gateway CORS

**Symptom**: API Gateway blocks CORS

**Fix**: Enable CORS in API Gateway Console
```bash
# AWS CLI
aws apigateway update-integration-response \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --patch-operations \
    op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Origin,value="'*'"
```

## 🛠️ Troubleshooting Steps

### Step 1: Check Server Response

```bash
curl -I https://phuphiem-api.site/
```

Look for:
```
access-control-allow-origin: *
access-control-allow-methods: GET, POST, ...
access-control-allow-headers: ...
```

### Step 2: Check Origin Header

Browser sends:
```
Origin: https://your-frontend.com
```

Server must respond:
```
Access-Control-Allow-Origin: https://your-frontend.com
```
or
```
Access-Control-Allow-Origin: *
```

### Step 3: Check Preflight

For complex requests (POST with JSON), browser sends OPTIONS first:

```bash
curl -X OPTIONS https://phuphiem-api.site/api/upload \
  -H "Origin: https://your-domain.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Should return `204 No Content` with CORS headers.

### Step 4: Check CloudWatch Logs

```bash
# AWS CLI
aws logs tail /aws/ec2/your-instance-id --follow

# Or in AWS Console
CloudWatch → Log Groups → Your app logs
```

Look for CORS errors or OPTIONS requests.

## 🔐 Security Considerations

### Production Whitelist

Instead of `*`, whitelist specific domains:

```javascript
const allowedOrigins = [
    'https://your-frontend.com',
    'https://www.your-frontend.com',
    'https://phuphiem-api.site',
];

const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
}
```

### Credentials

If using cookies/auth:
```javascript
res.setHeader("Access-Control-Allow-Credentials", "true");

// Frontend must use:
fetch(url, { credentials: 'include' })
```

**Note**: Cannot use `*` with credentials!

## 📝 Deployment Checklist

- [ ] Server running on `0.0.0.0` (not `localhost`)
- [ ] CORS middleware is first
- [ ] Handle OPTIONS method
- [ ] HTTPS configured correctly
- [ ] Security groups allow ports 80/443
- [ ] Domain points to correct IP/Load Balancer
- [ ] SSL certificate valid
- [ ] Test with cURL
- [ ] Test with browser
- [ ] Check logs for errors

## 🌐 Architecture Options

### Option 1: EC2 Direct
```
Browser → EC2 (Node.js with CORS)
```
- Simplest
- CORS handled by Node.js

### Option 2: ALB + EC2
```
Browser → ALB → EC2 (Node.js)
```
- ALB forwards headers
- Node.js handles CORS

### Option 3: CloudFront + ALB + EC2
```
Browser → CloudFront → ALB → EC2
```
- CloudFront must not strip headers
- May need CORS at multiple levels

### Option 4: API Gateway + Lambda
```
Browser → API Gateway → Lambda
```
- Enable CORS in API Gateway
- Lambda may need additional headers

## 🚀 Quick Fix Commands

### Restart Service
```bash
# If using Docker
docker-compose restart

# If using PM2
pm2 restart email-api

# If using systemd
sudo systemctl restart your-service
```

### Check Logs
```bash
# Docker
docker-compose logs -f

# PM2
pm2 logs

# System logs
sudo journalctl -u your-service -f
```

### Test CORS Headers
```bash
curl -I https://phuphiem-api.site/ | grep -i access-control
```

## 📞 Still Having Issues?

1. **Check exact error message** in browser console
2. **Share cURL output**: `curl -v https://phuphiem-api.site/`
3. **Check network tab** in DevTools
4. **Verify server is actually receiving requests**
5. **Check AWS security groups** allow traffic

## 🔗 Useful Links

- [AWS ALB CORS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html)
- [CloudFront CORS](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html#header-caching-web-cors)
- [API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)

## 💡 Contact

Domain: https://phuphiem-api.site
API Docs: https://phuphiem-api.site/api-docs
