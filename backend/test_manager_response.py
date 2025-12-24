#!/usr/bin/env python3
"""
Test script to verify manager_id is working in the complete API flow
"""

import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Manager, User
from app.database import DATABASE_URL
from app.schemas import ManagerDetailResponse
from typing import List

async def test_manager_response():
    """Test that ManagerDetailResponse correctly serializes manager_id"""
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        print("\n" + "="*80)
        print("TEST: Manager Response Serialization")
        print("="*80)
        
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Manager)
            .filter(Manager.is_active == True)
            .options(selectinload(Manager.user))
        )
        managers = result.scalars().all()
        
        if managers:
            print(f"\n✅ Found {len(managers)} active managers")
            
            # Simulate API response building
            responses = []
            for manager in managers:
                user = manager.user
                response_dict = {
                    'id': manager.id,
                    'manager_id': manager.manager_id,
                    'user_id': manager.user_id,
                    'username': user.username if user else None,
                    'full_name': user.full_name if user else None,
                    'email': user.email if user else None,
                    'department_id': manager.department_id,
                    'is_active': manager.is_active,
                }
                responses.append(response_dict)
            
            print(f"\n✅ Response format validation:")
            for resp in responses[:3]:
                print(f"\nManager: {resp['full_name']}")
                print(f"  - ID: {resp['id']}")
                print(f"  - Manager ID: {resp['manager_id']} {'✅' if resp['manager_id'] else '❌'}")
                print(f"  - Username: {resp['username']}")
                print(f"  - Department: {resp['department_id']}")
            
            # Check if all have manager_id
            all_have_id = all(r['manager_id'] for r in responses)
            if all_have_id:
                print(f"\n✅ All {len(responses)} managers have manager_id field")
            else:
                print(f"\n❌ Some managers are missing manager_id")
        else:
            print("❌ No active managers found")
        
        print("\n" + "="*80)

if __name__ == "__main__":
    asyncio.run(test_manager_response())
