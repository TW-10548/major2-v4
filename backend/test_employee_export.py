#!/usr/bin/env python3
"""
Test employee monthly export endpoint
"""
import asyncio
import httpx
from datetime import datetime, date

async def test_employee_export():
    async with httpx.AsyncClient(timeout=30) as client:
        # First, login as employee
        login_response = await client.post(
            "http://localhost:8000/token",
            data={"username": "emp1", "password": "emp123"}
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        print(f"✅ Employee (emp1) logged in successfully")
        print(f"   Token: {token[:20]}...")
        
        # Test export for December 2024
        response = await client.get(
            "http://localhost:8000/attendance/export/employee-monthly?year=2024&month=12",
            headers=headers
        )
        
        print(f"\n📋 Export Response:")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            content = response.content
            print(f"   ✅ File size: {len(content):,} bytes")
            print(f"   Content-Type: {response.headers.get('content-type')}")
            
            # Save to file for inspection
            with open("/tmp/employee_report_test.xlsx", "wb") as f:
                f.write(content)
            print(f"   ✅ Saved to /tmp/employee_report_test.xlsx")
        else:
            print(f"   ❌ Error: {response.text}")

if __name__ == "__main__":
    print("Testing employee monthly export endpoint...\n")
    asyncio.run(test_employee_export())
