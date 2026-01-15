#!/bin/bash

# Test script for async email sending

API_URL="${API_URL:-http://localhost:3000}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================"
echo "Test Async Email Sending"
echo "======================================"
echo ""

# 1. Check server
echo -e "${BLUE}1. Checking server...${NC}"
HEALTH=$(curl -s ${API_URL}/)
if echo "$HEALTH" | grep -q "OK"; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running${NC}"
    exit 1
fi
echo ""

# 2. List files
echo -e "${BLUE}2. Getting uploaded files...${NC}"
FILES=$(curl -s ${API_URL}/api/files)
FILE_COUNT=$(echo "$FILES" | jq -r '.count')

if [ "$FILE_COUNT" -eq 0 ]; then
    echo -e "${RED}No files found. Upload a file first!${NC}"
    exit 1
fi

FILENAME=$(echo "$FILES" | jq -r '.files[0].filename')
echo -e "Using file: ${GREEN}${FILENAME}${NC}"
echo ""

# 3. Start async job
echo -e "${BLUE}3. Starting async email job...${NC}"
JOB_RESPONSE=$(curl -s -X POST ${API_URL}/api/send-emails-async/${FILENAME})

if ! echo "$JOB_RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${RED}Failed to create job${NC}"
    echo "$JOB_RESPONSE" | jq '.'
    exit 1
fi

JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.job.id')
TOTAL_EMAILS=$(echo "$JOB_RESPONSE" | jq -r '.job.totalEmails')
ESTIMATED_TIME=$(echo "$JOB_RESPONSE" | jq -r '.job.estimatedTime')

echo -e "${GREEN}✓ Job created${NC}"
echo "  Job ID: $JOB_ID"
echo "  Total emails: $TOTAL_EMAILS"
echo "  Estimated time: $ESTIMATED_TIME"
echo ""

# 4. Poll job status
echo -e "${BLUE}4. Monitoring progress...${NC}"
echo ""

POLL_COUNT=0
MAX_POLLS=120  # 10 minutes max

while true; do
    STATUS_RESPONSE=$(curl -s ${API_URL}/api/job-status/${JOB_ID})
    
    if ! echo "$STATUS_RESPONSE" | jq -e '.success' > /dev/null; then
        echo -e "${RED}Error getting job status${NC}"
        echo "$STATUS_RESPONSE" | jq '.'
        exit 1
    fi
    
    JOB_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.job.status')
    PERCENTAGE=$(echo "$STATUS_RESPONSE" | jq -r '.job.progress.percentage')
    CURRENT=$(echo "$STATUS_RESPONSE" | jq -r '.job.progress.current')
    SENT=$(echo "$STATUS_RESPONSE" | jq -r '.job.progress.sent')
    FAILED=$(echo "$STATUS_RESPONSE" | jq -r '.job.progress.failed')
    
    # Create progress bar
    BAR_LENGTH=40
    FILLED=$((PERCENTAGE * BAR_LENGTH / 100))
    EMPTY=$((BAR_LENGTH - FILLED))
    BAR=$(printf "%${FILLED}s" | tr ' ' '█')
    BAR="${BAR}$(printf "%${EMPTY}s" | tr ' ' '░')"
    
    # Print status
    printf "\r${YELLOW}[%s]${NC} %3d%% | %d/%d | ✓ %d | ✗ %d | Status: %-12s" \
        "$BAR" "$PERCENTAGE" "$CURRENT" "$TOTAL_EMAILS" "$SENT" "$FAILED" "$JOB_STATUS"
    
    # Check if completed
    if [ "$JOB_STATUS" = "completed" ]; then
        echo ""
        echo ""
        echo -e "${GREEN}✓ Job completed!${NC}"
        
        DURATION=$(echo "$STATUS_RESPONSE" | jq -r '.job.duration')
        echo "  Duration: $DURATION"
        echo "  Total: $TOTAL_EMAILS"
        echo "  Success: $SENT"
        echo "  Failed: $FAILED"
        
        if [ "$FAILED" -gt 0 ]; then
            echo ""
            echo -e "${YELLOW}Sample failed emails:${NC}"
            echo "$STATUS_RESPONSE" | jq -r '.job.results[] | select(.status == "failed") | "  - \(.email): \(.error)"' | head -5
        fi
        
        break
    fi
    
    if [ "$JOB_STATUS" = "failed" ]; then
        echo ""
        echo ""
        echo -e "${RED}✗ Job failed!${NC}"
        ERROR=$(echo "$STATUS_RESPONSE" | jq -r '.job.error')
        echo "  Error: $ERROR"
        break
    fi
    
    POLL_COUNT=$((POLL_COUNT + 1))
    if [ $POLL_COUNT -ge $MAX_POLLS ]; then
        echo ""
        echo ""
        echo -e "${RED}✗ Timeout waiting for job${NC}"
        exit 1
    fi
    
    sleep 3  # Poll every 3 seconds
done

echo ""
echo ""

# 5. List all jobs
echo -e "${BLUE}5. Recent jobs:${NC}"
JOBS=$(curl -s ${API_URL}/api/jobs)
echo "$JOBS" | jq -r '.jobs[] | "\(.id) - \(.status) - \(.progress.percentage)% - \(.filename)"' | head -5

echo ""
echo "======================================"
echo -e "${GREEN}Test completed!${NC}"
echo "======================================"
echo ""
echo "Full job details:"
echo "  GET ${API_URL}/api/job-status/${JOB_ID}"
echo ""
echo "View logs:"
echo "  docker logs -f email-automation-api | grep '\\[JOB\\]'"
