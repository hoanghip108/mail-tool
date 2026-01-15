# 🐳 Docker Deployment Guide

Hướng dẫn chạy ứng dụng với Docker và Docker Compose.

## 📋 Yêu cầu

- Docker Desktop hoặc Docker Engine
- Docker Compose v3.8+

**Cài đặt Docker:**
- **Mac/Windows**: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: 
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  ```

## 🚀 Quick Start

### 1. Tạo file `.env`

```bash
cp config-example.txt .env
# Sau đó chỉnh sửa .env với thông tin SMTP của bạn
```

File `.env`:
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

### 2. Build và chạy

```bash
# Build và start services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Truy cập

- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api-docs`

## 📦 Docker Commands

### Build & Run

```bash
# Build image
docker-compose build

# Start services (detached mode)
docker-compose up -d

# Start và xem logs real-time
docker-compose up

# Rebuild và start
docker-compose up -d --build
```

### Management

```bash
# Xem status
docker-compose ps

# Xem logs
docker-compose logs
docker-compose logs -f          # Follow logs
docker-compose logs -f email-api # Logs của 1 service

# Restart services
docker-compose restart

# Stop services
docker-compose stop

# Stop và remove containers
docker-compose down

# Stop, remove containers và volumes
docker-compose down -v
```

### Debugging

```bash
# Access container shell
docker-compose exec email-api sh

# Check container health
docker-compose ps
docker inspect email-automation-api

# View container logs
docker logs email-automation-api
docker logs -f email-automation-api
```

## 🔧 Configuration

### Environment Variables

Thêm vào `docker-compose.yml`:

```yaml
services:
  email-api:
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
```

### Custom Port

Đổi port trong `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Host:Container
```

### Volume Mounts

Uploads được lưu ở `./uploads` trên host machine:

```yaml
volumes:
  - ./uploads:/app/uploads
```

## 🌐 Deploy to Production

### 1. Với Ngrok (Testing)

```bash
# Start services
docker-compose up -d

# Install ngrok
brew install ngrok  # Mac
# hoặc tải từ https://ngrok.com/download

# Expose port
ngrok http 3000
```

### 2. Với VPS (Production)

**Deploy lên server:**

```bash
# 1. Copy files lên server
scp -r . user@your-server:/opt/email-api

# 2. SSH vào server
ssh user@your-server

# 3. Navigate to app directory
cd /opt/email-api

# 4. Start services
docker-compose up -d
```

**Setup reverse proxy (Nginx):**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3. Với Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag image
docker tag email-automation-api:latest yourusername/email-api:latest

# Push to Docker Hub
docker push yourusername/email-api:latest

# Pull và run trên server khác
docker pull yourusername/email-api:latest
docker run -d -p 3000:3000 --env-file .env yourusername/email-api:latest
```

## 📊 Monitoring

### Health Check

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' email-automation-api

# API health endpoint
curl http://localhost:3000/
```

### Logs

```bash
# View logs
docker-compose logs -f --tail=100

# Export logs
docker-compose logs > app.log
```

### Resource Usage

```bash
# View resource usage
docker stats email-automation-api

# Detailed inspect
docker inspect email-automation-api
```

## 🔐 Security Best Practices

1. **Không commit `.env` file**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use secrets trong production**
   ```yaml
   services:
     email-api:
       secrets:
         - smtp_password
   
   secrets:
     smtp_password:
       file: ./secrets/smtp_pass.txt
   ```

3. **Limit container resources**
   ```yaml
   services:
     email-api:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 512M
   ```

4. **Run as non-root user**
   Thêm vào Dockerfile:
   ```dockerfile
   USER node
   ```

## 🐛 Troubleshooting

### Container không start

```bash
# Check logs
docker-compose logs email-api

# Check if port is in use
lsof -i :3000

# Rebuild without cache
docker-compose build --no-cache
```

### SMTP connection fails

```bash
# Test SMTP inside container
docker-compose exec email-api sh
node test-email.js
```

### File upload fails

```bash
# Check uploads directory permissions
ls -la uploads/

# Fix permissions
chmod 755 uploads/
```

### Out of disk space

```bash
# Clean up unused images
docker system prune -a

# Remove stopped containers
docker container prune

# Remove unused volumes
docker volume prune
```

## 📝 Development vs Production

### Development (với hot reload)

```yaml
services:
  email-api:
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
```

### Production (optimized)

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["npm", "start"]
```

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker image
        run: docker build -t email-api .
      
      - name: Push to Docker Hub
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push email-api:latest
```

## 📚 Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## 💡 Quick Commands Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build

# Shell access
docker-compose exec email-api sh

# Health check
curl http://localhost:3000/
```
