#!/usr/bin/env python3

import requests
import json

# Login as admin using OAuth2 form data
login_response = requests.post(
    'http://localhost:8000/token',
    data={'username': 'admin', 'password': 'admin123'}
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json().get('access_token')
print(f"Token obtained: {token[:20]}...")

# Test monthly export
headers = {'Authorization': f'Bearer {token}'}
params = {'department_id': 1, 'year': 2025, 'month': 12}

print(f"\nFetching monthly report with params: {params}")
response = requests.get(
    'http://localhost:8000/attendance/export/monthly',
    headers=headers,
    params=params
)

print(f"Status code: {response.status_code}")
print(f"Content type: {response.headers.get('content-type')}")
print(f"Content size: {len(response.content)} bytes")

# Save the file
with open('/tmp/monthly_report_debug.xlsx', 'wb') as f:
    f.write(response.content)

print(f"\nFile saved to /tmp/monthly_report_debug.xlsx")

# Now let's check the attendance data in the database
print("\n\n=== Checking database attendance data ===")
# Query the database directly to see what attendance records exist
import sys
sys.path.insert(0, '/home/tw10548/majorv8/backend')

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import date
from app.models import Attendance, Employee, Department

# Use async to connect to the database
import asyncio

async def check_db():
    DATABASE_URL = "postgresql+asyncpg://postgres:postgres123@localhost:5432/majorv8"
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Get all employees in department 1
        emp_result = await db.execute(
            select(Employee).filter(Employee.department_id == 1, Employee.is_active == True)
        )
        employees = emp_result.scalars().all()
        print(f"\nEmployees in department 1: {len(employees)}")
        for emp in employees[:5]:
            print(f"  - ID: {emp.id}, Name: {emp.first_name} {emp.last_name}")
        
        # Get attendance records for December 2025
        start_date = date(2025, 12, 1)
        end_date = date(2025, 12, 31)
        
        att_result = await db.execute(
            select(Attendance).filter(
                Attendance.employee_id.in_([e.id for e in employees]) if employees else False,
                Attendance.date >= start_date,
                Attendance.date <= end_date
            ).order_by(Attendance.date, Attendance.employee_id)
        )
        attendance_records = att_result.scalars().all()
        print(f"\nAttendance records for Dec 2025: {len(attendance_records)}")
        for record in attendance_records[:10]:
            print(f"  - Employee {record.employee_id}, Date: {record.date}, In: {record.in_time}, Out: {record.out_time}")
    
    await engine.dispose()

try:
    asyncio.run(check_db())
except Exception as e:
    print(f"Error checking database: {e}")
    import traceback
    traceback.print_exc()
