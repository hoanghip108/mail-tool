#!/bin/bash

# Script test API

echo "🧪 Testing Email API Server"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3000"

# 1. Health check
echo -e "${BLUE}1. Health Check${NC}"
curl -s $BASE_URL | jq '.'
echo ""
echo ""

# 2. Upload file
echo -e "${BLUE}2. Upload File${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST $BASE_URL/api/upload -F "file=@test.xlsx")
echo $UPLOAD_RESPONSE | jq '.'

# Extract filename
FILENAME=$(echo $UPLOAD_RESPONSE | jq -r '.file.filename')
echo ""
echo -e "${GREEN}✓ Uploaded filename: $FILENAME${NC}"
echo ""
echo ""

# 3. Preview data
echo -e "${BLUE}3. Preview Data${NC}"
curl -s $BASE_URL/api/preview/$FILENAME | jq '.data | {totalEmails, sampleRecipients: .recipients[0:3]}'
echo ""
echo ""

# 4. List files
echo -e "${BLUE}4. List Files${NC}"
curl -s $BASE_URL/api/files | jq '.'
echo ""
echo ""

# Ask before sending emails
echo -e "${BLUE}5. Send Emails${NC}"
read -p "⚠️  Bạn có muốn gửi email thật không? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    curl -s -X POST $BASE_URL/api/send-emails/$FILENAME | jq '.'
else
    echo "Đã bỏ qua gửi email"
fi
echo ""
echo ""

# 6. Clean up
echo -e "${BLUE}6. Cleanup${NC}"
read -p "Bạn có muốn xóa file test không? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    curl -s -X DELETE $BASE_URL/api/files/$FILENAME | jq '.'
    echo ""
    echo -e "${GREEN}✓ Đã xóa file${NC}"
else
    echo "Giữ file: $FILENAME"
fi

echo ""
echo "=============================="
echo "✨ Test hoàn tất!"
