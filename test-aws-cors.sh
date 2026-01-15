#!/bin/bash

# Test CORS for AWS deployment
# Domain: https://phuphiem-api.site

DOMAIN="https://phuphiem-api.site"

echo "🧪 Testing CORS for $DOMAIN"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}1. Health Check${NC}"
curl -s $DOMAIN | jq '.' 2>/dev/null || curl -s $DOMAIN
echo ""
echo ""

# Test 2: CORS Headers (GET)
echo -e "${BLUE}2. CORS Headers (GET /)${NC}"
echo "Request headers:"
echo "  Origin: $DOMAIN"
echo ""
echo "Response headers:"
curl -s -I $DOMAIN \
  -H "Origin: $DOMAIN" | grep -i "access-control" || echo -e "${RED}❌ No CORS headers found${NC}"
echo ""
echo ""

# Test 3: Preflight Request (OPTIONS)
echo -e "${BLUE}3. Preflight Request (OPTIONS /api/upload)${NC}"
echo "Simulating browser preflight..."
curl -s -i -X OPTIONS $DOMAIN/api/upload \
  -H "Origin: $DOMAIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" | head -20
echo ""
echo ""

# Test 4: List Files
echo -e "${BLUE}4. Test Endpoint (GET /api/files)${NC}"
curl -s $DOMAIN/api/files \
  -H "Origin: $DOMAIN" | jq '.' 2>/dev/null || curl -s $DOMAIN/api/files -H "Origin: $DOMAIN"
echo ""
echo ""

# Test 5: Full CORS Test
echo -e "${BLUE}5. Full CORS Headers Check${NC}"
echo "All CORS-related headers:"
curl -s -I $DOMAIN \
  -H "Origin: $DOMAIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" | grep -i "access-control"

echo ""
echo "======================================"
echo "✨ Test completed!"
echo ""
echo "📝 If you see CORS headers above, CORS is working!"
echo "📝 If not, check AWS_DEPLOY.md for troubleshooting"
