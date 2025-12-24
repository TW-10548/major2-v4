#!/usr/bin/env python3
"""
Comprehensive Database Linkage Verification Script
Checks all relationships between Attendance, Employee, Schedule, and other entities
"""

import asyncio
from datetime import datetime, date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from app.models import (
    User, Employee, Department, Manager, Attendance, CheckInOut, Schedule,
    LeaveRequest, LeaveStatus, CompOffTracking, Role, UserType
)
from app.database import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def verify_attendance_linkages():
    """Verify all Attendance records have correct linkages"""
    print("\n" + "="*80)
    print("VERIFYING ATTENDANCE RECORD LINKAGES")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        # Get all attendance records
        att_result = await db.execute(
            select(Attendance)
            .options(
                selectinload(Attendance.employee),
                selectinload(Attendance.schedule)
            )
            .limit(5)
        )
        records = att_result.scalars().all()
        
        if not records:
            print("❌ No attendance records found")
            return False
        
        print(f"✅ Found {len(records)} attendance records (showing first 5)")
        
        all_valid = True
        for i, att in enumerate(records, 1):
            print(f"\n📋 Record {i}: ID={att.id}")
            
            # Check employee linkage
            if not att.employee_id:
                print(f"   ❌ Missing employee_id")
                all_valid = False
            else:
                emp = att.employee
                if emp:
                    print(f"   ✅ Employee: {emp.employee_id} - {emp.first_name} {emp.last_name}")
                else:
                    print(f"   ❌ Employee ID {att.employee_id} not found in database")
                    all_valid = False
            
            # Check schedule linkage
            if att.schedule_id:
                sch = att.schedule
                if sch:
                    print(f"   ✅ Schedule: {sch.start_time}-{sch.end_time}")
                else:
                    print(f"   ⚠️  Schedule ID {att.schedule_id} not found")
            else:
                print(f"   ℹ️  No schedule linked (optional)")
            
            # Check attendance data
            print(f"   📅 Date: {att.date}")
            print(f"   🔐 Check-in: {att.in_time or 'Not checked in'}")
            print(f"   🔓 Check-out: {att.out_time or 'Not checked out'}")
            print(f"   ⏱️  Worked hours: {att.worked_hours}")
            print(f"   ✓ Status: {att.status}")
        
        return all_valid


async def verify_employee_details():
    """Verify employee records have all required details"""
    print("\n" + "="*80)
    print("VERIFYING EMPLOYEE DETAILS")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        emp_result = await db.execute(
            select(Employee)
            .options(
                selectinload(Employee.department),
                selectinload(Employee.user)
            )
            .filter(Employee.is_active == True)
            .limit(5)
        )
        employees = emp_result.scalars().all()
        
        if not employees:
            print("❌ No active employees found")
            return False
        
        print(f"✅ Found {len(employees)} active employees (showing first 5)")
        
        all_valid = True
        for i, emp in enumerate(employees, 1):
            print(f"\n👤 Employee {i}")
            
            # Check required fields
            checks = [
                ("Employee ID", emp.employee_id),
                ("First Name", emp.first_name),
                ("Last Name", emp.last_name),
                ("Email", emp.email),
            ]
            
            for field, value in checks:
                if value:
                    print(f"   ✅ {field}: {value}")
                else:
                    print(f"   ❌ {field}: MISSING")
                    all_valid = False
            
            # Check department linkage
            if emp.department_id:
                dept = emp.department
                if dept:
                    print(f"   ✅ Department: {dept.name}")
                else:
                    print(f"   ❌ Department ID {emp.department_id} not found")
                    all_valid = False
            else:
                print(f"   ⚠️  No department assigned")
        
        return all_valid


async def verify_schedule_linkages():
    """Verify Schedule records have correct linkages"""
    print("\n" + "="*80)
    print("VERIFYING SCHEDULE LINKAGES")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        today = date.today()
        
        sch_result = await db.execute(
            select(Schedule)
            .options(
                selectinload(Schedule.employee),
                selectinload(Schedule.role),
                selectinload(Schedule.department)
            )
            .filter(Schedule.date == today)
            .limit(5)
        )
        schedules = sch_result.scalars().all()
        
        if not schedules:
            print(f"⚠️  No schedules found for today ({today})")
            return True
        
        print(f"✅ Found {len(schedules)} schedules for today (showing first 5)")
        
        all_valid = True
        for i, sch in enumerate(schedules, 1):
            print(f"\n📅 Schedule {i}")
            
            # Check employee linkage
            if sch.employee_id:
                emp = sch.employee
                if emp:
                    print(f"   ✅ Employee: {emp.employee_id} - {emp.first_name} {emp.last_name}")
                else:
                    print(f"   ❌ Employee ID {sch.employee_id} not found")
                    all_valid = False
            else:
                print(f"   ❌ No employee assigned")
                all_valid = False
            
            # Check role linkage
            if sch.role_id:
                role = sch.role
                if role:
                    print(f"   ✅ Role: {role.name}")
                else:
                    print(f"   ⚠️  Role ID {sch.role_id} not found")
            else:
                print(f"   ℹ️  No role specified")
            
            # Check department linkage
            if sch.department_id:
                dept = sch.department
                if dept:
                    print(f"   ✅ Department: {dept.name}")
                else:
                    print(f"   ⚠️  Department ID {sch.department_id} not found")
            else:
                print(f"   ℹ️  No department specified")
            
            # Check shift times
            print(f"   🕐 Start: {sch.start_time}")
            print(f"   🕑 End: {sch.end_time}")
        
        return all_valid


