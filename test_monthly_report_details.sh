#!/bin/bash

# Test the monthly attendance report to see if Details sheet has data

# Get token
RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}')

TOKEN=$(echo $RESPONSE | jq -r '.access_token')
echo "Token: $TOKEN"

# Test monthly export - get December 2025 data for department 1
echo -e "\n\nTesting monthly export..."
curl -v -X GET "http://localhost:8000/attendance/export/monthly?department_id=1&year=2025&month=12" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \
  -o /tmp/monthly_report_test.xlsx

if [ -f /tmp/monthly_report_test.xlsx ]; then
  echo -e "\n\nFile saved successfully"
  ls -lh /tmp/monthly_report_test.xlsx
else
  echo -e "\n\nFailed to save file"
fi
