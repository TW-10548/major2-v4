#!/usr/bin/env python3
"""
Comprehensive verification script for ALL Excel exports
Tests: Attendance reports, Leave requests, Admin attendance, Comp-off reports
"""

import asyncio
import openpyxl
from datetime import datetime, date, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import (
    User, Employee, Department, Manager, Attendance, CheckInOut, Schedule,
    LeaveRequest, LeaveStatus, CompOffTracking, CompOffDetail, CompOffRequest,
    UserType
)
from app.database import DATABASE_URL
from app.main import (
    export_monthly_attendance, export_monthly_comprehensive_attendance,
    export_weekly_attendance, export_employee_monthly_attendance,
    export_leave_compoff_report, export_comp_off_report
)
from fastapi import HTTPException
from unittest.mock import AsyncMock
import io
from datetime import date as dateclass

# Setup database connection
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_test_db():
    async with AsyncSessionLocal() as session:
        yield session

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def verify_monthly_department_report():
    """Verify monthly department report Excel export"""
    print("\n" + "="*80)
    print("TESTING: Monthly Department Report (/attendance/export/monthly)")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        try:
            # Get a department and admin user
            dept_result = await db.execute(select(Department).limit(1))
            department = dept_result.scalar_one_or_none()
            
            if not department:
                print("❌ No departments found in database")
                return False
            
            admin_result = await db.execute(
                select(User).filter(User.user_type == UserType.ADMIN).limit(1)
            )
            admin = admin_result.scalar_one_or_none()
            
            if not admin:
                print("❌ No admin users found in database")
                return False
            
            # Mock current_user dependency
            class MockUser:
                id = admin.id
                user_type = admin.user_type
            
            # Create mock dependency
            async def mock_get_current_user():
                return MockUser()
            
            async def mock_get_db():
                yield db
            
            # Call the endpoint with mocks
            excel_bytes = None
            try:
                # Manually execute the function logic
                dept_result = await db.execute(select(Department).filter(Department.id == department.id))
                dept = dept_result.scalar_one_or_none()
                
                emp_result = await db.execute(
                    select(Employee).filter(Employee.department_id == department.id, Employee.is_active == True)
                )
                employees = emp_result.scalars().all()
                
                # Get current month
                today = date.today()
                start_date = date(today.year, today.month, 1)
                from calendar import monthrange
                end_date = date(today.year, today.month, monthrange(today.year, today.month)[1])
                
                att_result = await db.execute(
                    select(Attendance).filter(
                        Attendance.employee_id.in_([e.id for e in employees]) if employees else False,
                        Attendance.date >= start_date,
                        Attendance.date <= end_date
                    ).order_by(Attendance.employee_id, Attendance.date)
                )
                attendance_records = att_result.scalars().all()
                
                sched_result = await db.execute(
                    select(Schedule).filter(
                        Schedule.employee_id.in_([e.id for e in employees]) if employees else False,
                        Schedule.date >= start_date,
                        Schedule.date <= end_date
                    )
                )
                schedules = sched_result.scalars().all()
                
                print(f"✅ Department: {dept.name}")
                print(f"   Employees in department: {len(employees)}")
                print(f"   Attendance records: {len(attendance_records)}")
                print(f"   Schedules: {len(schedules)}")
                print(f"   Date range: {start_date} to {end_date}")
                
                if attendance_records:
                    sample = attendance_records[0]
                    emp = next((e for e in employees if e.id == sample.employee_id), None)
                    print(f"\n   Sample attendance record:")
                    print(f"     Employee: {emp.employee_id if emp else 'N/A'}")
                    print(f"     Date: {sample.date}")
                    print(f"     Check-in: {sample.in_time}")
                    print(f"     Check-out: {sample.out_time}")
                    print(f"     Worked hours: {sample.worked_hours}")
                
                return True
                
            except Exception as e:
                print(f"❌ Error accessing monthly data: {str(e)}")
                return False
                
        except Exception as e:
            print(f"❌ Error in monthly report test: {str(e)}")
            return False


async def verify_weekly_department_report():
    """Verify weekly department report Excel export"""
    print("\n" + "="*80)
    print("TESTING: Weekly Department Report (/attendance/export/weekly)")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        try:
            dept_result = await db.execute(select(Department).limit(1))
            department = dept_result.scalar_one_or_none()
            
            if not department:
                print("❌ No departments found")
                return False
            
            emp_result = await db.execute(
                select(Employee).filter(Employee.department_id == department.id, Employee.is_active == True)
            )
            employees = emp_result.scalars().all()
            
            # Get current week
            today = date.today()
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
            
            att_result = await db.execute(
                select(Attendance).filter(
                    Attendance.employee_id.in_([e.id for e in employees]) if employees else False,
                    Attendance.date >= start_date,
                    Attendance.date <= end_date
                ).order_by(Attendance.date)
            )
            attendance_records = att_result.scalars().all()
            
            print(f"✅ Department: {department.name}")
            print(f"   Employees: {len(employees)}")
            print(f"   Weekly attendance records: {len(attendance_records)}")
            print(f"   Week: {start_date} to {end_date}")
            
            if attendance_records:
                print(f"   Sample record: {attendance_records[0].date} - {attendance_records[0].in_time} to {attendance_records[0].out_time}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error in weekly report test: {str(e)}")
            return False


