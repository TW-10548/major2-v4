#!/usr/bin/env python3
"""
Simplified test employee creation - directly using database insert
"""
import asyncio
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.database import DATABASE_URL
import hashlib

async def create_test_employee_simple():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Get department ID
            result = await session.execute(text("SELECT id, name FROM departments LIMIT 1"))
            dept = result.fetchone()
            if not dept:
                print("❌ No department found")
                return
            
            dept_id, dept_name = dept
            print(f"✅ Using department: {dept_name} (ID: {dept_id})")
            
            # Check if user already exists
            user_check = await session.execute(
                text("SELECT id FROM users WHERE username = :username"),
                {"username": "testemployee2025"}
            )
            if user_check.fetchone():
                print("⚠️ User testemployee2025 already exists, using existing...")
                user_result = await session.execute(
                    text("SELECT id FROM users WHERE username = :username"),
                    {"username": "testemployee2025"}
                )
                user_id = user_result.scalar()
            else:
                # Create user
                hashed_pwd = hashlib.sha256("Test@123456".encode()).hexdigest()
                await session.execute(
                    text("""
                    INSERT INTO users (username, email, full_name, user_type, hashed_password, is_active)
                    VALUES (:username, :email, :full_name, :user_type, :hashed_password, :is_active)
                    """),
                    {
                        "username": "testemployee2025",
                        "email": "testemployee2025@company.com",
                        "full_name": "Test Employee 2025",
                        "user_type": "EMPLOYEE",  # PostgreSQL enum uses uppercase
                        "hashed_password": hashed_pwd,
                        "is_active": True
                    }
                )
                await session.flush()
                
                user_result = await session.execute(
                    text("SELECT id FROM users WHERE username = :username"),
                    {"username": "testemployee2025"}
                )
                user_id = user_result.scalar()
            
            # Check if employee already exists
            emp_check = await session.execute(
                text("SELECT id FROM employees WHERE employee_id = :emp_id"),
                {"emp_id": "EMP0100"}
            )
            if emp_check.fetchone():
                print("⚠️ Employee EMP0100 already exists")
                emp_result = await session.execute(
                    text("SELECT id FROM employees WHERE employee_id = :emp_id"),
                    {"emp_id": "EMP0100"}
                )
                emp_id = emp_result.scalar()
            else:
                # Create employee
                await session.execute(
                    text("""
                    INSERT INTO employees (user_id, employee_id, first_name, last_name, email, department_id, paid_leave_per_year, is_active)
                    VALUES (:user_id, :employee_id, :first_name, :last_name, :email, :department_id, :paid_leave_per_year, :is_active)
                    """),
                    {
                        "user_id": user_id,
                        "employee_id": "EMP0100",
                        "first_name": "Test",
                        "last_name": "Employee",
                        "email": "testemployee2025@company.com",
                        "department_id": dept_id,
                        "paid_leave_per_year": 20,
                        "is_active": True
                    }
                )
                await session.flush()
                
                emp_result = await session.execute(
                    text("SELECT id FROM employees WHERE employee_id = :emp_id"),
                    {"emp_id": "EMP0100"}
                )
                emp_id = emp_result.scalar()
            
            print(f"✅ Using employee: EMP0100 (ID: {emp_id})")
            
            # Create attendance records
            print("\n📋 Creating Attendance Records...")
            for day_offset in range(20):
                current_date = date(2025, 12, 1) + timedelta(days=day_offset)
                
                # Skip weekends
                if current_date.weekday() >= 5:
                    continue
                
                in_time = "09:05"
                out_time = "17:30"
                worked_hours = 8.25
                overtime_hours = 0.25 if day_offset % 3 == 0 else 0.0
                
                await session.execute(
                    text("""
                    INSERT INTO attendance (employee_id, date, in_time, out_time, worked_hours, overtime_hours, break_minutes, status)
                    VALUES (:employee_id, :date, :in_time, :out_time, :worked_hours, :overtime_hours, :break_minutes, :status)
                    """),
                    {
                        "employee_id": emp_id,
                        "date": current_date,
                        "in_time": in_time,
                        "out_time": out_time,
                        "worked_hours": worked_hours,
                        "overtime_hours": overtime_hours,
                        "break_minutes": 60,
                        "status": "slightly_late"
                    }
                )
            
            await session.flush()
            print(f"✅ Created 16 attendance records")
            
            # Create leave requests
            print("\n📋 Creating Leave Requests...")
            
            # Paid leave
            await session.execute(
                text("""
                INSERT INTO leave_requests (employee_id, leave_type, duration_type, start_date, end_date, reason, status, review_notes)
                VALUES (:employee_id, :leave_type, :duration_type, :start_date, :end_date, :reason, :status, :review_notes)
                """),
                {
                    "employee_id": emp_id,
                    "leave_type": "paid",
                    "duration_type": "full_day",
                    "start_date": date(2025, 12, 2),
                    "end_date": date(2025, 12, 3),
                    "reason": "Personal time off",
                    "status": "APPROVED",
                    "review_notes": "Approved by manager"
                }
            )
            
            # Unpaid leave
            await session.execute(
                text("""
                INSERT INTO leave_requests (employee_id, leave_type, duration_type, start_date, end_date, reason, status, review_notes)
                VALUES (:employee_id, :leave_type, :duration_type, :start_date, :end_date, :reason, :status, :review_notes)
                """),
                {
                    "employee_id": emp_id,
                    "leave_type": "unpaid",
                    "duration_type": "full_day",
                    "start_date": date(2025, 12, 9),
                    "end_date": date(2025, 12, 9),
                    "reason": "Unpaid day off",
                    "status": "APPROVED",
                    "review_notes": "Approved"
                }
            )
            
            # Half-day leave
            await session.execute(
                text("""
                INSERT INTO leave_requests (employee_id, leave_type, duration_type, start_date, end_date, reason, status, review_notes)
                VALUES (:employee_id, :leave_type, :duration_type, :start_date, :end_date, :reason, :status, :review_notes)
                """),
                {
                    "employee_id": emp_id,
                    "leave_type": "paid",
                    "duration_type": "half_day_morning",
                    "start_date": date(2025, 12, 15),
                    "end_date": date(2025, 12, 15),
                    "reason": "Doctor appointment",
                    "status": "APPROVED",
                    "review_notes": "Approved"
                }
            )
            
            await session.flush()
            print(f"✅ Created 3 leave requests (1 paid 2-day, 1 unpaid 1-day, 1 half-day paid)")
            
            # Create comp-off tracking
            print("\n📋 Creating Comp-Off Records...")
            await session.execute(
                text("""
                INSERT INTO comp_off_tracking (employee_id, earned_days, used_days, available_days, expired_days)
                VALUES (:employee_id, :earned_days, :used_days, :available_days, :expired_days)
                """),
                {
                    "employee_id": emp_id,
                    "earned_days": 3,
                    "used_days": 1,
                    "available_days": 2,
                    "expired_days": 0
                }
            )
            
            await session.flush()
            
            tracking_result = await session.execute(
                text("SELECT id FROM comp_off_tracking WHERE employee_id = :emp_id"),
                {"emp_id": emp_id}
            )
            tracking_id = tracking_result.scalar()
            
            # Create comp-off earned details
            comp_dates = [
                (date(2025, 11, 29), "2025-11"),
                (date(2025, 12, 6), "2025-12"),
                (date(2025, 12, 13), "2025-12"),
            ]
            
            for comp_date, earned_month in comp_dates:
                await session.execute(
                    text("""
                    INSERT INTO comp_off_details (employee_id, tracking_id, type, date, earned_month, notes)
                    VALUES (:employee_id, :tracking_id, :type, :date, :earned_month, :notes)
                    """),
                    {
                        "employee_id": emp_id,
                        "tracking_id": tracking_id,
                        "type": "earned",
                        "date": comp_date,
                        "earned_month": earned_month,
                        "notes": f"Worked on {comp_date.strftime('%A')}"
                    }
                )
            
            # Create comp-off used detail
            await session.execute(
                text("""
                INSERT INTO comp_off_details (employee_id, tracking_id, type, date, earned_month, notes)
                VALUES (:employee_id, :tracking_id, :type, :date, :earned_month, :notes)
                """),
                {
                    "employee_id": emp_id,
                    "tracking_id": tracking_id,
                    "type": "used",
                    "date": date(2025, 12, 16),
                    "earned_month": "2025-12",
                    "notes": "Used earned comp-off"
                }
            )
            
            await session.flush()
            print(f"✅ Created 3 comp-off earned + 1 comp-off used records")
            
            # Commit
            await session.commit()
            
            print("\n" + "="*70)
            print("✅ TEST EMPLOYEE CREATED SUCCESSFULLY!")
            print("="*70)
            print(f"\n📊 Test Employee Details:")
            print(f"   Employee ID: EMP0100")
            print(f"   Name: Test Employee")
            print(f"   Username: testemployee2025")
            print(f"   Password: Test@123456")
            print(f"   Department: {dept_name} (ID: {dept_id})")
            print(f"\n📈 Data Created:")
            print(f"   ✓ 16 Attendance Records (Dec 1-20, Mon-Fri)")
            print(f"   ✓ 3 Leave Requests (2-day paid, 1-day unpaid, 1 half-day paid)")
            print(f"   ✓ 3 Comp-Off Earned Records (weekends)")
            print(f"   ✓ 1 Comp-Off Used Record")
            print(f"   ✓ Comp-Off Balance: Earned=3, Used=1, Available=2")
            print(f"\n📥 Excel Export URLs:")
            print(f"   Department: /attendance/export/monthly?department_id={dept_id}&year=2025&month=12")
            print(f"   Employee: /attendance/export/employee-monthly?year=2025&month=12&employee_id=EMP0100")
            print(f"   Leave/Comp-Off: /manager/export-leave-compoff/EMP0100")
            print("\n" + "="*70)
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_test_employee_simple())
