#!/bin/bash
# Test Excel export endpoints

echo "Testing Monthly Export..."
curl -X GET "http://localhost:8000/attendance/export/monthly?department_id=1&year=2025&month=12" \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:8000/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=manager1&password=manager123" | jq -r '.access_token')" \
  -o /tmp/monthly_report.xlsx 2>&1

if [ -f /tmp/monthly_report.xlsx ] && [ -s /tmp/monthly_report.xlsx ]; then
  echo "✅ Monthly export successful ($(du -h /tmp/monthly_report.xlsx | cut -f1))"
else
  echo "❌ Monthly export failed"
fi

echo ""
echo "Testing Weekly Export..."
curl -X GET "http://localhost:8000/attendance/export/weekly?department_id=1&start_date=2025-12-15&end_date=2025-12-19" \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:8000/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=manager1&password=manager123" | jq -r '.access_token')" \
  -o /tmp/weekly_report.xlsx 2>&1

if [ -f /tmp/weekly_report.xlsx ] && [ -s /tmp/weekly_report.xlsx ]; then
  echo "✅ Weekly export successful ($(du -h /tmp/weekly_report.xlsx | cut -f1))"
else
  echo "❌ Weekly export failed"
fi
