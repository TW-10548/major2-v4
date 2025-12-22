#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:8000"
TODAY=$(date +%Y-%m-%d)

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ATTENDANCE DATA VERIFICATION TEST${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Authenticate Manager
echo -e "${YELLOW}Step 1: Authenticating Manager...${NC}"
MANAGER_LOGIN=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'username=manager1&password=manager123')

MANAGER_TOKEN=$(echo $MANAGER_LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -z "$MANAGER_TOKEN" ]; then
  echo -e "${RED}❌ Failed to authenticate manager${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Manager authenticated${NC}"

# Step 2: Get today's attendance
echo -e "\n${YELLOW}Step 2: Fetching Today's Attendance Data...${NC}"
ATTENDANCE=$(curl -s -X GET "$BASE_URL/attendance?start_date=$TODAY&end_date=$TODAY" \
  -H "Authorization: Bearer $MANAGER_TOKEN")

# Check if we got data
if echo "$ATTENDANCE" | grep -q '"id":'; then
  echo -e "${GREEN}✅ Attendance data retrieved${NC}"
else
  echo -e "${YELLOW}⚠️  No attendance records for today${NC}"
  echo "Response: $ATTENDANCE"
  exit 0
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}ATTENDANCE TABLE STRUCTURE VERIFICATION${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if role data exists
if echo "$ATTENDANCE" | grep -q '"role"'; then
  echo -e "${GREEN}✅ Role field present in response${NC}"
  ROLE_NAME=$(echo "$ATTENDANCE" | grep -o '"role":{"[^}]*"name":"[^"]*' | head -1 | grep -o '"name":"[^"]*' | cut -d'"' -f4)
  if [ -n "$ROLE_NAME" ]; then
    echo -e "   Role value: $ROLE_NAME"
  else
    echo -e "${RED}   ⚠️  Role field empty or malformed${NC}"
  fi
else
  echo -e "${RED}❌ Role field MISSING from response${NC}"
fi

# Check if schedule data exists
if echo "$ATTENDANCE" | grep -q '"schedule"'; then
  echo -e "${GREEN}✅ Schedule field present in response${NC}"
  SHIFT_START=$(echo "$ATTENDANCE" | grep -o '"start_time":"[^"]*' | head -1 | cut -d'"' -f4)
  SHIFT_END=$(echo "$ATTENDANCE" | grep -o '"end_time":"[^"]*' | head -1 | cut -d'"' -f4)
  if [ -n "$SHIFT_START" ] && [ -n "$SHIFT_END" ]; then
    echo -e "   Shift: $SHIFT_START - $SHIFT_END"
  else
    echo -e "${RED}   ⚠️  Shift times empty or malformed${NC}"
  fi
else
  echo -e "${RED}❌ Schedule field MISSING from response${NC}"
fi

# Check attendance fields
echo ""
echo -e "${YELLOW}Other Attendance Fields:${NC}"
IN_TIME=$(echo "$ATTENDANCE" | grep -o '"in_time":"[^"]*' | cut -d'"' -f4)
OUT_TIME=$(echo "$ATTENDANCE" | grep -o '"out_time":"[^"]*' | cut -d'"' -f4)
WORKED_HOURS=$(echo "$ATTENDANCE" | grep -o '"worked_hours":[0-9.]*' | cut -d':' -f2)
OT_HOURS=$(echo "$ATTENDANCE" | grep -o '"overtime_hours":[0-9.]*' | cut -d':' -f2)
BREAK_MIN=$(echo "$ATTENDANCE" | grep -o '"break_minutes":[0-9]*' | cut -d':' -f2)

echo "  • Check-In: $IN_TIME"
echo "  • Check-Out: $OUT_TIME"
echo "  • Hours Worked: $WORKED_HOURS hrs"
echo "  • Break Time: $BREAK_MIN min"
echo "  • Overtime Hours: $OT_HOURS hrs"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}RAW JSON RESPONSE (first 1000 chars)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "$ATTENDANCE" | head -c 1000
echo ""
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}VERIFICATION COMPLETE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
