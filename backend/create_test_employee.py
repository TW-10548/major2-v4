#!/usr/bin/env python3
"""
Create a test employee with check-in/out, leave, and comp-off data
"""
import asyncio
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import (
    User, Employee, Department, Manager, Schedule, Attendance, 
    LeaveRequest, CompOffTracking, CompOffDetail
)
from app.database import DATABASE_URL
from app.schemas import LeaveStatus
import hashlib

def hash_password(password: str) -> str:
    """Simple password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()

async def create_test_employee():
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    # Create async session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # 1. Get or create department
            from sqlalchemy import select
            dept_result = await session.execute(select(Department).limit(1))
            department = dept_result.scalar_one_or_none()
            
            if not department:
                print("❌ No department found. Please create a department first.")
                return
            
            print(f"✅ Using department: {department.name}")
            
            # 2. Create test user
            test_user = User(
                username="testemployee2025",
                email="testemployee2025@company.com",
                full_name="Test Employee 2025",
                user_type="employee",
                hashed_password=hash_password("Test@123456"),
                is_active=True
            )
            session.add(test_user)
            await session.flush()
            print(f"✅ Created user: {test_user.username}")
            
            # 3. Create employee
            test_employee = Employee(
                user_id=test_user.id,
                employee_id="EMP0100",
                first_name="Test",
                last_name="Employee",
                email="testemployee2025@company.com",
                department_id=department.id,
                paid_leave_per_year=20,
                is_active=True
            )
            session.add(test_employee)
            await session.flush()
            print(f"✅ Created employee: {test_employee.employee_id}")
            
            # 4. Get a shift from the department
            shift_result = await session.execute(
                select(Schedule).where(
                    Schedule.employee_id.in_(
                        select(Employee.id).where(Employee.department_id == department.id)
                    )
                ).limit(1)
            )
            existing_schedule = shift_result.scalar_one_or_none()
            
            if not existing_schedule:
                print("❌ No existing shift found. Creating default shifts...")
                # Create default shifts
                shifts = []
                for day_offset in range(20):  # Create 20 days of shifts
                    shift_date = date(2025, 12, 1) + timedelta(days=day_offset)
                    # Skip weekends for regular shifts
                    if shift_date.weekday() < 5:  # Monday-Friday
                        schedule = Schedule(
                            employee_id=test_employee.id,
                            department_id=department.id,
                            date=shift_date,
                            start_time="09:00",
                            end_time="17:00",
                            status="scheduled"
                        )
                        shifts.append(schedule)
                        session.add(schedule)
                
                await session.flush()
                print(f"✅ Created {len(shifts)} shifts for December 2025")
            else:
                # Copy existing shift pattern to test employee
                shift_date = existing_schedule.date
                for day_offset in range(20):
                    current_date = shift_date + timedelta(days=day_offset)
                    if current_date.weekday() < 5:  # Monday-Friday only
                        schedule = Schedule(
                            employee_id=test_employee.id,
                            department_id=department.id,
                            date=current_date,
                            start_time="09:00",
                            end_time="17:00",
                            status="scheduled"
                        )
                        session.add(schedule)
                
                await session.flush()
                print(f"✅ Created 20 shifts for test employee")
            
            # 5. Create attendance records (check-in/out)
            print("\n📋 Creating Attendance Records...")
            attendance_records = []
            start_date = date(2025, 12, 1)
            
            for day_offset in range(20):
                current_date = start_date + timedelta(days=day_offset)
                
                # Skip weekends
                if current_date.weekday() >= 5:
                    continue
                
                # Create attendance record
                in_time = "09:05"  # Slightly late
                out_time = "17:30"  # Stayed late
                worked_hours = 8.25
                overtime_hours = 0.25 if day_offset % 3 == 0 else 0.0  # OT on some days
                
                attendance = Attendance(
                    employee_id=test_employee.id,
                    date=current_date,
                    in_time=in_time,
                    out_time=out_time,
                    worked_hours=worked_hours,
                    overtime_hours=overtime_hours,
                    break_minutes=60,
                    status="slightly_late"
                )
                attendance_records.append(attendance)
                session.add(attendance)
            
            await session.flush()
            print(f"✅ Created {len(attendance_records)} attendance records")
            
            # 6. Create leave requests
            print("\n📋 Creating Leave Requests...")
            leave_requests = []
            
            # Paid leave: Dec 2-3
            paid_leave = LeaveRequest(
                employee_id=test_employee.id,
                leave_type="paid",
                duration_type="full_day",
                start_date=date(2025, 12, 2),
                end_date=date(2025, 12, 3),
                reason="Personal time off",
                status=LeaveStatus.APPROVED,
                review_notes="Approved by manager"
            )
            leave_requests.append(paid_leave)
            session.add(paid_leave)
            
            # Unpaid leave: Dec 9
            unpaid_leave = LeaveRequest(
                employee_id=test_employee.id,
                leave_type="unpaid",
                duration_type="full_day",
                start_date=date(2025, 12, 9),
                end_date=date(2025, 12, 9),
                reason="Unpaid day off",
                status=LeaveStatus.APPROVED,
                review_notes="Approved"
            )
            leave_requests.append(unpaid_leave)
            session.add(unpaid_leave)
            
            # Half-day leave: Dec 15 (morning)
            half_leave = LeaveRequest(
                employee_id=test_employee.id,
                leave_type="paid",
                duration_type="half_day_morning",
                start_date=date(2025, 12, 15),
                end_date=date(2025, 12, 15),
                reason="Doctor appointment",
                status=LeaveStatus.APPROVED,
                review_notes="Approved"
            )
            leave_requests.append(half_leave)
            session.add(half_leave)
            
            await session.flush()
            print(f"✅ Created {len(leave_requests)} leave requests")
            
            # 7. Create comp-off records
            print("\n📋 Creating Comp-Off Records...")
            
            # First, create comp-off tracking record
            comp_off_tracking = CompOffTracking(
                employee_id=test_employee.id,
                earned_days=3,
                used_days=1,
                available_days=2,
                expired_days=0
            )
            session.add(comp_off_tracking)
            await session.flush()
            print(f"✅ Created comp-off tracking (Earned: 3, Used: 1, Available: 2)")
            
            # Create comp-off earned records (worked on weekend)
            comp_off_earned_dates = [
                date(2025, 11, 29),  # Saturday in Nov (earned_month: 2025-11)
                date(2025, 12, 6),   # Saturday in Dec (earned_month: 2025-12)
                date(2025, 12, 13),  # Saturday in Dec (earned_month: 2025-12)
            ]
            
            for comp_date in comp_off_earned_dates:
                # Create schedule entry
                schedule = Schedule(
                    employee_id=test_employee.id,
                    department_id=department.id,
                    date=comp_date,
                    start_time="10:00",
                    end_time="14:00",
                    status="comp_off_earned"
                )
                session.add(schedule)
                
                # Create comp-off detail record
                earned_month = comp_date.strftime("%Y-%m")
                detail = CompOffDetail(
                    employee_id=test_employee.id,
                    tracking_id=comp_off_tracking.id,
                    type="earned",
                    date=comp_date,
                    earned_month=earned_month,
                    notes=f"Worked on {comp_date.strftime('%A')}"
                )
                session.add(detail)
            
            # Create comp-off used record (used on Dec 16)
            comp_used_schedule = Schedule(
                employee_id=test_employee.id,
                department_id=department.id,
                date=date(2025, 12, 16),
                status="comp_off_taken"
            )
            session.add(comp_used_schedule)
            
            comp_used_detail = CompOffDetail(
                employee_id=test_employee.id,
                tracking_id=comp_off_tracking.id,
                type="used",
                date=date(2025, 12, 16),
                earned_month="2025-12",
                notes="Used earned comp-off"
            )
            session.add(comp_used_detail)
            
            await session.flush()
            print(f"✅ Created comp-off earned and used records")
            
            # Commit all changes
            await session.commit()
            
            print("\n" + "="*60)
            print("✅ TEST EMPLOYEE CREATED SUCCESSFULLY!")
            print("="*60)
            print(f"\n📊 Test Employee Details:")
            print(f"   Employee ID: {test_employee.employee_id}")
            print(f"   Name: {test_employee.first_name} {test_employee.last_name}")
            print(f"   Username: {test_user.username}")
            print(f"   Password: Test@123456")
            print(f"   Department: {department.name}")
            print(f"\n📈 Data Created:")
            print(f"   ✓ 20 Work Schedules (Dec 1-20, Mon-Fri)")
            print(f"   ✓ 20 Attendance Records (check-in/out)")
            print(f"   ✓ 3 Leave Requests (paid, unpaid, half-day)")
            print(f"   ✓ 3 Comp-Off Earned Records (weekends)")
            print(f"   ✓ 1 Comp-Off Used Record")
            print(f"   ✓ Comp-Off Balance: Earned=3, Used=1, Available=2")
            print(f"\n📥 Excel Export Testing:")
            print(f"   Department Monthly: /attendance/export/monthly?department_id={department.id}&year=2025&month=12")
            print(f"   Employee Monthly: /attendance/export/employee-monthly?year=2025&month=12&employee_id={test_employee.employee_id}")
            print(f"   Leave/Comp-Off: /manager/export-leave-compoff/{test_employee.employee_id}")
            print("\n" + "="*60)
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_test_employee())