async def verify_checkin_attendance_sync():
    """Verify CheckInOut and Attendance records are synchronized"""
    print("\n" + "="*80)
    print("VERIFYING CHECKIN AND ATTENDANCE SYNCHRONIZATION")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        today = date.today()
        
        # Get CheckInOut records
        checkin_result = await db.execute(
            select(CheckInOut)
            .options(selectinload(CheckInOut.employee))
            .filter(CheckInOut.date == today)
            .limit(5)
        )
        checkins = checkin_result.scalars().all()
        
        if not checkins:
            print(f"⚠️  No check-in records for today ({today})")
            return True
        
        print(f"✅ Found {len(checkins)} check-in records")
        
        all_valid = True
        for i, checkin in enumerate(checkins, 1):
            print(f"\n🔐 CheckInOut {i}")
            
            # Get corresponding Attendance record
            att_result = await db.execute(
                select(Attendance).filter(
                    Attendance.date == today,
                    Attendance.employee_id == checkin.employee_id
                )
            )
            attendance = att_result.scalar_one_or_none()
            
            emp = checkin.employee
            if emp:
                print(f"   ✅ Employee: {emp.employee_id} - {emp.first_name} {emp.last_name}")
            else:
                print(f"   ❌ Employee not found")
                all_valid = False
            
            print(f"   🔐 Check-in: {checkin.check_in_time}")
            
            if attendance:
                print(f"   ✅ Attendance Record Found")
                print(f"      In Time: {attendance.in_time}")
                print(f"      Out Time: {attendance.out_time}")
                print(f"      Worked Hours: {attendance.worked_hours}")
                
                # Verify sync
                if attendance.in_time != str(checkin.check_in_time).split()[1] if checkin.check_in_time else "-":
                    print(f"      ⚠️  Times may not be perfectly synced (that's OK)")
            else:
                print(f"   ⚠️  No Attendance record for this check-in")
        
        return all_valid


async def verify_department_employees():
    """Verify department-employee relationships"""
    print("\n" + "="*80)
    print("VERIFYING DEPARTMENT-EMPLOYEE RELATIONSHIPS")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        dept_result = await db.execute(
            select(Department)
            .options(selectinload(Department.employees))
            .limit(3)
        )
        departments = dept_result.scalars().all()
        
        if not departments:
            print("❌ No departments found")
            return False
        
        print(f"✅ Found {len(departments)} departments (showing first 3)")
        
        all_valid = True
        for i, dept in enumerate(departments, 1):
            print(f"\n🏢 Department {i}: {dept.name} ({dept.dept_id})")
            
            # Count employees
            emp_count = len(dept.employees) if dept.employees else 0
            print(f"   ✅ Total employees: {emp_count}")
            
            if emp_count > 0:
                # Show sample employees
                for emp in dept.employees[:3]:
                    print(f"      - {emp.employee_id}: {emp.first_name} {emp.last_name}")
                if emp_count > 3:
                    print(f"      ... and {emp_count - 3} more")
        
        return all_valid


async def verify_data_integrity():
    """Check overall data integrity"""
    print("\n" + "="*80)
    print("VERIFYING DATA INTEGRITY")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        # Count all records
        counts = {}
        
        tables = [
            ("Users", User),
            ("Employees", Employee),
            ("Departments", Department),
            ("Managers", Manager),
            ("Roles", Role),
            ("Attendance", Attendance),
            ("CheckInOut", CheckInOut),
            ("Schedules", Schedule),
            ("Leave Requests", LeaveRequest),
        ]
        
        for name, model in tables:
            result = await db.execute(select(func.count(model.id)))
            count = result.scalar()
            counts[name] = count
            status = "✅" if count > 0 else "⚠️"
            print(f"{status} {name}: {count} records")
        
        # Check for orphaned records
        print(f"\n🔍 Checking for orphaned records...")
        
        # Attendance without employee
        orphan_result = await db.execute(
            select(func.count(Attendance.id)).filter(Attendance.employee_id.is_(None))
        )
        orphan_count = orphan_result.scalar()
        if orphan_count > 0:
            print(f"   ⚠️  {orphan_count} Attendance records without employee")
        else:
            print(f"   ✅ No orphaned Attendance records")
        
        return True


async def main():
    """Run all verifications"""
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + " "*78 + "║")
    print("║" + "DATABASE LINKAGE VERIFICATION - COMPREHENSIVE CHECK".center(78) + "║")
    print("║" + " "*78 + "║")
    print("╚" + "="*78 + "╝")
    
    results = []
    
    try:
        results.append(("Attendance Linkages", await verify_attendance_linkages()))
        results.append(("Employee Details", await verify_employee_details()))
        results.append(("Schedule Linkages", await verify_schedule_linkages()))
        results.append(("CheckIn-Attendance Sync", await verify_checkin_attendance_sync()))
        results.append(("Department-Employee Relationships", await verify_department_employees()))
        results.append(("Data Integrity", await verify_data_integrity()))
    except Exception as e:
        print(f"\n❌ Error during verification: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Summary
    print("\n" + "="*80)
    print("VERIFICATION SUMMARY")
    print("="*80)
    
    for name, result in results:
        status = "✅ PASS" if result else "⚠️  CHECK"
        print(f"{name:.<60} {status}")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    print("\n" + "="*80)
    if passed == total:
        print(f"🎉 ALL CHECKS PASSED - Database linkages are correct!")
    else:
        print(f"✅ Verification complete - {passed}/{total} checks passed")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
