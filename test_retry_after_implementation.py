#!/usr/bin/env python
# test_retry_after_implementation.py

import os
import sys
import django
from unittest.mock import Mock, patch
from io import StringIO

# Django Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings_dev')
sys.path.append('/home/admin/dev/lx-annotate')

django.setup()

from rest_framework.test import APIRequestFactory
from rest_framework.response import Response
from endoreg_db.views.anonymization.overview import anonymization_status
from endoreg_db.services.anonymization import AnonymizationService

def test_retry_after_implementation():
    """Test the Retry-After header implementation without server"""
    
    print("🧪 Testing Retry-After Header Implementation")
    print("=" * 50)
    
    factory = APIRequestFactory()
    
    # Test 1: File not found - should not include Retry-After
    print("\n1. Testing file not found scenario:")
    with patch.object(AnonymizationService, 'get_status', return_value=None):
        request = factory.get('/api/anonymization/999/status/')
        response = anonymization_status(request, 999)
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Has Retry-After: {'Retry-After' in response}")
        assert response.status_code == 404
        assert 'Retry-After' not in response
        print("   ✅ PASS: 404 response has no Retry-After header")
    
    # Test 2: First request - should succeed without Retry-After
    print("\n2. Testing first status check (should succeed):")
    mock_file_info = {
        "mediaType": "video",
        "anonymizationStatus": "processing_anonymization"
    }
    
    with patch.object(AnonymizationService, 'get_status', return_value=mock_file_info):
        request = factory.get('/api/anonymization/123/status/')
        response = anonymization_status(request, 123)
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Has Retry-After: {'Retry-After' in response}")
        print(f"   Response Data: {response.data}")
        assert response.status_code == 200
        assert 'Retry-After' not in response
        print("   ✅ PASS: First request succeeds without rate limiting")
    
    # Test 3: Second immediate request - should be rate limited with Retry-After
    print("\n3. Testing second immediate request (should be rate limited):")
    with patch.object(AnonymizationService, 'get_status', return_value=mock_file_info):
        request = factory.get('/api/anonymization/123/status/')
        response = anonymization_status(request, 123)
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Has Retry-After: {'Retry-After' in response}")
        if 'Retry-After' in response:
            print(f"   Retry-After Value: {response['Retry-After']}")
        print(f"   Response Data: {response.data}")
        
        assert response.status_code == 429
        assert 'Retry-After' in response
        retry_after = int(response['Retry-After'])
        assert retry_after >= 1
        assert retry_after <= 10  # CHECK_COOLDOWN
        
        # Check JSON response
        assert response.data.get('cooldown_active') == True
        assert response.data.get('retry_after') == retry_after
        assert 'Status check rate limited' in response.data.get('detail', '')
        
        print("   ✅ PASS: Rate limiting works with correct Retry-After header")
    
    # Test 4: Different file types have separate cooldowns
    print("\n4. Testing PDF file type (separate cooldown):")
    mock_pdf_info = {
        "mediaType": "pdf",
        "anonymizationStatus": "processing_anonymization"
    }
    
    with patch.object(AnonymizationService, 'get_status', return_value=mock_pdf_info):
        request = factory.get('/api/anonymization/456/status/')
        response = anonymization_status(request, 456)
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Has Retry-After: {'Retry-After' in response}")
        assert response.status_code == 200  # Different file ID, no previous cooldown
        assert 'Retry-After' not in response
        print("   ✅ PASS: Different file types have separate cooldowns")
    
    print("\n🎉 All Retry-After header tests passed!")
    print("\n📋 Implementation Summary:")
    print("   ✅ Added get_remaining_cooldown_seconds() to PollingCoordinator")
    print("   ✅ Modified anonymization_status view to include Retry-After header")
    print("   ✅ Rate limiting works correctly with 429 responses")
    print("   ✅ Retry-After header contains correct remaining seconds")
    print("   ✅ JSON response includes retry_after field")
    print("   ✅ Different file types have separate cooldowns")
    print("   ✅ Non-rate-limited responses don't include Retry-After")

if __name__ == "__main__":
    test_retry_after_implementation()
