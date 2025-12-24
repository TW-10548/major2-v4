#!/usr/bin/env python3
"""
Migration script to add manager_id field to Manager table
"""

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Manager
from app.database import DATABASE_URL

async def migrate():
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        try:
            # Check if column already exists
            result = await db.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name='managers' AND column_name='manager_id'")
            )
            if result.scalar():
                print("✅ manager_id column already exists")
                return
            
            print("Adding manager_id column to managers table...")
            
            # Add the column
            await db.execute(
                text("ALTER TABLE managers ADD COLUMN manager_id VARCHAR(10) UNIQUE")
            )
            await db.commit()
            print("✅ Column added successfully")
            
            # Get all managers and assign manager_ids
            print("\nPopulating manager_id values...")
            result = await db.execute(text("SELECT id FROM managers ORDER BY id"))
            managers = result.fetchall()
            
            for manager in managers:
                manager_id_str = f"{manager[0]:03d}"  # Format as 3-digit: 001, 002, 003
                await db.execute(
                    text(f"UPDATE managers SET manager_id = '{manager_id_str}' WHERE id = {manager[0]}")
                )
                print(f"  Manager {manager[0]} -> {manager_id_str}")
            
            await db.commit()
            print("\n✅ Migration completed successfully!")
            print(f"✅ Created manager_ids for {len(managers)} managers")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error: {str(e)}")
            raise

if __name__ == "__main__":
    asyncio.run(migrate())
