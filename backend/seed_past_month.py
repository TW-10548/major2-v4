#!/usr/bin/env python
"""
Comprehensive Mock Data Seeding - Past One Month
Creates 5 managers, 10 employees each, schedules, leave, OT approvals, and attendance records
Run: python seed_past_month.py
"""

import asyncio
from datetime import datetime, date, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.database import engine, DATABASE_URL
from app.models import (
    User, UserType, Department, Manager, Employee, Role, Shift, 
    Schedule, Attendance, OvertimeRequest, OvertimeStatus, CheckInOut,
    LeaveRequest, LeaveStatus
)
from app.auth import get_password_hash


async def seed_past_month_data():
    print("🌱 Starting comprehensive mock data seeding (Past One Month)...")
    
    # Create async session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # ===== DEPARTMENTS =====
            print("\n📍 Creating 5 departments...")
            departments = []
            dept_names = ["IT", "HR", "Finance", "Operations", "Sales"]
            
            for i, dept_name in enumerate(dept_names, 1):
                dept = Department(
                    dept_id=f"D{i}",
                    name=f"{dept_name} Department",
                    description=f"Department for {dept_name}",
                    is_active=True
                )
                session.add(dept)
                departments.append(dept)
            
            await session.flush()
            print(f"✅ Created {len(departments)} departments")

            # ===== MANAGERS (1 per department) =====
            print("\n👔 Creating 5 managers...")
            managers = []
            manager_data = [
                ("manager1", "manager@company.com", "Manager 1", "manager123"),
                ("manager2", "manager2@company.com", "Manager 2", "manager123"),
                ("manager3", "manager3@company.com", "Manager 3", "manager123"),
                ("manager4", "manager4@company.com", "Manager 4", "manager123"),
                ("manager5", "manager5@company.com", "Manager 5", "manager123"),
            ]
            
            for i, (username, email, fullname, password) in enumerate(manager_data):
                manager_user = User(
                    username=username,
                    email=email,
                    hashed_password=get_password_hash(password),
                    full_name=fullname,
                    user_type=UserType.MANAGER,
                    is_active=True
                )
                session.add(manager_user)
                await session.flush()
                
                manager_record = Manager(
                    user_id=manager_user.id,
                    department_id=departments[i].id,
                    is_active=True
                )
                session.add(manager_record)
                managers.append((manager_user, manager_record))
            
            await session.flush()
            print(f"✅ Created {len(managers)} managers")

            # ===== ROLES =====
            print("\n🎯 Creating roles...")
            roles = []
            role_configs = [
                ("Developer", "Software Developer", 50),
                ("Team Lead", "Team Lead", 60),
                ("Analyst", "Data Analyst", 50),
                ("Designer", "UI/UX Designer", 45),
            ]
            
            for dept in departments:
                for role_name, description, priority in role_configs:
                    role = Role(
                        name=role_name,
                        description=description,
                        department_id=dept.id,
                        priority=priority,
                        break_minutes=60,
                        weekend_required=False
                    )
                    session.add(role)
                    roles.append(role)
            
            await session.flush()
            print(f"✅ Created {len(roles)} roles across all departments")

            # ===== SHIFTS =====
            print("\n⏰ Creating shifts...")
            shifts = []
            shift_configs = [
                ("Morning", "09:00", "18:00", 50, 1, 5),
                ("Afternoon", "12:00", "21:00", 40, 1, 5),
                ("Evening", "17:00", "02:00", 30, 1, 5),
            ]
            
            for dept in departments:
                dept_roles = [r for r in roles if r.department_id == dept.id]
                if dept_roles:
                    for shift_name, start_time, end_time, priority, min_emp, max_emp in shift_configs:
                        shift = Shift(
                            role_id=dept_roles[0].id,
                            name=shift_name,
                            start_time=start_time,
                            end_time=end_time,
                            priority=priority,
                            min_emp=min_emp,
                            max_emp=max_emp
                        )
                        session.add(shift)
                        shifts.append(shift)
            
            await session.flush()
            print(f"✅ Created {len(shifts)} shifts")

            # ===== EMPLOYEES (10 per manager) =====
            print("\n👥 Creating 50 employees (10 per manager)...")
            employees = []
            employee_id_counter = 1000
            
            for manager_idx, (manager_user, manager_record) in enumerate(managers):
                dept = departments[manager_idx]
                
                for emp_idx in range(10):
                    emp_num = manager_idx * 10 + emp_idx + 1
                    emp_id_str = f"E{emp_num:04d}"
                    
                    # Create employee user
                    emp_user = User(
                        username=f"emp{emp_num}",
                        email=f"emp{emp_num}@company.com",
                        hashed_password=get_password_hash("emp123"),
                        full_name=f"Employee {emp_num}",
                        user_type=UserType.EMPLOYEE,
                        is_active=True
                    )
                    session.add(emp_user)
                    await session.flush()
                    
                    # Create employee record
                    role = [r for r in roles if r.department_id == dept.id][emp_idx % 4]
                    employee = Employee(
                        user_id=emp_user.id,
                        employee_id=emp_id_str,
                        department_id=dept.id,
                        first_name=f"Employee",
                        last_name=f"{emp_num}",
                        email=f"emp{emp_num}@company.com",
                        daily_max_hours=8,
                        is_active=True
                    )
                    session.add(employee)
                    employees.append(employee)
            
            await session.flush()
            print(f"✅ Created {len(employees)} employees")

            # ===== PAST MONTH DATA (30 days back) =====
            print("\n📅 Creating schedules for past 30 days...")
            today = date.today()
            past_30_days = [today - timedelta(days=i) for i in range(30, 0, -1)]
            
            schedules_created = 0
            check_ins_created = 0
            attendances_created = 0
            leaves_created = 0
            ot_approvals_created = 0
            
            for day in past_30_days:
                # Skip weekends (optional)
                if day.weekday() >= 5:  # Saturday and Sunday
                    continue
                
                # Create schedules for all employees
                for emp_idx, employee in enumerate(employees):
                    if emp_idx % 3 == 2:  # Skip some employees (leave day)
                        # Create leave request
                        leave = LeaveRequest(
                            employee_id=employee.id,
                            start_date=day,
                            end_date=day,
                            leave_type="Sick" if emp_idx % 2 == 0 else "Personal",
                            reason="Sick leave" if emp_idx % 2 == 0 else "Personal leave",
                            status=LeaveStatus.APPROVED,
                            manager_id=managers[emp_idx % len(managers)][1].id
                        )
                        session.add(leave)
                        leaves_created += 1
                        continue
                    
                    # Get appropriate role and shift
                    dept_roles = [r for r in roles if r.department_id == employee.department_id]
                    if not dept_roles:
                        continue
                    
                    role = dept_roles[emp_idx % len(dept_roles)]
                    
                    # Create schedule
                    schedule = Schedule(
                        employee_id=employee.id,
                        department_id=employee.department_id,
                        role_id=role.id,
                        date=day,
                        start_time="09:00",
                        end_time="18:00",
                        status="scheduled"
                    )
                    session.add(schedule)
                    schedules_created += 1
            
            await session.flush()
            print(f"✅ Created {schedules_created} schedules")
            print(f"✅ Created {leaves_created} leave records")

            # ===== OT APPROVALS =====
            print("\n⏳ Creating OT approvals (20% of working days)...")
            
            schedules = await session.execute(select(Schedule))
            all_schedules = schedules.scalars().all()
            
            ot_approval_indices = set()
            import random
            for _ in range(max(1, len(all_schedules) // 5)):  # 20% of schedules
                ot_approval_indices.add(random.randint(0, len(all_schedules) - 1))
            
            for idx in ot_approval_indices:
                schedule = all_schedules[idx]
                
                # Get manager for this employee's department
                manager_for_dept = [m for m in managers if departments[managers.index(m)].id == schedule.department_id]
                if not manager_for_dept:
                    continue
                
                manager_user, _ = manager_for_dept[0]
                
                # Create OT approval
                ot_hours = random.choice([1.0, 1.5, 2.0])
                ot_req = OvertimeRequest(
                    employee_id=schedule.employee_id,
                    request_date=schedule.date,
                    from_time="18:00",
                    to_time=f"{18 + int(ot_hours)}:{30 if ot_hours % 1 == 0.5 else 0:02d}",
                    request_hours=ot_hours,
                    reason="Work requirement",
                    status=OvertimeStatus.APPROVED,
                    manager_id=manager_user.id,
                    approved_at=datetime.now(),
                    manager_notes="Approved"
                )
                session.add(ot_req)
                ot_approvals_created += 1
            
            await session.flush()
            print(f"✅ Created {ot_approvals_created} OT approvals")

            # ===== CHECK-IN/CHECK-OUT & ATTENDANCE =====
            print("\n✍️  Creating check-in/check-out and attendance records...")
            
            schedules = await session.execute(select(Schedule).order_by(Schedule.date))
            all_schedules = schedules.scalars().all()
            
            for schedule in all_schedules:
                # Generate random check-in time (5-15 min before scheduled start)
                base_time = datetime.strptime("09:00", "%H:%M").time()
                check_in_minute_offset = random.randint(5, 15)
                check_in_time = datetime.combine(schedule.date, base_time) - timedelta(minutes=check_in_minute_offset)
                
                # Get OT approval for this day if exists
                ot_req = await session.execute(
                    select(OvertimeRequest).filter(
                        OvertimeRequest.employee_id == schedule.employee_id,
                        OvertimeRequest.request_date == schedule.date,
                        OvertimeRequest.status == OvertimeStatus.APPROVED
                    )
                )
                ot_record = ot_req.scalar_one_or_none()
                
                # Generate checkout time
                if ot_record:
                    # If OT approved, checkout might be during OT window
                    checkout_offset = random.choice([0, 30, 60])  # 0-1hr into OT
                    checkout_time = check_in_time + timedelta(hours=9, minutes=checkout_offset)
                else:
                    # Normal checkout after 9 hours
                    checkout_time = check_in_time + timedelta(hours=9)
                
                # Create check-in record
                check_in = CheckInOut(
                    employee_id=schedule.employee_id,
                    schedule_id=schedule.id,
                    date=schedule.date,
                    check_in_time=check_in_time,
                    check_out_time=checkout_time,
                    check_in_status="on-time" if check_in_minute_offset <= 10 else "slightly-late",
                    location="Office"
                )
                session.add(check_in)
                await session.flush()
                check_ins_created += 1
                
                # Create attendance record
                total_minutes = (checkout_time - check_in_time).total_seconds() / 60
                break_minutes = 60
                worked_minutes = max(0, total_minutes - break_minutes)
                worked_hours = worked_minutes / 60
                
                # Calculate OT
                overtime_hours = 0.0
                if ot_record and worked_hours > 8:
                    actual_ot = worked_hours - 8
                    overtime_hours = min(actual_ot, ot_record.request_hours)
                
                attendance = Attendance(
                    employee_id=schedule.employee_id,
                    schedule_id=schedule.id,
                    date=schedule.date,
                    in_time=check_in_time.strftime("%H:%M"),
                    out_time=checkout_time.strftime("%H:%M"),
                    status="onTime",
                    worked_hours=round(worked_hours, 2),
                    break_minutes=break_minutes,
                    overtime_hours=round(overtime_hours, 2)
                )
                session.add(attendance)
                attendances_created += 1
            
            await session.commit()
            print(f"✅ Created {check_ins_created} check-in records")
            print(f"✅ Created {attendances_created} attendance records with OT calculations")

            # ===== SUMMARY =====
            print("\n" + "="*60)
            print("🎉 MOCK DATA SEEDING COMPLETE!")
            print("="*60)
            print(f"\n📊 Summary:")
            print(f"  • Departments: 5")
            print(f"  • Managers: 5")
            print(f"  • Employees: 50 (10 per manager)")
            print(f"  • Roles: {len(roles)}")
            print(f"  • Shifts: {len(shifts)}")
            print(f"  • Schedules: {schedules_created}")
            print(f"  • Leave Records: {leaves_created}")
            print(f"  • OT Approvals: {ot_approvals_created}")
            print(f"  • Check-In Records: {check_ins_created}")
            print(f"  • Attendance Records: {attendances_created}")
            print(f"  • Date Range: Past 30 days (excluding weekends)")

            print(f"\n🔐 Manager Login Details:")
            print(f"  Manager 1: Username: manager1, Password: manager123")
            print(f"  Manager 2: Username: manager2, Password: manager123")
            print(f"  Manager 3: Username: manager3, Password: manager123")
            print(f"  Manager 4: Username: manager4, Password: manager123")
            print(f"  Manager 5: Username: manager5, Password: manager123")
            
            print(f"\n👥 Sample Employee Login Details:")
            print(f"  Employee 1: Username: emp1, Password: emp123")
            print(f"  Employee 2: Username: emp2, Password: emp123")
            print(f"  ... (emp1 through emp50)")
            
            print(f"\n💡 Features Included:")
            print(f"  ✅ Past one month of data")
            print(f"  ✅ Multiple managers and employees")
            print(f"  ✅ Scheduled shifts for working days")
            print(f"  ✅ Leave records for some employees")
            print(f"  ✅ OT approvals (20% of working days)")
            print(f"  ✅ Check-in/check-out with varied times")
            print(f"  ✅ Attendance records with OT calculation")
            print(f"  ✅ OT capped by approved amount")
            
        except Exception as e:
            print(f"\n❌ Error during seeding: {str(e)}")
            import traceback
            traceback.print_exc()
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed_past_month_data())
