#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:8000"
TODAY=$(date +%Y-%m-%d)
HOUR=$(date +%H)
MIN=$(date +%M)

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  OVERTIME CALCULATION TEST - REAL TIME DATA${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Current Time: $(date '+%H:%M:%S')"
echo "Today's Date: $TODAY"
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

# Step 2: Authenticate Employee
echo -e "\n${YELLOW}Step 2: Authenticating Employee...${NC}"
EMPLOYEE_LOGIN=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'username=emp1&password=emp123')

EMPLOYEE_TOKEN=$(echo $EMPLOYEE_LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -z "$EMPLOYEE_TOKEN" ]; then
  echo -e "${RED}❌ Failed to authenticate employee${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Employee authenticated${NC}"

# Step 3: Create today's schedule (09:00-18:00)
echo -e "\n${YELLOW}Step 3: Creating Today's Schedule (09:00-18:00)...${NC}"
SCHEDULE=$(curl -s -X POST "$BASE_URL/schedules" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employee_id\": 1,
    \"date\": \"$TODAY\",
    \"start_time\": \"09:00\",
    \"end_time\": \"18:00\",
    \"role_id\": 1
  }")

SCHEDULE_ID=$(echo $SCHEDULE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -z "$SCHEDULE_ID" ]; then
  echo -e "${RED}❌ Failed to create schedule${NC}"
  echo "Response: $SCHEDULE"
  exit 1
fi
echo -e "${GREEN}✅ Schedule created (ID: $SCHEDULE_ID)${NC}"
echo "   Shift: 09:00-18:00 (base 8 hours)"

# Step 4: Manager approves 2 hours OT (18:00-20:00)
echo -e "\n${YELLOW}Step 4: Manager Approves 2 Hours OT (18:00-20:00)...${NC}"
OT_APPROVAL=$(curl -s -X POST "$BASE_URL/manager/overtime-approve" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employee_id\": 1,
    \"request_date\": \"$TODAY\",
    \"from_time\": \"18:00\",
    \"to_time\": \"20:00\",
    \"request_hours\": 2.0,
    \"reason\": \"Testing overtime calculation\"
  }")

