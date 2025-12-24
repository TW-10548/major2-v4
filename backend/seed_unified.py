#!/usr/bin/env python
"""
UNIFIED COMPREHENSIVE MOCK DATA SEEDING SCRIPT
================================================
Creates complete test data:
- 5 Departments
- 5 Managers (1 per department)
- 50 Employees (10 per manager)
- Roles (4 per department)
- Shifts (3 per department)
- Schedules (current month)
- Leave Requests (approved & pending)
- Comp-Off Tracking (earned & used)
- Attendance Records (with check-in/check-out)
- Overtime Requests (approved & pending)

Run: python seed_unified.py
"""

import asyncio
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.database import engine, DATABASE_URL
from app.models import (
    User, UserType, Department, Manager, Employee, Role, Shift, 
    Schedule, Attendance, OvertimeRequest, OvertimeStatus, CheckInOut,
    LeaveRequest, LeaveStatus, CompOffRequest, CompOffTracking, CompOffDetail
)
from app.auth import get_password_hash


async def seed_unified_data():
    """Create comprehensive mock data for all features"""
    print("🌱 UNIFIED COMPREHENSIVE MOCK DATA SEEDING")
    print("=" * 70)
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # ===== 0. CLEAR EXISTING DATA =====
            print("\n🧹 Clearing existing data...")
            tables_to_clear = [
                'comp_off_details', 'comp_off_tracking', 'comp_off_requests',
                'overtime_worked', 'overtime_requests', 'attendance', 'check_ins',
                'schedules', 'messages', 'notifications', 'shifts', 'roles',
                'employees', 'managers', 'departments', 'users'
            ]
            for table in tables_to_clear:
                try:
                    await session.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                    await session.commit()
                except Exception as e:
                    await session.rollback()
            print("✅ Database cleared")
            
            # ===== 1. CREATE DEPARTMENTS =====
            print("\n📍 Creating departments...")
            departments = []
            dept_configs = [
                ("D1", "IT Department", "Information Technology"),
                ("D2", "HR Department", "Human Resources"),
                ("D3", "Finance Department", "Finance & Accounting"),
                ("D4", "Operations Department", "Operations & Logistics"),
                ("D5", "Sales Department", "Sales & Marketing"),
            ]
            
            for dept_id, name, description in dept_configs:
                dept = Department(
                    dept_id=dept_id,
                    name=name,
                    description=description,
                    is_active=True
                )
                session.add(dept)
                departments.append(dept)
            
            await session.flush()
            print(f"✅ Created {len(departments)} departments")
            
            # ===== 2a. CREATE ADMIN USER =====
            print("\n👑 Creating admin user...")
            admin_user = User(
                username="admin",
                email="admin@company.com",
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                user_type=UserType.ADMIN,
                is_active=True
            )
            session.add(admin_user)
            await session.flush()
            print("✅ Created admin user")
            
            # ===== 2b. CREATE MANAGERS =====
            print("\n👔 Creating managers...")
            managers = []
            manager_configs = [
                ("manager1", "manager1@company.com", "Manager One"),
                ("manager2", "manager2@company.com", "Manager Two"),
                ("manager3", "manager3@company.com", "Manager Three"),
                ("manager4", "manager4@company.com", "Manager Four"),
                ("manager5", "manager5@company.com", "Manager Five"),
            ]
            
            for i, (username, email, full_name) in enumerate(manager_configs):
                user = User(
                    username=username,
                    email=email,
                    hashed_password=get_password_hash("manager123"),
                    full_name=full_name,
                    user_type=UserType.MANAGER,
                    is_active=True
                )
                session.add(user)
                await session.flush()
                
                manager = Manager(
                    user_id=user.id,
                    department_id=departments[i].id,
                    is_active=True
                )
                session.add(manager)
                managers.append((user, manager))
            
            await session.flush()
            print(f"✅ Created {len(managers)} managers")
            
            # ===== 3. CREATE ROLES =====
            print("\n🎯 Creating roles...")
            roles = {}
            role_configs = [
                ("Developer", "Software Developer", 60),
                ("Team Lead", "Team Lead", 70),
                ("Analyst", "Data Analyst", 50),
                ("Coordinator", "Project Coordinator", 55),
            ]
            
            for dept in departments:
                roles[dept.id] = []
                for role_name, description, priority in role_configs:
                    role = Role(
                        name=role_name,
                        description=description,
                        department_id=dept.id,
                        priority=priority,
                        break_minutes=60,  # 1 hour break per shift
                        is_active=True
                    )
                    session.add(role)
                    roles[dept.id].append(role)
            
            await session.flush()
            total_roles = sum(len(r) for r in roles.values())
            print(f"✅ Created {total_roles} roles ({len(role_configs)} per department)")
            
            # ===== 4. CREATE SHIFTS =====
            print("\n⏰ Creating shifts...")
            shifts = {}
            shift_configs = [
                ("Morning Shift", "09:00", "18:00", 50, 1, 5),      # 9 hours (9-18), 1hr break = 8hrs work
                ("Afternoon Shift", "13:00", "22:00", 40, 1, 4),    # 9 hours (13-22), 1hr break = 8hrs work
                ("Evening Shift", "17:00", "02:00", 30, 1, 3),      # 9 hours (17-02), 1hr break = 8hrs work
            ]
            
            for dept in departments:
                shifts[dept.id] = []
                for shift_name, start_time, end_time, priority, min_emp, max_emp in shift_configs:
                    shift = Shift(
                        name=shift_name,
                        start_time=start_time,
                        end_time=end_time,
                        role_id=roles[dept.id][0].id,  # Assign to first role
                        priority=priority,
                        min_emp=min_emp,
                        max_emp=max_emp,
                        is_active=True,
                        # Schedule config: enabled on Mon-Fri (0=Mon, 4=Fri)
                        schedule_config={
                            "Monday": {"enabled": True},
                            "Tuesday": {"enabled": True},
                            "Wednesday": {"enabled": True},
                            "Thursday": {"enabled": True},
                            "Friday": {"enabled": True},
                            "Saturday": {"enabled": False},
                            "Sunday": {"enabled": False},
                        }
                    )
                    session.add(shift)
                    shifts[dept.id].append(shift)
            
            await session.flush()
            total_shifts = sum(len(s) for s in shifts.values())
            print(f"✅ Created {total_shifts} shifts ({len(shift_configs)} per department)")
            
            # ===== 5. CREATE EMPLOYEES =====
            print("\n👥 Creating employees...")
            employees = []
            emp_counter = 1  # Global counter for unique employee IDs
            
            for manager_user, manager in managers:
                dept_id = manager.department_id
                for emp_num in range(1, 11):  # 10 employees per manager
                    username = f"emp_{manager_user.username}_{emp_num}"
                    email = f"emp{emp_num}@{manager_user.username.replace('_', '')}.com"
                    first_name = f"Employee {emp_num}"
                    last_name = f"({manager_user.full_name})"
                    
                    user = User(
                        username=username,
                        email=email,
                        hashed_password=get_password_hash("emp123"),
                        full_name=f"{first_name} {last_name}",
                        user_type=UserType.EMPLOYEE,
                        is_active=True
                    )
                    session.add(user)
                    await session.flush()
                    
                    employee = Employee(
                        user_id=user.id,
                        employee_id=f"EMP{emp_counter:03d}",  # Global counter for unique IDs
                        first_name=first_name,
                        last_name=last_name,
                        email=email,
                        phone=f"+81-90-{1000 + emp_counter:04d}-{emp_counter:04d}",
                        department_id=dept_id,
                        role_id=roles[dept_id][emp_num % len(roles[dept_id])].id,  # Distribute across roles
                        hire_date=date.today() - timedelta(days=365),
                        weekly_hours=40.0,  # 5 shifts × 8 hours
                        daily_max_hours=8.0,
                        shifts_per_week=5,
                        paid_leave_per_year=10,
                        is_active=True
                    )
                    session.add(employee)
                    employees.append(employee)
                    emp_counter += 1
            
            await session.flush()
            print(f"✅ Created {len(employees)} employees")
            
            # ===== 6. CREATE SCHEDULES (Current Month) =====
            print("\n📅 Creating schedules...")
            today = date.today()
            month_start = today.replace(day=1)
            if today.month == 12:
                month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
            
            schedules_created = 0
            current_date = month_start
            
            while current_date <= month_end:
                weekday = current_date.weekday()
                # Only assign shifts Mon-Fri (0-4)
                if weekday < 5:
                    for emp_idx, emp in enumerate(employees):
                        # Distribute employees across shifts
                        dept_shifts = shifts[emp.department_id]
                        shift = dept_shifts[emp_idx % len(dept_shifts)]
                        
                        schedule = Schedule(
                            employee_id=emp.id,
                            department_id=emp.department_id,
                            role_id=shift.role_id,
                            shift_id=shift.id,
                            date=current_date,
                            start_time=shift.start_time,
                            end_time=shift.end_time,
                            status="scheduled"
                        )
                        session.add(schedule)
                        schedules_created += 1
                
                current_date += timedelta(days=1)
            
            await session.flush()
            print(f"✅ Created {schedules_created} schedules")
            
            # ===== 7. CREATE LEAVE REQUESTS =====
            print("\n🏖️  Creating leave requests...")
            leave_created = 0
            
            for emp in employees[:10]:  # Create leaves for first 10 employees
                # Approved leave
                leave = LeaveRequest(
                    employee_id=emp.id,
                    leave_type="sick",
                    start_date=today + timedelta(days=5),
                    end_date=today + timedelta(days=6),
                    duration_type="full_day",
                    reason="Medical checkup",
                    status=LeaveStatus.APPROVED
                )
                session.add(leave)
                leave_created += 1
                
                # Pending leave
                leave_pending = LeaveRequest(
                    employee_id=emp.id,
                    leave_type="annual",
                    start_date=today + timedelta(days=15),
                    end_date=today + timedelta(days=17),
                    duration_type="full_day",
                    reason="Vacation",
                    status=LeaveStatus.PENDING
                )
                session.add(leave_pending)
                leave_created += 1
            
            await session.flush()
            print(f"✅ Created {leave_created} leave requests")
            
            # ===== 8. CREATE COMP-OFF TRACKING =====
            print("\n💰 Creating comp-off tracking...")
            comp_off_created = 0
            
            for emp in employees[:15]:  # Comp-off for first 15 employees
                # Comp-off tracking record
                comp_off_tracking = CompOffTracking(
                    employee_id=emp.id,
                    earned_days=2,  # 2 days earned
                    used_days=0,  # Not used yet
                    available_days=2,
                    earned_date=today - timedelta(days=10)
                )
                session.add(comp_off_tracking)
                comp_off_created += 1
                
                # Comp-off request (taken)
                comp_off_req = CompOffRequest(
                    employee_id=emp.id,
                    comp_off_date=today + timedelta(days=10),
                    reason="Compensatory off for weekend work",
                    status=LeaveStatus.APPROVED
                )
                session.add(comp_off_req)
                comp_off_created += 1
            
            await session.flush()
            print(f"✅ Created {comp_off_created} comp-off records")
            
            # ===== 9. CREATE OVERTIME REQUESTS =====
            print("\n⚡ Creating overtime requests...")
            ot_created = 0
            
            for emp in employees[:20]:  # Overtime for first 20 employees
                # Approved overtime
                ot = OvertimeRequest(
                    employee_id=emp.id,
                    request_date=today - timedelta(days=3),
                    from_time="18:00",
                    to_time="20:00",
                    request_hours=2.0,
                    reason="Project deadline",
                    status=OvertimeStatus.APPROVED,
                    manager_id=managers[0][0].id
                )
                session.add(ot)
                ot_created += 1
                
                # Pending overtime
                ot_pending = OvertimeRequest(
                    employee_id=emp.id,
                    request_date=today - timedelta(days=1),
                    from_time="17:00",
                    to_time="18:30",
                    request_hours=1.5,
                    reason="System maintenance",
                    status=OvertimeStatus.PENDING
                )
                session.add(ot_pending)
                ot_created += 1
            
            await session.flush()
            print(f"✅ Created {ot_created} overtime requests")
            
            # ===== 10. CREATE ATTENDANCE RECORDS =====
            print("\n✅ Creating attendance records...")
            attendance_created = 0
            
            for emp in employees[:30]:  # Attendance for first 30 employees
                # Last 5 working days
                for days_back in range(1, 6):
                    check_date = today - timedelta(days=days_back)
                    if check_date.weekday() < 5:  # Only weekdays
                        
                        # Check-in/check-out record
                        check_in = CheckInOut(
                            employee_id=emp.id,
                            date=check_date,
                            check_in_time=datetime.combine(check_date, 
                                                          datetime.strptime("09:00", "%H:%M").time()),
                            check_out_time=datetime.combine(check_date, 
                                                           datetime.strptime("18:00", "%H:%M").time()),
                            location="Office"
                        )
                        session.add(check_in)
                        
                        # Attendance record
                        attendance = Attendance(
                            employee_id=emp.id,
                            date=check_date,
                            status="onTime",
                            in_time="09:00",
                            out_time="18:00",
                            break_minutes=60,
                            worked_hours=8.0,
                            overtime_hours=0.0,
                            notes="Regular shift"
                        )
                        session.add(attendance)
                        attendance_created += 2
            
            await session.flush()
            print(f"✅ Created {attendance_created} attendance records")
            
            # ===== COMMIT TRANSACTION =====
            await session.commit()
            print("\n" + "=" * 70)
            print("✅ UNIFIED DATA SEEDING COMPLETED SUCCESSFULLY")
            print("=" * 70)
            print(f"""
📊 SUMMARY:
  • Departments: {len(departments)}
  • Managers: {len(managers)}
  • Employees: {len(employees)}
  • Roles: {total_roles}
  • Shifts: {total_shifts}
  • Schedules: {schedules_created}
  • Leave Requests: {leave_created}
  • Comp-Off Records: {comp_off_created}
  • Overtime Requests: {ot_created}
  • Attendance Records: {attendance_created}

🔐 LOGIN CREDENTIALS:
  Admin: admin / admin123
  Manager: manager1 / manager123
  Employee: emp_manager1_1 / emp123
""")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            raise


async def main():
    """Main entry point"""
    try:
        await seed_unified_data()
    except Exception as e:
        print(f"Fatal error: {e}")
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
