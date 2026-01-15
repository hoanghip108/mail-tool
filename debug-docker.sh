#!/bin/bash

# Debug script for Docker deployment

echo "🔍 Docker Debug Information"
echo "======================================"
echo ""

# Check if container is running
echo "1. Container Status:"
docker-compose ps
echo ""

# Check uploads directory in container
echo "2. Files in /app/uploads (container):"
docker-compose exec email-api ls -la /app/uploads/
echo ""

# Check __dirname in container
echo "3. Node.js __dirname:"
docker-compose exec email-api node -e "console.log('__dirname:', __dirname); console.log('process.cwd():', process.cwd());"
echo ""

# Test file path construction
echo "4. Test path construction:"
docker-compose exec email-api node -e "
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
console.log('uploadsDir:', uploadsDir);
console.log('Exists:', require('fs').existsSync(uploadsDir));
"
echo ""

# List environment variables
echo "5. Environment:"
docker-compose exec email-api env | grep -E '(NODE_ENV|PORT|HOST)'
echo ""

# Check volumes
echo "6. Docker volumes:"
docker-compose exec email-api df -h | grep uploads
echo ""

# Check recent logs
echo "7. Recent logs:"
docker-compose logs --tail=20 email-api
echo ""

echo "======================================"
echo "✨ Debug info collected!"