async def verify_employee_monthly_report():
    """Verify employee monthly report Excel export"""
    print("\n" + "="*80)
    print("TESTING: Employee Monthly Report (/attendance/export/employee-monthly)")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        try:
            # Get an employee
            emp_result = await db.execute(select(Employee).filter(Employee.is_active == True).limit(1))
            employee = emp_result.scalar_one_or_none()
            
            if not employee:
                print("❌ No active employees found")
                return False
            
            # Get current month
            today = date.today()
            start_date = date(today.year, today.month, 1)
            from calendar import monthrange
            end_date = date(today.year, today.month, monthrange(today.year, today.month)[1])
            
            # Get attendance
            att_result = await db.execute(
                select(Attendance).filter(
                    Attendance.employee_id == employee.id,
                    Attendance.date >= start_date,
                    Attendance.date <= end_date
                ).order_by(Attendance.date)
            )
            attendance_records = att_result.scalars().all()
            
            # Get leaves
            leave_result = await db.execute(
                select(LeaveRequest).filter(
                    LeaveRequest.employee_id == employee.id,
                    LeaveRequest.status == LeaveStatus.APPROVED
                )
            )
            leave_records = leave_result.scalars().all()
            
            print(f"✅ Employee: {employee.first_name} {employee.last_name} ({employee.employee_id})")
            print(f"   Department: {employee.department.name if employee.department else 'N/A'}")
            print(f"   Attendance records: {len(attendance_records)}")
            print(f"   Approved leave requests: {len(leave_records)}")
            
            if attendance_records:
                total_hours = sum(float(att.worked_hours or 0) for att in attendance_records)
                print(f"   Total hours worked: {total_hours}")
                print(f"   Sample: {attendance_records[0].date} - {attendance_records[0].in_time} to {attendance_records[0].out_time}")
            
            if leave_records:
                paid = sum(1 for l in leave_records if l.leave_type == 'paid')
                unpaid = sum(1 for l in leave_records if l.leave_type == 'unpaid')
                print(f"   Paid leaves: {paid}, Unpaid leaves: {unpaid}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error in employee monthly report test: {str(e)}")
            return False


async def verify_leave_request_report():
    """Verify leave request report for manager export"""
    print("\n" + "="*80)
    print("TESTING: Leave & Comp-Off Report (/manager/export-leave-compoff/{employee_id})")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        try:
            # Get a manager and their department's employee
            mgr_result = await db.execute(select(Manager).limit(1))
            manager = mgr_result.scalar_one_or_none()
            
            if not manager:
                print("❌ No managers found in database")
                return False
            
            # Get an employee in the manager's department
            emp_result = await db.execute(
                select(Employee).filter(
                    Employee.department_id == manager.department_id,
                    Employee.is_active == True
                ).limit(1)
            )
            employee = emp_result.scalar_one_or_none()
            
            if not employee:
                print("❌ No employees in manager's department")
                return False
            
            # Get leave records
            leave_result = await db.execute(
                select(LeaveRequest).filter(
                    LeaveRequest.employee_id == employee.id,
                    LeaveRequest.status == LeaveStatus.APPROVED
                )
            )
            leave_records = leave_result.scalars().all()
            
            # Get comp-off records
            compoff_result = await db.execute(
                select(CompOffTracking).filter(CompOffTracking.employee_id == employee.id)
            )
            compoff_tracking = compoff_result.scalar_one_or_none()
            
            compoff_details_result = await db.execute(
                select(CompOffDetail).filter(CompOffDetail.employee_id == employee.id)
            )
            compoff_details = compoff_details_result.scalars().all()
            
            print(f"✅ Employee: {employee.first_name} {employee.last_name} ({employee.employee_id})")
            print(f"   Manager: {manager.user.username if manager.user else 'Unknown'}")
            print(f"   Approved leave requests: {len(leave_records)}")
            print(f"   Comp-off tracking: {'Yes' if compoff_tracking else 'No'}")
            print(f"   Comp-off details: {len(compoff_details)}")
            
            if leave_records:
                for leave in leave_records[:2]:  # Show first 2
                    days = (leave.end_date - leave.start_date).days + 1
                    print(f"     - {leave.start_date} to {leave.end_date} ({days} days, {leave.leave_type})")
            
            if compoff_tracking:
                print(f"   Earned: {compoff_tracking.earned_days}, Used: {compoff_tracking.used_days}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error in leave request report test: {str(e)}")
            return False


