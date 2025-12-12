#!/usr/bin/env python3
"""
Test the HTTP API endpoint for patient pseudonym generation.
"""

import os
import sys
import django
import requests
import json

# Add the project root to the path
sys.path.insert(0, '/home/admin/dev/lx-annotate')
sys.path.insert(0, '/home/admin/dev/lx-annotate/libs/endoreg-db')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings')
django.setup()

from datetime import date
from django.db import transaction
from endoreg_db.models.administration.person.patient.patient import Patient
from endoreg_db.models.other.gender import Gender
from endoreg_db.models.administration.center.center import Center


def test_api_endpoint():
    """Test the REST API endpoint."""
    print("=== HTTP API Endpoint Test ===\n")
    
    # Get or create required objects
    try:
        gender = Gender.objects.get(name='male')
    except Gender.DoesNotExist:
        gender = Gender.objects.create(name='male')
    
    try:
        center = Center.objects.first()
        if not center:
            center = Center.objects.create(name='Test Center')
    except Exception:
        center = Center.objects.create(name='Test Center')
    
    # Create test patient
    with transaction.atomic():
        patient = Patient.objects.create(
            first_name='Hans',
            last_name='Müller',
            dob=date(1975, 8, 15),
            gender=gender,
            center=center
        )
        print(f"Created test patient: {patient} (ID: {patient.id})")
        
        try:
            # Test the API endpoint
            api_url = f'http://localhost:8000/api/patients/{patient.id}/pseudonym/'
            print(f"Testing API endpoint: {api_url}")
            
            response = requests.post(api_url, headers={
                'Content-Type': 'application/json'
            })
            
            if response.status_code == 200:
                data = response.json()
                print("✅ API endpoint works!")
                print(f"   Response: {json.dumps(data, indent=2)}")
                
                # Verify the patient was updated
                patient.refresh_from_db()
                if patient.patient_hash == data['patient_hash']:
                    print("✅ Patient hash was persisted correctly")
                    return True
                else:
                    print("❌ Patient hash mismatch")
                    return False
            else:
                print(f"❌ API endpoint failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            print("❌ Could not connect to Django server. Make sure 'python manage.py runserver' is running.")
            return False
        except Exception as e:
            print(f"❌ Error testing API: {e}")
            return False
        
        finally:
            # Clean up test data
            patient.delete()
            print("🧹 Cleaned up test patient")


if __name__ == '__main__':
    print("Testing HTTP API endpoint for patient pseudonym generation...\n")
    
    success = test_api_endpoint()
    
    if success:
        print("\n✅ API endpoint test passed!")
        print("\nThe frontend can now call:")
        print("POST /api/patients/{id}/pseudonym/")
        exit(0)
    else:
        print("\n❌ API endpoint test failed!")
        print("\nMake sure Django server is running: python manage.py runserver")
        exit(1)
