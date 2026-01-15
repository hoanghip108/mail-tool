#!/bin/bash

echo "🧪 Testing Docker Container"
echo "======================================"
echo ""

# Check if container is running
echo "1. Container Status:"
docker-compose ps email-api
echo ""

# Check logs (last 50 lines)
echo "2. Recent Logs:"
docker-compose logs --tail=50 email-api
echo ""

# Test if server responds
echo "3. Health Check:"
if command -v curl &> /dev/null; then
    curl -s http://localhost:3000/ | jq '.' 2>/dev/null || curl -s http://localhost:3000/
else
    echo "curl not found, skip"
fi
echo ""

# Check files in container
echo "4. Files in Container:"
docker-compose exec email-api ls -la /app/uploads/ 2>/dev/null || echo "Cannot access container"
echo ""

# Test logging in container
echo "5. Test Logging:"
docker-compose exec email-api node -e "console.log('[TEST] Node.js console.log works!');" 2>/dev/null
echo ""

# Check environment
echo "6. Environment Variables:"
docker-compose exec email-api env | grep -E '(NODE_ENV|PORT|HOST)' 2>/dev/null || echo "Cannot access container"
echo ""

# Follow logs (Ctrl+C to stop)
echo "7. Following logs (press Ctrl+C to stop):"
echo "   Waiting for requests..."
docker-compose logs -f email-api
