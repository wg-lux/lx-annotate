#!/usr/bin/env python3
"""
Test script for patient pseudonym generation.

This script demonstrates the server-side pseudonym generation functionality
by creating a test patient and generating a pseudonym for it.
"""

import os
import sys
import pytest
import django
from datetime import date

from django.db import transaction
from endoreg_db.models.administration.center.center import Center
from endoreg_db.models.administration.person.patient.patient import Patient
from endoreg_db.models.other.gender import Gender
from endoreg_db.services.pseudonym_service import (
    generate_patient_pseudonym,
    validate_patient_for_pseudonym,
)

# Add the project root to the path
sys.path.insert(0, "/home/admin/dev/lx-annotate")
sys.path.insert(0, "/home/admin/dev/lx-annotate/libs/endoreg-db")

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "lx_annotate.settings")
django.setup()


@pytest.mark.django_db
def test_pseudonym_generation():
    """Test the pseudonym generation functionality."""
    print("=== Patient Pseudonym Generation Test ===\n")

    # Get or create required objects
    try:
        gender = Gender.objects.get(name="male")
    except Gender.DoesNotExist:
        gender = Gender.objects.create(name="male")
        print(f"Created gender: {gender}")

    try:
        center = Center.objects.first()
        if not center:
            center = Center.objects.create(name="Test Center")
            print(f"Created center: {center}")
    except Exception:
        center = Center.objects.create(name="Test Center")
        print(f"Created center: {center}")

    # Create test patient
    with transaction.atomic():
        patient = Patient.objects.create(
            first_name="Claus",
            last_name="Cleber",
            dob=date(1989, 3, 4),
            gender=gender,
            center=center,
        )
        print(f"Created test patient: {patient}")

        # Validate patient has required fields
        missing_fields = validate_patient_for_pseudonym(patient)
        if missing_fields:
            print(f"❌ Missing required fields: {missing_fields}")
            return False
        else:
            print("✅ Patient has all required fields for pseudonym generation")

        # Generate pseudonym
        try:
            patient_hash, persisted = generate_patient_pseudonym(patient)
            print("✅ Pseudonym generated successfully!")
            print(f"   Hash: {patient_hash}")
            print(f"   Persisted: {persisted}")

            # Verify it was saved to the patient
            patient.refresh_from_db()
            print(f"   Patient.patient_hash: {patient.patient_hash}")

            # Test deterministic behavior - generate again
            patient_hash_2, persisted_2 = generate_patient_pseudonym(patient)
            if patient_hash == patient_hash_2:
                print("✅ Pseudonym generation is deterministic (same hash returned)")
            else:
                print("❌ Pseudonym generation is not deterministic!")
                return False

            return True

        except Exception as e:
            print(f"❌ Error generating pseudonym: {e}")
            return False

        finally:
            # Clean up test data
            patient.delete()
            print("🧹 Cleaned up test patient")


@pytest.mark.django_db
def test_missing_fields():
    """Test validation with missing required fields."""
    print("\n=== Missing Fields Validation Test ===\n")

    # Create patient with missing required fields
    patient = Patient.objects.create(
        first_name="Test",
        last_name="Patient",
        # Missing: dob, center
    )

    try:
        missing_fields = validate_patient_for_pseudonym(patient)
        print(f"Missing fields detected: {missing_fields}")

        if "dob" in missing_fields and "center" in missing_fields:
            print("✅ Validation correctly identified missing fields")
            return True
        else:
            print("❌ Validation did not correctly identify missing fields")
            return False

    finally:
        patient.delete()
        print("🧹 Cleaned up test patient")


if __name__ == "__main__":
    print("Testing patient pseudonym generation functionality...\n")

    success1 = test_pseudonym_generation()
    success2 = test_missing_fields()

    if success1 and success2:
        print("\n✅ All tests passed! Pseudonym generation is working correctly.")
        print("\nYou can now use the REST API endpoint:")
        print("POST /api/patients/{id}/pseudonym/")
        exit(0)
    else:
        print("\n❌ Some tests failed!")
        exit(1)
