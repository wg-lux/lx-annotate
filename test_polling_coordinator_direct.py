#!/usr/bin/env python
# test_polling_coordinator_direct.py

import os
import sys
import django
import time

# Django Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings_dev')
sys.path.append('/home/admin/dev/lx-annotate')

django.setup()

from endoreg_db.services.polling_coordinator import PollingCoordinator

def test_polling_coordinator():
    """Direct test of PollingCoordinator functionality"""
    
    print("Testing PollingCoordinator.get_remaining_cooldown_seconds()...")
    print()
    
    file_id = 12345
    file_type = "video"
    
    # Test 1: No previous check - should return 0
    print("1. Testing with no previous check:")
    remaining = PollingCoordinator.get_remaining_cooldown_seconds(file_id, file_type)
    print(f"   Remaining cooldown: {remaining} seconds")
    assert remaining == 0, f"Expected 0, got {remaining}"
    print("   ✅ PASS")
    print()
    
    # Test 2: Record a check and immediately test
    print("2. Recording a status check and testing immediately:")
    PollingCoordinator._record_status_check(file_id, file_type)
    remaining = PollingCoordinator.get_remaining_cooldown_seconds(file_id, file_type)
    print(f"   Remaining cooldown: {remaining} seconds")
    assert remaining > 0, f"Expected > 0, got {remaining}"
    assert remaining <= PollingCoordinator.CHECK_COOLDOWN, f"Expected <= {PollingCoordinator.CHECK_COOLDOWN}, got {remaining}"
    print("   ✅ PASS")
    print()
    
    # Test 3: Test can_check_status method behavior
    print("3. Testing can_check_status method:")
    can_check = PollingCoordinator.can_check_status(file_id, file_type)
    print(f"   Can check status: {can_check}")
    assert can_check == False, f"Expected False (cooldown active), got {can_check}"
    print("   ✅ PASS")
    print()
    
    # Test 4: Wait and test again
    print("4. Waiting 2 seconds and testing again:")
    time.sleep(2)
    remaining_after_wait = PollingCoordinator.get_remaining_cooldown_seconds(file_id, file_type)
    print(f"   Remaining cooldown after wait: {remaining_after_wait} seconds")
    assert remaining_after_wait < remaining, f"Expected {remaining_after_wait} < {remaining}"
    print("   ✅ PASS: Cooldown decreased over time")
    print()
    
    # Test 5: Different file type
    print("5. Testing different file type (PDF):")
    remaining_pdf = PollingCoordinator.get_remaining_cooldown_seconds(file_id, "pdf")
    print(f"   Remaining cooldown for PDF: {remaining_pdf} seconds")
    assert remaining_pdf == 0, f"Expected 0 for different file type, got {remaining_pdf}"
    print("   ✅ PASS: Different file types have separate cooldowns")
    print()
    
    print("🎉 All PollingCoordinator tests passed!")

if __name__ == "__main__":
    test_polling_coordinator()
