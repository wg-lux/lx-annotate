#!/usr/bin/env python
# manual_test_retry_after.py

import os
import sys
import django
import requests
import time

# Django Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings_dev')
sys.path.append('/home/admin/dev/lx-annotate')

django.setup()

def test_retry_after_functionality():
    """Manual test of the Retry-After header functionality"""
    
    # Test endpoint (adjust as needed)
    base_url = "http://localhost:8000"
    file_id = 999  # Use a test file ID
    url = f"{base_url}/api/anonymization/{file_id}/status/"
    
    print("Testing Retry-After header functionality...")
    print(f"Testing URL: {url}")
    print()
    
    try:
        # First request - should succeed
        print("1. First request (should be 200 or 404):")
        response1 = requests.get(url)
        print(f"   Status: {response1.status_code}")
        print(f"   Headers: {dict(response1.headers)}")
        if response1.status_code != 404:
            print(f"   Response: {response1.json()}")
        print()
        
        # Second request immediately - should be rate limited if file exists
        print("2. Second immediate request (should be 429 if file exists):")
        response2 = requests.get(url)
        print(f"   Status: {response2.status_code}")
        
        if response2.status_code == 429:
            print("✅ Rate limiting works!")
            print(f"   Retry-After header: {response2.headers.get('Retry-After', 'MISSING!')}")
            try:
                data = response2.json()
                print(f"   Response data: {data}")
                print(f"   Retry-after in JSON: {data.get('retry_after', 'MISSING!')}")
            except:
                print("   Could not parse JSON response")
        else:
            print(f"   Headers: {dict(response2.headers)}")
            print(f"   Response: {response2.text}")
            if response2.status_code == 404:
                print("   ℹ️  File not found - rate limiting not tested")
        print()
        
        # Wait and try again
        print("3. Waiting 3 seconds and trying again:")
        time.sleep(3)
        response3 = requests.get(url)
        print(f"   Status: {response3.status_code}")
        
        if response3.status_code == 429:
            retry_after = response3.headers.get('Retry-After')
            print(f"   Retry-After header: {retry_after}")
            print("   ℹ️  Still rate limited (cooldown may be longer than 3s)")
        else:
            print("   ✅ Rate limiting expired or different response")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Django dev server is running.")
        print("   Run: python manage.py runserver")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_retry_after_functionality()