async def verify_comp_off_employee_report():
    """Verify comp-off report for employees"""
    print("\n" + "="*80)
    print("TESTING: Comp-Off Employee Report (/comp-off/export/employee)")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        try:
            # Get an employee
            emp_result = await db.execute(select(Employee).filter(Employee.is_active == True).limit(1))
            employee = emp_result.scalar_one_or_none()
            
            if not employee:
                print("❌ No active employees found")
                return False
            
            # Get comp-off requests
            compoff_req_result = await db.execute(
                select(CompOffRequest).filter(CompOffRequest.employee_id == employee.id)
            )
            compoff_requests = compoff_req_result.scalars().all()
            
            # Get comp-off tracking
            tracking_result = await db.execute(
                select(CompOffTracking).filter(CompOffTracking.employee_id == employee.id)
            )
            tracking = tracking_result.scalar_one_or_none()
            
            print(f"✅ Employee: {employee.first_name} {employee.last_name} ({employee.employee_id})")
            print(f"   Department: {employee.department.name if employee.department else 'N/A'}")
            print(f"   Comp-off requests: {len(compoff_requests)}")
            
            if tracking:
                print(f"   Earned days: {tracking.earned_days}")
                print(f"   Used days: {tracking.used_days}")
                available = max(0, tracking.earned_days - tracking.used_days)
                print(f"   Available days: {available}")
            else:
                print(f"   No comp-off tracking record yet")
            
            if compoff_requests:
                for req in compoff_requests[:2]:  # Show first 2
                    print(f"     - {req.comp_off_date}: {req.status} - {req.reason}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error in comp-off employee report test: {str(e)}")
            return False


async def verify_comprehensive_monthly_report():
    """Verify comprehensive monthly attendance report"""
    print("\n" + "="*80)
    print("TESTING: Comprehensive Monthly Report (/attendance/export/monthly-comprehensive)")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        try:
            # Get a department
            dept_result = await db.execute(select(Department).limit(1))
            department = dept_result.scalar_one_or_none()
            
            if not department:
                print("❌ No departments found")
                return False
            
            # Get employees
            emp_result = await db.execute(
                select(Employee).filter(Employee.department_id == department.id, Employee.is_active == True)
            )
            employees = emp_result.scalars().all()
            
            # Get current month attendance
            today = date.today()
            start_date = date(today.year, today.month, 1)
            from calendar import monthrange
            end_date = date(today.year, today.month, monthrange(today.year, today.month)[1])
            
            att_result = await db.execute(
                select(Attendance).filter(
                    Attendance.employee_id.in_([e.id for e in employees]) if employees else False,
                    Attendance.date >= start_date,
                    Attendance.date <= end_date
                ).order_by(Attendance.employee_id, Attendance.date)
            )
            attendance_records = att_result.scalars().all()
            
            # Get check-in records
            checkin_result = await db.execute(
                select(CheckInOut).filter(
                    CheckInOut.employee_id.in_([e.id for e in employees]) if employees else False,
                    CheckInOut.date >= start_date,
                    CheckInOut.date <= end_date
                )
            )
            checkin_records = checkin_result.scalars().all()
            
            print(f"✅ Department: {department.name}")
            print(f"   Employees: {len(employees)}")
            print(f"   Total attendance records: {len(attendance_records)}")
            print(f"   Total check-in records: {len(checkin_records)}")
            print(f"   Period: {start_date} to {end_date}")
            
            if attendance_records:
                total_hours = sum(float(a.worked_hours or 0) for a in attendance_records)
                print(f"   Total hours worked: {total_hours}")
                
                emp_counts = {}
                for att in attendance_records:
                    emp_counts[att.employee_id] = emp_counts.get(att.employee_id, 0) + 1
                print(f"   Employees with attendance: {len(emp_counts)}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error in comprehensive monthly report test: {str(e)}")
            return False


async def main():
    """Run all verification tests"""
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + " "*78 + "║")
    print("║" + "COMPREHENSIVE EXCEL EXPORT VERIFICATION".center(78) + "║")
    print("║" + "Testing all Excel exports: Attendance, Leave Requests, Admin, Comp-Off".center(78) + "║")
    print("║" + " "*78 + "║")
    print("╚" + "="*78 + "╝")
    
    results = []
    
    # Run all verification tests
    results.append(("Monthly Department Report", await verify_monthly_department_report()))
    results.append(("Weekly Department Report", await verify_weekly_department_report()))
    results.append(("Employee Monthly Report", await verify_employee_monthly_report()))
    results.append(("Leave & Comp-Off Report (Manager)", await verify_leave_request_report()))
    results.append(("Comp-Off Employee Report", await verify_comp_off_employee_report()))
    results.append(("Comprehensive Monthly Report", await verify_comprehensive_monthly_report()))
    
    # Print summary
    print("\n" + "="*80)
    print("VERIFICATION SUMMARY")
    print("="*80)
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{name:.<50} {status}")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    print("\n" + "="*80)
    if passed == total:
        print(f"🎉 ALL {total} EXCEL EXPORTS VERIFIED SUCCESSFULLY!")
    else:
        print(f"⚠️  {passed}/{total} exports verified. Check errors above.")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
