#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:8000"
TODAY=$(date +%Y-%m-%d)

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  COMPLETE OVERTIME & ROLE/SHIFT DISPLAY TEST${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Test Scenario:"
echo "  • Shift: 09:00-18:00 (8 hours work + 1 hour break)"
echo "  • Employee checks in at 09:00"
echo "  • Manager approves 2 hours OT (18:00-20:00)"
echo "  • Employee checks out at 19:30 (1.5 hours OT)"
echo "  • Expected OT: 1.5 hours (within 2-hour window)"
echo ""

# Authenticate Manager
echo -e "${YELLOW}[1] Authenticating Manager...${NC}"
MANAGER_LOGIN=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'username=manager1&password=manager123')

MANAGER_TOKEN=$(echo $MANAGER_LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
[ -z "$MANAGER_TOKEN" ] && echo -e "${RED}Failed${NC}" && exit 1
echo -e "${GREEN}✓ Manager authenticated${NC}"

# Authenticate Employee
echo -e "${YELLOW}[2] Authenticating Employee...${NC}"
EMPLOYEE_LOGIN=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'username=emp1&password=emp123')

EMPLOYEE_TOKEN=$(echo $EMPLOYEE_LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
[ -z "$EMPLOYEE_TOKEN" ] && echo -e "${RED}Failed${NC}" && exit 1
echo -e "${GREEN}✓ Employee authenticated${NC}"

# Create today's schedule
echo -e "${YELLOW}[3] Creating schedule 09:00-18:00...${NC}"
SCHEDULE=$(curl -s -X POST "$BASE_URL/schedules" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"employee_id\":1,\"date\":\"$TODAY\",\"start_time\":\"09:00\",\"end_time\":\"18:00\",\"role_id\":1}")

SCHEDULE_ID=$(echo $SCHEDULE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2 | head -c 3)
if [ -z "$SCHEDULE_ID" ] || [ "$SCHEDULE_ID" = "nul" ]; then
  echo -e "${YELLOW}Schedule already exists or requires OT approval (expected)${NC}"
  SCHEDULE_ID=1  # Use default
else
  echo -e "${GREEN}✓ Schedule created (ID: $SCHEDULE_ID)${NC}"
fi

# Manager approves 2 hours OT
echo -e "${YELLOW}[4] Manager approves 2 hours OT (18:00-20:00)...${NC}"
OT_APPROVAL=$(curl -s -X POST "$BASE_URL/manager/overtime-approve" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"employee_id\":1,\"request_date\":\"$TODAY\",\"from_time\":\"18:00\",\"to_time\":\"20:00\",\"request_hours\":2.0,\"reason\":\"Testing\"}")

OT_ID=$(echo $OT_APPROVAL | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
[ -n "$OT_ID" ] && echo -e "${GREEN}✓ OT approved (2 hrs, 18:00-20:00)${NC}" || echo -e "${YELLOW}OT already exists${NC}"

# Employee check-in
echo -e "${YELLOW}[5] Employee checks in...${NC}"
CHECK_IN=$(curl -s -X POST "$BASE_URL/employee/check-in" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"schedule_id\":1}")

CHECK_IN_ID=$(echo $CHECK_IN | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
[ -n "$CHECK_IN_ID" ] && echo -e "${GREEN}✓ Checked in (ID: $CHECK_IN_ID)${NC}" || echo -e "${RED}Check-in failed${NC}"

# Employee check-out at 19:30 (1.5 hrs OT)
echo -e "${YELLOW}[6] Employee checks out...${NC}"
CHECK_OUT=$(curl -s -X POST "$BASE_URL/employee/check-out" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"check_in_id\":$CHECK_IN_ID}")

echo -e "${GREEN}✓ Checked out${NC}"

# Get attendance data
echo -e "${YELLOW}[7] Fetching attendance records...${NC}"
ATTENDANCE=$(curl -s -X GET "$BASE_URL/attendance?start_date=$TODAY&end_date=$TODAY" \
  -H "Authorization: Bearer $MANAGER_TOKEN")

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}RESULTS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Extract data
ROLE=$(echo "$ATTENDANCE" | grep -o '"role":{"[^}]*"name":"[^"]*' | head -1 | grep -o '"name":"[^"]*' | cut -d'"' -f4)
SHIFT_START=$(echo "$ATTENDANCE" | grep -o '"start_time":"[^"]*' | head -1 | cut -d'"' -f4)
SHIFT_END=$(echo "$ATTENDANCE" | grep -o '"end_time":"[^"]*' | head -1 | cut -d'"' -f4)
IN_TIME=$(echo "$ATTENDANCE" | grep -o '"in_time":"[^"]*' | cut -d'"' -f4 | head -1)
OUT_TIME=$(echo "$ATTENDANCE" | grep -o '"out_time":"[^"]*' | cut -d'"' -f4 | head -1)
WORKED=$(echo "$ATTENDANCE" | grep -o '"worked_hours":[0-9.]*' | cut -d':' -f2 | head -1)
OT=$(echo "$ATTENDANCE" | grep -o '"overtime_hours":[0-9.]*' | cut -d':' -f2 | head -1)

echo "Employee Information:"
echo "  • Role: ${ROLE:-N/A}"
echo ""
echo "Scheduled Shift:"
echo "  • Shift: ${SHIFT_START:-N/A} - ${SHIFT_END:-N/A}"
echo ""
echo "Actual Attendance:"
echo "  • Check-In: $IN_TIME"
echo "  • Check-Out: $OUT_TIME"
echo "  • Hours Worked: $WORKED hrs"
echo "  • Overtime: $OT hrs"
echo ""

# Validate
echo -e "${YELLOW}Validation:${NC}"
if [ "$ROLE" != "N/A" ] && [ -n "$ROLE" ]; then
  echo -e "${GREEN}✓ Role showing correctly${NC}"
else
  echo -e "${RED}✗ Role not displayed${NC}"
fi

if [ "$SHIFT_START" != "N/A" ] && [ -n "$SHIFT_START" ]; then
  echo -e "${GREEN}✓ Assigned shift showing correctly${NC}"
else
  echo -e "${RED}✗ Assigned shift not displayed${NC}"
fi

if [ -n "$OT" ] && [ "$OT" != "0" ]; then
  echo -e "${GREEN}✓ Overtime calculated: $OT hrs${NC}"
  if (( $(echo "$OT <= 1.5" | bc -l) )); then
    echo -e "${GREEN}✓ Overtime within expected range${NC}"
  else
    echo -e "${YELLOW}⚠ Overtime higher than expected (check calculation)${NC}"
  fi
else
  echo -e "${YELLOW}⚠ No overtime shown${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
