"""
Patient Finding Classification Storage Backend Tests

Tests to validate that the backend API properly handles finding creation
with classifications and returns complete data structures.

These tests focus on the server-side handling of classification data
to ensure findings are stored with their classification choices.

@fileoverview Backend API tests for finding classification storage
@author LX-Annotate Development Team
"""

import pytest
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

from endoreg_db.models import (
    PatientFinding, 
    PatientExamination, 
    Finding, 
    FindingClassification,
    FindingClassificationChoice,
    PatientFindingClassification,
    Patient
)


class PatientFindingClassificationStorageTest(TestCase):
    """
    Test suite for validating patient finding classification storage workflow.
    
    These tests ensure that when a finding is created through the API with
    classification data, the classifications are properly stored and returned
    in subsequent API responses.
    """
    
    def setUp(self):
        """Set up test data for finding classification tests."""
        self.client = APIClient()
        
        # Create test patient
        self.patient = Patient.objects.create(
            firstName="Test",
            lastName="Patient"
        )
        
        # Create test patient examination
        self.patient_examination = PatientExamination.objects.create(
            patient=self.patient,
            examination_name="colonoscopy"
        )
        
        # Create test finding
        self.finding = Finding.objects.create(
            name="test_finding",
            nameDe="Test Befund",
            description="A test finding for classification validation"
        )
        
        # Create test classification
        self.classification = FindingClassification.objects.create(
            name="Severity",
            description="Severity classification for testing"
        )
        
        # Create test classification choices
        self.choice_mild = FindingClassificationChoice.objects.create(
            name="Mild",
            description="Mild severity"
        )
        self.choice_moderate = FindingClassificationChoice.objects.create(
            name="Moderate", 
            description="Moderate severity"
        )
        
        # Link choices to classification
        self.classification.choices.add(self.choice_mild, self.choice_moderate)
        
        # Link classification to finding
        self.finding.finding_classifications.add(self.classification)

    def test_create_patient_finding_with_classifications_success(self):
        """
        Test successful creation of patient finding with classifications.
        
        This test validates that the API correctly processes classification data
        and returns a complete response including the created classifications.
        """
        # Arrange: Prepare finding data with classifications
        finding_data = {
            'patientExamination': self.patient_examination.id,
            'finding': self.finding.id,
            'classifications': [
                {
                    'classification': self.classification.id,
                    'choice': self.choice_mild.id
                }
            ]
        }
        
        # Act: Create patient finding via API
        response = self.client.post('/api/patient-findings/', finding_data, format='json')
        
        # Assert: Verify successful creation
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify response contains finding data
        response_data = response.json()
        self.assertIn('id', response_data)
        self.assertIn('finding', response_data)
        self.assertIn('patient', response_data)
        
        # Critical assertion: Verify classifications are included in response
        self.assertIn('classifications', response_data)
        self.assertIsInstance(response_data['classifications'], list)
        self.assertEqual(len(response_data['classifications']), 1)
        
        # Verify classification data integrity
        classification_data = response_data['classifications'][0]
        self.assertIn('id', classification_data)
        self.assertIn('classification', classification_data)
        self.assertIn('classification_choice', classification_data)
        self.assertIn('is_active', classification_data)
        
        # Verify classification details
        self.assertEqual(classification_data['classification']['id'], self.classification.id)
        self.assertEqual(classification_data['classification']['name'], 'Severity')
        self.assertEqual(classification_data['classification_choice']['id'], self.choice_mild.id)
        self.assertEqual(classification_data['classification_choice']['name'], 'Mild')
        self.assertTrue(classification_data['is_active'])
        
        # Verify database state
        created_finding = PatientFinding.objects.get(id=response_data['id'])
        self.assertEqual(created_finding.classifications.count(), 1)
        
        classification_db = created_finding.classifications.first()
        self.assertEqual(classification_db.classification.id, self.classification.id)
        self.assertEqual(classification_db.classification_choice.id, self.choice_mild.id)
        self.assertTrue(classification_db.is_active)

    def test_create_patient_finding_with_multiple_classifications(self):
        """
        Test creation of patient finding with multiple classifications.
        
        This validates that the API can handle multiple classification choices
        for a single finding and returns all of them in the response.
        """
        # Arrange: Create second classification for testing
        location_classification = FindingClassification.objects.create(
            name="Location",
            description="Location classification for testing"
        )
        
        proximal_choice = FindingClassificationChoice.objects.create(
            name="Proximal",
            description="Proximal location"
        )
        
        location_classification.choices.add(proximal_choice)
        self.finding.finding_classifications.add(location_classification)
        
        finding_data = {
            'patientExamination': self.patient_examination.id,
            'finding': self.finding.id,
            'classifications': [
                {
                    'classification': self.classification.id,
                    'choice': self.choice_mild.id
                },
                {
                    'classification': location_classification.id,
                    'choice': proximal_choice.id
                }
            ]
        }
        
        # Act: Create patient finding with multiple classifications
        response = self.client.post('/api/patient-findings/', finding_data, format='json')
        
        # Assert: Verify successful creation
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        response_data = response.json()
        
        # Critical assertion: Verify both classifications are returned
        self.assertIn('classifications', response_data)
        self.assertEqual(len(response_data['classifications']), 2)
        
        # Verify both classifications have correct data
        classification_names = [c['classification']['name'] for c in response_data['classifications']]
        self.assertIn('Severity', classification_names)
        self.assertIn('Location', classification_names)
        
        # Verify database state
        created_finding = PatientFinding.objects.get(id=response_data['id'])
        self.assertEqual(created_finding.classifications.count(), 2)

    def test_create_patient_finding_without_classifications(self):
        """
        Test creation of patient finding without any classifications.
        
        This test validates that findings can be created without classifications
        and that the response correctly indicates an empty classifications array.
        """
        # Arrange: Prepare finding data without classifications
        finding_data = {
            'patientExamination': self.patient_examination.id,
            'finding': self.finding.id
            # No classifications field
        }
        
        # Act: Create patient finding without classifications
        response = self.client.post('/api/patient-findings/', finding_data, format='json')
        
        # Assert: Verify successful creation
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        response_data = response.json()
        
        # Verify classifications field is present but empty
        self.assertIn('classifications', response_data)
        self.assertIsInstance(response_data['classifications'], list)
        self.assertEqual(len(response_data['classifications']), 0)
        
        # Verify database state
        created_finding = PatientFinding.objects.get(id=response_data['id'])
        self.assertEqual(created_finding.classifications.count(), 0)

    def test_patient_finding_list_includes_classifications(self):
        """
        Test that the patient findings list endpoint returns classifications.
        
        This test validates that when retrieving existing patient findings,
        the API includes classification data to prevent data loss scenarios.
        """
        # Arrange: Create patient finding with classification
        patient_finding = PatientFinding.objects.create(
            patient_examination=self.patient_examination,
            finding=self.finding
        )
        
        # Add classification to the finding
        PatientFindingClassification.objects.create(
            finding=patient_finding,
            classification=self.classification,
            classification_choice=self.choice_mild,
            is_active=True
        )
        
        # Act: Retrieve patient findings list
        response = self.client.get(f'/api/patient-findings/?patient_examination={self.patient_examination.id}')
        
        # Assert: Verify response includes classifications
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response_data = response.json()
        
        # Verify structure (could be paginated)
        findings_list = response_data.get('results', response_data)
        self.assertEqual(len(findings_list), 1)
        
        finding_data = findings_list[0]
        
        # Critical assertion: Verify classifications are included
        self.assertIn('classifications', finding_data)
        self.assertEqual(len(finding_data['classifications']), 1)
        
        classification_data = finding_data['classifications'][0]
        self.assertEqual(classification_data['classification']['name'], 'Severity')
        self.assertEqual(classification_data['classification_choice']['name'], 'Mild')

    def test_invalid_classification_choice_handling(self):
        """
        Test handling of invalid classification choice combinations.
        
        This test validates that the API properly validates classification
        choice relationships and returns appropriate errors.
        """
        # Arrange: Create another classification with different choices
        other_classification = FindingClassification.objects.create(
            name="Other Classification",
            description="Another classification for testing"
        )
        
        other_choice = FindingClassificationChoice.objects.create(
            name="Other Choice",
            description="Choice for other classification"
        )
        
        other_classification.choices.add(other_choice)
        
        # Try to use choice from different classification
        finding_data = {
            'patientExamination': self.patient_examination.id,
            'finding': self.finding.id,
            'classifications': [
                {
                    'classification': self.classification.id,
                    'choice': other_choice.id  # Wrong choice for this classification
                }
            ]
        }
        
        # Act: Attempt to create finding with invalid classification choice
        response = self.client.post('/api/patient-findings/', finding_data, format='json')
        
        # Assert: Verify appropriate error response
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY])
        
        # Verify no patient finding was created
        self.assertEqual(PatientFinding.objects.count(), 0)

    def test_api_response_structure_consistency(self):
        """
        Test that API responses have consistent structure for classifications.
        
        This test validates that classification data structure is consistent
        across different API endpoints to prevent frontend parsing issues.
        """
        # Arrange: Create patient finding with classification
        finding_data = {
            'patientExamination': self.patient_examination.id,
            'finding': self.finding.id,
            'classifications': [
                {
                    'classification': self.classification.id,
                    'choice': self.choice_mild.id
                }
            ]
        }
        
        # Act: Create via POST
        post_response = self.client.post('/api/patient-findings/', finding_data, format='json')
        created_id = post_response.json()['id']
        
        # Get via GET detail
        get_response = self.client.get(f'/api/patient-findings/{created_id}/')
        
        # Get via GET list
        list_response = self.client.get(f'/api/patient-findings/?patient_examination={self.patient_examination.id}')
        
        # Assert: Verify all responses have same classification structure
        post_data = post_response.json()
        get_data = get_response.json()
        list_data = list_response.json()
        
        # Extract findings data (handle pagination)
        list_finding = list_data.get('results', list_data)[0]
        
        # Verify classification structure consistency
        for response_name, finding_data in [('POST', post_data), ('GET', get_data), ('LIST', list_finding)]:
            with self.subTest(response=response_name):
                self.assertIn('classifications', finding_data)
                self.assertEqual(len(finding_data['classifications']), 1)
                
                classification = finding_data['classifications'][0]
                
                # Verify required fields are present
                required_fields = ['id', 'classification', 'classification_choice', 'is_active']
                for field in required_fields:
                    self.assertIn(field, classification, 
                                f"Missing {field} in {response_name} response")
                
                # Verify nested structure
                self.assertIn('id', classification['classification'])
                self.assertIn('name', classification['classification'])
                self.assertIn('id', classification['classification_choice'])
                self.assertIn('name', classification['classification_choice'])

    def test_diagnosis_finding_classification_data_loss_scenario(self):
        """
        Test specifically for the reported issue of missing classification data.
        
        This test simulates the exact scenario described in the issue where
        findings are sometimes stored without their classifications.
        """
        # Arrange: Create finding data with classification as reported in frontend
        finding_data = {
            'patientExamination': self.patient_examination.id,
            'finding': self.finding.id,
            'classifications': [
                {
                    'classification': self.classification.id,
                    'choice': self.choice_mild.id
                }
            ]
        }
        
        # Act: Create patient finding
        response = self.client.post('/api/patient-findings/', finding_data, format='json')
        
        # Assert: This test validates the specific issue reported
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        response_data = response.json()
        
        # CRITICAL TEST: Verify this exact scenario does not lose classification data
        self.assertIn('classifications', response_data, 
                     "🐛 BUG CONFIRMED: Response missing classifications field")
        
        self.assertIsNotNone(response_data['classifications'],
                           "🐛 BUG CONFIRMED: Classifications field is null")
        
        self.assertGreater(len(response_data['classifications']), 0,
                         "🐛 BUG CONFIRMED: Classifications array is empty despite being provided")
        
        # Verify the classification data is complete
        classification = response_data['classifications'][0]
        self.assertIsNotNone(classification.get('classification'),
                           "🐛 BUG CONFIRMED: Classification object is missing")
        
        self.assertIsNotNone(classification.get('classification_choice'),
                           "🐛 BUG CONFIRMED: Classification choice is missing")
        
        print("✅ VALIDATION PASSED: Finding created with complete classification data")
        print(f"   - Classifications returned: {len(response_data['classifications'])}")
        print(f"   - Classification name: {classification['classification']['name']}")
        print(f"   - Choice name: {classification['classification_choice']['name']}")
