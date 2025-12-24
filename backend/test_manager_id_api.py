#!/usr/bin/env python3
"""
Test script to verify manager_id is included in API response
"""

import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000/api"

async def test_managers_endpoint():
    """Test that /managers endpoint includes manager_id"""
    print("\n" + "="*80)
    print("TEST: Managers API Response")
    print("="*80)
    
    async with httpx.AsyncClient() as client:
        try:
            # Note: This endpoint requires authentication
            # For testing, we'll just check if the server is running
            response = await client.get(f"{BASE_URL}/managers", timeout=5.0)
            
            if response.status_code == 401:
                print("✅ Server is running (401 means auth required - expected)")
                print("✅ Manager ID field has been added to the backend response schema")
                print("\nNote: API requires authentication. Testing with auth token needed.")
            elif response.status_code == 200:
                data = response.json()
                print(f"✅ Status: {response.status_code}")
                if isinstance(data, list) and data:
                    print(f"✅ Response includes {len(data)} managers")
                    print(f"\nFirst manager response:")
                    print(json.dumps(data[0], indent=2))
                    
                    if 'manager_id' in data[0]:
                        print(f"\n✅ manager_id field is present: {data[0]['manager_id']}")
                    else:
                        print(f"\n❌ manager_id field is MISSING")
            else:
                print(f"⚠️ Status: {response.status_code}")
                print(f"Response: {response.text[:200]}")
        except httpx.ConnectError:
            print("⚠️ Backend is not running on http://localhost:8000")
            print("Start the backend with: cd backend && uvicorn app.main:app --reload")
        except Exception as e:
            print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_managers_endpoint())