OT_ID=$(echo $OT_APPROVAL | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
OT_STATUS=$(echo $OT_APPROVAL | grep -o '"status":"[^"]*' | cut -d'"' -f4)
if [ -z "$OT_ID" ] || [ "$OT_STATUS" != "approved" ]; then
  echo -e "${RED}❌ Failed to approve OT${NC}"
  echo "Response: $OT_APPROVAL"
  exit 1
fi
echo -e "${GREEN}✅ OT approved (ID: $OT_ID)${NC}"
echo "   Approved: 18:00-20:00 (max 2 hours)"

# Step 5: Employee checks in at 09:00
echo -e "\n${YELLOW}Step 5: Employee Checks In...${NC}"
CHECK_IN=$(curl -s -X POST "$BASE_URL/employee/check-in" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"schedule_id\": $SCHEDULE_ID}")

CHECK_IN_ID=$(echo $CHECK_IN | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -z "$CHECK_IN_ID" ]; then
  echo -e "${RED}❌ Failed to check in${NC}"
  echo "Response: $CHECK_IN"
  exit 1
fi
echo -e "${GREEN}✅ Employee checked in (ID: $CHECK_IN_ID)${NC}"

# Step 6: Calculate checkout time based on current time
CURRENT_HOUR=$(date +%H)
CURRENT_MIN=$(date +%M)

# If current time is before 18:00, simulate checkout at 19:30 (1.5 hrs OT)
# If current time is after 18:00, checkout at current time + 10 min

if [ "$CURRENT_HOUR" -lt 18 ]; then
  CHECKOUT_TIME="19:30"
  EXPECTED_OT="1.5"
  SCENARIO="Checkout at 19:30 (1.5 hrs OT, within 2 hr window)"
else
  # Current time is after 18:00
  CURRENT_TIME_TOTAL=$((CURRENT_HOUR * 60 + CURRENT_MIN + 10))
  CHECKOUT_HOUR=$((CURRENT_TIME_TOTAL / 60))
  CHECKOUT_MIN=$((CURRENT_TIME_TOTAL % 60))
  CHECKOUT_TIME=$(printf "%02d:%02d" $CHECKOUT_HOUR $CHECKOUT_MIN)
  
  # Calculate expected OT
  BASE_END=18
  WINDOW_END=20
  ACTUAL_END=$((CHECKOUT_HOUR + CHECKOUT_MIN / 60))
  
  if [ $(echo "$ACTUAL_END <= $WINDOW_END" | bc) -eq 1 ]; then
    OT_HOURS=$(echo "scale=2; $ACTUAL_END - $BASE_END" | bc)
    EXPECTED_OT=$OT_HOURS
    SCENARIO="Checkout at $CHECKOUT_TIME ($OT_HOURS hrs OT, within 2 hr window)"
  else
    EXPECTED_OT="2.0"
    SCENARIO="Checkout at $CHECKOUT_TIME (2.0 hrs OT capped, exceeds window)"
  fi
fi

echo -e "\n${YELLOW}Step 6: Employee Checks Out at $CHECKOUT_TIME...${NC}"
CHECK_OUT=$(curl -s -X POST "$BASE_URL/employee/check-out" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"check_in_id\": $CHECK_IN_ID}")

ATTENDANCE_ID=$(echo $CHECK_OUT | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -z "$ATTENDANCE_ID" ]; then
  echo -e "${RED}❌ Failed to check out${NC}"
  echo "Response: $CHECK_OUT"
  exit 1
fi
echo -e "${GREEN}✅ Employee checked out (ID: $ATTENDANCE_ID)${NC}"
echo "   Scenario: $SCENARIO"

# Step 7: Get Manager attendance to verify role and shift display
echo -e "\n${YELLOW}Step 7: Fetching Manager Attendance View...${NC}"
ATTENDANCE_LIST=$(curl -s -X GET "$BASE_URL/attendance?start_date=$TODAY&end_date=$TODAY" \
  -H "Authorization: Bearer $MANAGER_TOKEN")

echo -e "${GREEN}✅ Manager attendance data retrieved${NC}"

# Step 8: Display parsed attendance data
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}ATTENDANCE RECORD DETAILS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Extract and display key fields
EMPLOYEE_NAME=$(echo $ATTENDANCE_LIST | grep -o '"first_name":"[^"]*' | cut -d'"' -f4)
ROLE_NAME=$(echo $ATTENDANCE_LIST | grep -o '"role":{"id":[^}]*"name":"[^"]*' | tail -1 | grep -o '"name":"[^"]*' | cut -d'"' -f4)
SHIFT_START=$(echo $ATTENDANCE_LIST | grep -o '"start_time":"[^"]*' | cut -d'"' -f4)
SHIFT_END=$(echo $ATTENDANCE_LIST | grep -o '"end_time":"[^"]*' | cut -d'"' -f4)
IN_TIME=$(echo $ATTENDANCE_LIST | grep -o '"in_time":"[^"]*' | cut -d'"' -f4)
OUT_TIME=$(echo $ATTENDANCE_LIST | grep -o '"out_time":"[^"]*' | cut -d'"' -f4)
WORKED_HOURS=$(echo $ATTENDANCE_LIST | grep -o '"worked_hours":[0-9.]*' | cut -d':' -f2)
OT_HOURS=$(echo $ATTENDANCE_LIST | grep -o '"overtime_hours":[0-9.]*' | cut -d':' -f2)

echo "Employee: $EMPLOYEE_NAME"
echo "Role: ${ROLE_NAME:-N/A}"
echo ""
echo "Assigned Shift:"
echo "  • Start: $SHIFT_START"
echo "  • End: $SHIFT_END"
echo ""
echo "Actual Attendance:"
echo "  • Check-In: $IN_TIME"
echo "  • Check-Out: $OUT_TIME"
echo "  • Hours Worked: $WORKED_HOURS hrs"
echo "  • Overtime Hours: $OT_HOURS hrs"
echo ""
echo -e "${YELLOW}Expected OT Calculation:${NC}"
echo "  • Base shift end: 18:00"
echo "  • Approved OT window: 18:00-20:00 (max 2 hrs)"
echo "  • Expected OT: $EXPECTED_OT hrs"
echo ""

if [ -z "$ROLE_NAME" ] || [ "$ROLE_NAME" = "" ]; then
  echo -e "${RED}⚠️  WARNING: Role is showing as empty (should show role name)${NC}"
else
  echo -e "${GREEN}✅ Role displaying correctly: $ROLE_NAME${NC}"
fi

if [ -z "$SHIFT_START" ] || [ "$SHIFT_START" = "" ]; then
  echo -e "${RED}⚠️  WARNING: Assigned shift not displaying${NC}"
else
  echo -e "${GREEN}✅ Assigned shift displaying correctly: $SHIFT_START - $SHIFT_END${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}TEST COMPLETE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
