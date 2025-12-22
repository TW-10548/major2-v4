#!/bin/bash

BASE_URL="http://localhost:8000"
EMPLOYEE_ID=1
ROLE_ID=1

echo "════════════════════════════════════════════════════════════════"
echo "    5 SHIFTS PER WEEK CONSTRAINT TEST"
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

echo "✅ Authenticated as admin"
echo

TODAY=$(date +%Y-%m-%d)
echo "Test Plan:"
echo "  - Add 5 shifts for Employee 1 in the current week"
echo "  - Attempt to add 6th shift (should be REJECTED)"
echo "  - Verify error message"
echo
echo "Current week dates:"

# Get this week's dates
CURRENT_MONDAY=$(date -d "$(date +%Y-%m-%d) - $(date +%w) days + 1 day" +%Y-%m-%d 2>/dev/null || date -v-$(date +%w)d -v+1d +%Y-%m-%d 2>/dev/null)
echo "  Monday: $CURRENT_MONDAY"

DATES=()
for i in {0..6}; do
  D=$(date -d "$CURRENT_MONDAY + $i days" +%Y-%m-%d 2>/dev/null || date -v+${i}d -f "%Y-%m-%d" "$CURRENT_MONDAY" +%Y-%m-%d 2>/dev/null)
  DATES+=("$D")
  echo "  Day $((i+1)): $D"
done

echo
echo "════════════════════════════════════════════════════════════════"
echo "Creating 5 shifts..."
echo "════════════════════════════════════════════════════════════════"

# Create 5 shifts
CREATED=0
for i in {0..4}; do
  DATE="${DATES[$i]}"
  echo -n "  Shift $((i+1)): $DATE ... "
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/schedules" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"employee_id\": $EMPLOYEE_ID,
      \"role_id\": $ROLE_ID,
      \"date\": \"$DATE\",
      \"start_time\": \"09:00\",
      \"end_time\": \"17:00\"
    }")
  
  SCHEDULE_ID=$(echo "$RESPONSE" | python -c 'import sys, json; d=json.load(sys.stdin); print(d.get("id", ""))' 2>/dev/null)
  
  if [ ! -z "$SCHEDULE_ID" ]; then
    echo "✅ Created (ID: $SCHEDULE_ID)"
    CREATED=$((CREATED + 1))
  else
    STATUS=$(echo "$RESPONSE" | python -c 'import sys, json; d=json.load(sys.stdin); print(d.get("status", ""))' 2>/dev/null)
    if [ "$STATUS" == "requires_overtime_approval" ]; then
      echo "⚠️  Overtime required"
      CREATED=$((CREATED + 1))
    else
      ERROR=$(echo "$RESPONSE" | python -c 'import sys, json; print(json.load(sys.stdin).get("detail", "Error"))' 2>/dev/null)
      echo "❌ Error: $ERROR"
    fi
  fi
done

echo
echo "✅ Successfully created $CREATED shifts"
echo

echo "════════════════════════════════════════════════════════════════"
echo "Attempting 6TH SHIFT (should be REJECTED)..."
echo "════════════════════════════════════════════════════════════════"
echo

SIXTH_DATE="${DATES[5]}"
echo "Date: $SIXTH_DATE (09:00-17:00)"
echo

RESPONSE=$(curl -s -X POST "$BASE_URL/schedules" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employee_id\": $EMPLOYEE_ID,
    \"role_id\": $ROLE_ID,
    \"date\": \"$SIXTH_DATE\",
    \"start_time\": \"09:00\",
    \"end_time\": \"17:00\"
  }")

# Check result
if echo "$RESPONSE" | grep -q "Cannot assign more than 5 shifts per week"; then
  echo "✅ PASS: 6th shift was correctly REJECTED!"
  echo
  ERROR=$(echo "$RESPONSE" | python -c 'import sys, json; print(json.load(sys.stdin).get("detail", ""))' 2>/dev/null)
  echo "Error Message:"
  echo "  $ERROR"
else
  SCHEDULE_ID=$(echo "$RESPONSE" | python -c 'import sys, json; d=json.load(sys.stdin); print(d.get("id", ""))' 2>/dev/null)
  if [ ! -z "$SCHEDULE_ID" ]; then
    echo "❌ FAIL: 6th shift was created (ID: $SCHEDULE_ID) but should have been rejected!"
  else
    echo "⚠️  Unexpected response:"
    echo "$RESPONSE" | python -m json.tool 2>/dev/null | head -15
  fi
fi

echo
echo "════════════════════════════════════════════════════════════════"
echo "TEST COMPLETE"
echo "════════════════════════════════════════════════════════════════"
