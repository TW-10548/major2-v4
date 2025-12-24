#!/usr/bin/env python3
"""
Debug script to test check-in endpoint and diagnose issues
"""
import asyncio
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.database import DATABASE_URL
from app.models import User, Employee, Schedule

async def test_check_in_prerequisites():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            print("=" * 60)
            print("CHECK-IN DIAGNOSTIC REPORT")
            print("=" * 60)
            
            # Get all active users
            result = await session.execute(
                select(User).filter(User.is_active == True)
            )
            users = result.scalars().all()
            print(f"\n✅ Found {len(users)} active users")
            
            if not users:
                print("❌ No active users found!")
                return
            
            for user in users[:5]:  # Check first 5
                print(f"\n  User: {user.username} (ID: {user.id}, Type: {user.user_type})")
                
                # Check if employee exists for this user
                emp_result = await session.execute(
                    select(Employee).filter(Employee.user_id == user.id)
                )
                employee = emp_result.scalar_one_or_none()
                
                if not employee:
                    print(f"    ❌ NO EMPLOYEE RECORD FOR THIS USER")
                else:
                    print(f"    ✅ Employee: {employee.name} (ID: {employee.id})")
                    
                    # Check if has schedule for today
                    today = date.today()
                    sched_result = await session.execute(
                        select(Schedule).filter(
                            Schedule.employee_id == employee.id,
                            Schedule.date == today
                        )
                    )
                    schedule = sched_result.scalar_one_or_none()
                    
                    if not schedule:
                        print(f"    ❌ NO SCHEDULE FOR TODAY ({today})")
                    else:
                        print(f"    ✅ Shift: {schedule.start_time} - {schedule.end_time}")
            
            print("\n" + "=" * 60)
            print("RECOMMENDATION:")
            print("=" * 60)
            print("""
If you see "NO EMPLOYEE RECORD" above, you need to:
1. Create an employee record for the user via the admin panel, OR
2. Run: python3 create_test_employee_simple.py

If you see "NO SCHEDULE FOR TODAY", you need to:
1. Create a schedule for today via the admin panel, OR
2. Run: python3 generate_november_2025_data.py (or similar schedule generator)
            """)
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_check_in_prerequisites())
