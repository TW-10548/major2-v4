#!/usr/bin/env python
"""Test script to verify mock data and OT calculations"""

import asyncio
from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload

from app.database import engine
from app.models import (
    Employee, Attendance, OvertimeRequest, OvertimeStatus,
    Schedule, LeaveRequest, LeaveStatus, CheckInOut
)


async def verify_mock_data():
    print("=" * 80)
    print("📊 MOCK DATA VERIFICATION & OT CALCULATION CHECK")
    print("=" * 80)
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Count totals
        emp_result = await session.execute(select(func.count(Employee.id)))
        emp_count = emp_result.scalar()
        
        att_result = await session.execute(select(func.count(Attendance.id)))
        att_count = att_result.scalar()
        
        ot_result = await session.execute(select(func.count(OvertimeRequest.id)))
        ot_count = ot_result.scalar()
        
        leave_result = await session.execute(select(func.count(LeaveRequest.id)))
        leave_count = leave_result.scalar()
        
        checkin_result = await session.execute(select(func.count(CheckInOut.id)))
        checkin_count = checkin_result.scalar()
        
        print(f"\n📈 TOTALS:")
        print(f"  • Employees: {emp_count}")
        print(f"  • Check-In Records: {checkin_count}")
        print(f"  • Attendance Records: {att_count}")
        print(f"  • OT Approvals: {ot_count}")
        print(f"  • Leave Requests: {leave_count}")
        
        # Check OT statistics
        print(f"\n🔍 OVERTIME STATISTICS:")
        
        # OT with worked hours > 0
        att_with_ot = await session.execute(
            select(Attendance).filter(Attendance.overtime_hours > 0).limit(5)
        )
        ot_records = att_with_ot.scalars().all()
        
        if ot_records:
            print(f"  ✅ Found {len(ot_records)} sample records with OT worked:")
            for i, att in enumerate(ot_records, 1):
                print(f"\n     Record {i}:")
                print(f"       • Date: {att.date}")
                print(f"       • Worked Hours: {att.worked_hours}")
                print(f"       • Break Minutes: {att.break_minutes}")
                print(f"       • Overtime Hours: {att.overtime_hours}")
                print(f"       • Status: {att.status}")
                print(f"       • Check-In Time: {att.in_time}")
                print(f"       • Check-Out Time: {att.out_time}")
        else:
            print(f"  ⚠️  No records with OT worked found")
        
        # Check OT approvals
        print(f"\n✅ OT APPROVAL DETAILS (sample):")
        ot_approvals = await session.execute(
            select(OvertimeRequest).filter(
                OvertimeRequest.status == OvertimeStatus.APPROVED
            ).limit(3)
        )
        approvals = ot_approvals.scalars().all()
        
        if approvals:
            for i, ot in enumerate(approvals, 1):
                print(f"\n  Approval {i}:")
                print(f"    • Date: {ot.request_date}")
                print(f"    • From-To: {ot.from_time} - {ot.to_time}")
                print(f"    • Request Hours: {ot.request_hours}")
                print(f"    • Status: {ot.status}")
        
        # Verify leave records
        print(f"\n📋 LEAVE RECORDS (sample):")
        leaves = await session.execute(
            select(LeaveRequest).filter(
                LeaveRequest.status == LeaveStatus.APPROVED
            ).limit(3)
        )
        leave_records = leaves.scalars().all()
        
        if leave_records:
            for i, leave in enumerate(leave_records, 1):
                print(f"  Leave {i}: {leave.start_date} - {leave.end_date} ({leave.leave_type})")
        
        # Check constraints
        print(f"\n🎯 CONSTRAINT VERIFICATION:")
        
        # 1. Max 5 shifts per week
        print(f"\n  1️⃣  MAX 5 SHIFTS/WEEK CONSTRAINT:")
        # Get an employee and check their weekly shifts
        emp = await session.execute(
            select(Employee).limit(1)
        )
        employee = emp.scalar_one_or_none()
        
        if employee:
            schedules = await session.execute(
                select(Schedule).filter(Schedule.employee_id == employee.id).order_by(Schedule.date)
            )
            schs = schedules.scalars().all()
            if schs:
                # Group by week
                from datetime import timedelta, datetime
                weeks = {}
                for sch in schs:
                    week_start = sch.date - timedelta(days=sch.date.weekday())
                    week_key = week_start.isoformat()
                    if week_key not in weeks:
                        weeks[week_key] = []
                    weeks[week_key].append(sch)
                
                max_shifts_in_week = max(len(v) for v in weeks.values()) if weeks else 0
                print(f"     • {employee.first_name} {employee.last_name}")
                print(f"     • Max shifts in any week: {max_shifts_in_week}")
                print(f"     • ✅ PASS" if max_shifts_in_week <= 5 else "     • ❌ FAIL - exceeds 5 shifts")
        
        # 2. Overtime calculation (8hrs/day with 1hr break)
        print(f"\n  2️⃣  OT CALCULATION (8hrs/day + 1hr break):")
        att_samples = await session.execute(
            select(Attendance).filter(
                Attendance.overtime_hours > 0
            ).limit(3)
        )
        samples = att_samples.scalars().all()
        
        if samples:
            for att in samples:
                print(f"     • Date: {att.date}")
                print(f"       - Worked: {att.worked_hours} hrs (8hrs expected)")
                print(f"       - Break: {att.break_minutes} min (60 expected)")
                print(f"       - OT worked: {att.overtime_hours} hrs")
                expected_ot = max(0, att.worked_hours - 8)
                print(f"       - Expected OT: ≤ {expected_ot:.2f} hrs")
                if att.overtime_hours <= expected_ot + 0.01:
                    print(f"       ✅ CORRECT")
                else:
                    print(f"       ❌ INCORRECT")
        
        # 3. OT must be within approved window
        print(f"\n  3️⃣  OT WITHIN APPROVED WINDOW:")
        att_with_ot_and_approval = await session.execute(
            select(Attendance).filter(
                Attendance.overtime_hours > 0,
                Attendance.schedule_id.isnot(None)
            ).limit(2)
        )
        att_samples = att_with_ot_and_approval.scalars().all()
        
        if att_samples:
            for att in att_samples:
                # Get OT approval for this employee on this date
                ot_req = await session.execute(
                    select(OvertimeRequest).filter(
                        OvertimeRequest.employee_id == att.employee_id,
                        OvertimeRequest.request_date == att.date,
                        OvertimeRequest.status == OvertimeStatus.APPROVED
                    )
                )
                ot_approval = ot_req.scalar_one_or_none()
                
                if ot_approval:
                    print(f"     • Date: {att.date}")
                    print(f"       - Approved OT window: {ot_approval.from_time} - {ot_approval.to_time}")
                    print(f"       - Approved hours: {ot_approval.request_hours}")
                    print(f"       - Actual OT worked: {att.overtime_hours}")
                    if att.overtime_hours <= ot_approval.request_hours + 0.01:
                        print(f"       ✅ CORRECT (capped by approved hours)")
                    else:
                        print(f"       ❌ INCORRECT (exceeds approved hours)")
        
        print(f"\n" + "="*80)
        print("✅ VERIFICATION COMPLETE")
        print("="*80)


if __name__ == "__main__":
    asyncio.run(verify_mock_data())
