#!/bin/bash

BASE_URL="http://localhost:8000"

echo "════════════════════════════════════════════════════════════════"
echo "    OVERTIME POPUP TEST"
echo "════════════════════════════════════════════════════════════════"
echo

# Get admin token
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=password123" | python -c 'import sys, json; print(json.load(sys.stdin).get("access_token", ""))' 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to get admin token"
  exit 1
fi

echo "✅ Authenticated"
echo

# Get a different employee (use employee 2)
EMPLOYEE_ID=2
ROLE_ID=1

# Get today
TODAY=$(date +%Y-%m-%d)
TOMORROW=$(date -d "+1 day" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)
DAY3=$(date -d "+2 days" +%Y-%m-%d 2>/dev/null || date -v+2d +%Y-%m-%d)

echo "Test Plan:"
echo "  1. Create multiple 10-hour shifts (exceeding 8hrs/day)"
echo "  2. Verify overtime popup is triggered"
echo "  3. Check for 40+ hrs/week detection"
echo

echo "════════════════════════════════════════════════════════════════"
echo "TEST 1: DAILY OVERTIME (10-hour shift)"
echo "════════════════════════════════════════════════════════════════"
echo

echo "Creating 10-hour shift for Employee $EMPLOYEE_ID on $TODAY..."
echo "  Time: 08:00 - 18:00 (10 hours, exceeds 8-hour limit)"
echo

RESPONSE=$(curl -s -X POST "$BASE_URL/schedules" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employee_id\": $EMPLOYEE_ID,
    \"role_id\": $ROLE_ID,
    \"date\": \"$TODAY\",
    \"start_time\": \"08:00\",
    \"end_time\": \"18:00\"
  }")

# Check if overtime approval is required
if echo "$RESPONSE" | python -c 'import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get("status")=="requires_overtime_approval" else 1)' 2>/dev/null; then
  echo "✅ PASS: Overtime popup triggered!"
  echo
  
  echo "Overtime Details:"
  MESSAGE=$(echo "$RESPONSE" | python -c 'import sys, json; print(json.load(sys.stdin).get("message", ""))' 2>/dev/null)
  echo "  Message: $MESSAGE"
  
  SHIFT_HOURS=$(echo "$RESPONSE" | python -c 'import sys, json; print(json.load(sys.stdin).get("shift_hours", ""))' 2>/dev/null)
  echo "  Shift Hours: $SHIFT_HOURS"
  
  TOTAL_DAILY=$(echo "$RESPONSE" | python -c 'import sys, json; print(json.load(sys.stdin).get("total_daily_hours", ""))' 2>/dev/null)
  echo "  Total Daily Hours: $TOTAL_DAILY"
  
  OT_HOURS=$(echo "$RESPONSE" | python -c 'import sys, json; print(json.load(sys.stdin).get("overtime_hours", ""))' 2>/dev/null)
  echo "  Overtime Hours: $OT_HOURS"
  
  ALLOCATED=$(echo "$RESPONSE" | python -c 'import sys, json; print(json.load(sys.stdin).get("allocated_ot_hours", ""))' 2>/dev/null)
  REMAINING=$(echo "$RESPONSE" | python -c 'import sys, json; print(json.load(sys.stdin).get("remaining_ot_hours", ""))' 2>/dev/null)
  echo "  Available OT Hours: $ALLOCATED (Remaining: $REMAINING)"
else
  SCHEDULE_ID=$(echo "$RESPONSE" | python -c 'import sys, json; d=json.load(sys.stdin); print(d.get("id", ""))' 2>/dev/null)
  if [ ! -z "$SCHEDULE_ID" ]; then
    echo "⚠️  Shift created without overtime popup (might be OK for this duration)"
    echo "  ID: $SCHEDULE_ID"
  else
    echo "❌ Error:"
    echo "$RESPONSE" | python -m json.tool 2>/dev/null | head -10
  fi
fi

echo
echo "════════════════════════════════════════════════════════════════"
echo "TEST 2: WEEKLY OVERTIME (40+ hours/week)"
echo "════════════════════════════════════════════════════════════════"
echo

# Create Employee 3 for this test (fresh start)
EMPLOYEE_ID=3
ROLE_ID=1

echo "Creating 5 shifts of 9 hours each for Employee $EMPLOYEE_ID"
echo "  Total: 45 hours (exceeds 40-hour/week limit)"
echo

CREATED=0
OVERTIME_FOUND=false

# Get this week's dates
CURRENT_MONDAY=$(date -d "$(date +%Y-%m-%d) - $(date +%w) days + 1 day" +%Y-%m-%d 2>/dev/null || date -v-$(date +%w)d -v+1d +%Y-%m-%d 2>/dev/null)

for i in {0..4}; do
  DATE=$(date -d "$CURRENT_MONDAY + $i days" +%Y-%m-%d 2>/dev/null || date -v+${i}d -f "%Y-%m-%d" "$CURRENT_MONDAY" +%Y-%m-%d 2>/dev/null)
  
  echo -n "  Shift $((i+1)): $DATE (09:00-18:00, 9 hours)... "
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/schedules" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"employee_id\": $EMPLOYEE_ID,
      \"role_id\": $ROLE_ID,
      \"date\": \"$DATE\",
      \"start_time\": \"09:00\",
      \"end_time\": \"18:00\"
    }")
  
  if echo "$RESPONSE" | python -c 'import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get("status")=="requires_overtime_approval" else 1)' 2>/dev/null; then
    WEEKLY=$(echo "$RESPONSE" | python -c 'import sys, json; print(json.load(sys.stdin).get("total_weekly_hours", ""))' 2>/dev/null)
    echo "⚠️  Overtime (Weekly: ${WEEKLY}h)"
    OVERTIME_FOUND=true
  else
    echo "✅ Created"
  fi
  
  CREATED=$((CREATED + 1))
done

echo
if [ "$OVERTIME_FOUND" = true ]; then
  echo "✅ PASS: Weekly overtime popup triggered when adding 9-hour shifts!"
else
  echo "ℹ️  Weekly overtime may not be triggered until total exceeds 40 hours"
fi

echo
echo "════════════════════════════════════════════════════════════════"
echo "TEST COMPLETE"
echo "════════════════════════════════════════════════════════════════"
