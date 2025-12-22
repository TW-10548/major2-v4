#!/bin/bash

# Test script for check-in functionality with proper setup

BASE_URL="http://localhost:8000"

echo "=== Testing Check-In Functionality ==="
echo

# Step 1: Login as an employee
echo "1. Logging in as employee..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=emp1&password=password123")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:20}..."
echo

# Step 2: Create or get employee schedules for today
echo "2. Checking schedules for today..."
SCHEDULE_RESPONSE=$(curl -s -X GET "$BASE_URL/schedules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Schedule response:"
echo $SCHEDULE_RESPONSE | jq '.' 2>/dev/null || echo $SCHEDULE_RESPONSE
echo

# Step 3: Attempt check-in
echo "3. Attempting check-in..."
CHECK_IN_RESPONSE=$(curl -s -X POST "$BASE_URL/employee/check-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": "Office"}')

echo "Check-in response:"
echo $CHECK_IN_RESPONSE | jq '.' 2>/dev/null || echo $CHECK_IN_RESPONSE
echo

# Check response status
if echo $CHECK_IN_RESPONSE | grep -q "No scheduled shift for today"; then
  echo "⚠️  Issue: No schedule for today exists. Need to create a schedule first."
  echo
  echo "4. Testing with schedule creation..."
  
  # This would need employee_id and other details
  ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin&password=admin123")
  
  ADMIN_TOKEN=$(echo $ADMIN_LOGIN | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  
  if [ ! -z "$ADMIN_TOKEN" ]; then
    echo "✅ Admin login successful"
    
    # Get employees
    EMPLOYEES=$(curl -s -X GET "$BASE_URL/employees" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json")
    
    echo "Employees:"
    echo $EMPLOYEES | jq '.[] | {id, first_name, last_name}' 2>/dev/null | head -20
  fi
elif echo $CHECK_IN_RESPONSE | grep -q "Already checked in"; then
  echo "⚠️  Already checked in today"
elif echo $CHECK_IN_RESPONSE | grep -q "id"; then
  echo "✅ Check-in successful!"
else
  echo "❌ Check-in failed with error:"
  echo $CHECK_IN_RESPONSE | jq '.detail' 2>/dev/null || echo $CHECK_IN_RESPONSE
fi

echo
echo "=== Test Complete ==="
