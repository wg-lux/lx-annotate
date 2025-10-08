# tests/test_polling_retry_after.py

import time
from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from endoreg_db.services.polling_coordinator import PollingCoordinator
from endoreg_db.services.anonymization_service import AnonymizationService


class TestPollingRetryAfter(TestCase):
    """Test Retry-After header functionality for anonymization status polling"""

    def setUp(self):
        self.client = APIClient()
        self.file_id = 123
        self.url = reverse("anonymization_status", kwargs={"file_id": self.file_id})

    @patch.object(AnonymizationService, 'get_status')
    def test_first_hit_returns_200_without_retry_after(self, mock_get_status):
        """First status check should return 200 without rate limiting"""
        # Mock the service response
        mock_get_status.return_value = {
            "mediaType": "video",
            "anonymizationStatus": "processing_anonymization"
        }

        # Clear any existing cooldown
        PollingCoordinator._record_status_check(self.file_id, "video")
        time.sleep(1.1)  # Wait past any existing cooldown

        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("Retry-After", response.headers)

    @patch.object(AnonymizationService, 'get_status')
    def test_second_immediate_hit_returns_429_with_retry_after(self, mock_get_status):
        """Second immediate status check should return 429 with Retry-After header"""
        # Mock the service response
        mock_get_status.return_value = {
            "mediaType": "video", 
            "anonymizationStatus": "processing_anonymization"
        }

        # First request
        response1 = self.client.get(self.url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Second immediate request - should be rate limited
        response2 = self.client.get(self.url)
        
        self.assertEqual(response2.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("Retry-After", response2.headers)
        
        # Verify Retry-After header value
        retry_after = int(response2.headers["Retry-After"])
        self.assertGreaterEqual(retry_after, 1)
        self.assertLessEqual(retry_after, PollingCoordinator.CHECK_COOLDOWN)

        # Verify JSON response includes retry_after
        data = response2.json()
        self.assertTrue(data.get("cooldown_active"))
        self.assertEqual(data.get("retry_after"), retry_after)
        self.assertIn("Status check rate limited", data.get("detail", ""))

    @patch.object(AnonymizationService, 'get_status')
    def test_retry_after_decreases_over_time(self, mock_get_status):
        """Retry-After value should decrease as cooldown time passes"""
        # Mock the service response
        mock_get_status.return_value = {
            "mediaType": "video",
            "anonymizationStatus": "processing_anonymization"
        }

        # First request to trigger cooldown
        response1 = self.client.get(self.url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Second request - get initial retry-after
        response2 = self.client.get(self.url)
        initial_retry_after = int(response2.headers["Retry-After"])

        # Wait a bit and check again
        time.sleep(2)
        response3 = self.client.get(self.url)
        
        if response3.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            # Should still be rate limited but with lower retry-after
            later_retry_after = int(response3.headers["Retry-After"])
            self.assertLess(later_retry_after, initial_retry_after)

    @patch.object(AnonymizationService, 'get_status')
    def test_pdf_file_type_cooldown(self, mock_get_status):
        """Test that PDF files also get proper Retry-After headers"""
        # Mock the service response for PDF
        mock_get_status.return_value = {
            "mediaType": "pdf",
            "anonymizationStatus": "processing_anonymization"
        }

        # First request
        response1 = self.client.get(self.url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Second immediate request - should be rate limited
        response2 = self.client.get(self.url)
        
        self.assertEqual(response2.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("Retry-After", response2.headers)
        
        retry_after = int(response2.headers["Retry-After"])
        self.assertGreaterEqual(retry_after, 1)

    def test_get_remaining_cooldown_seconds_method(self):
        """Test the PollingCoordinator.get_remaining_cooldown_seconds method directly"""
        file_id = 456
        file_type = "video"

        # No previous check - should return 0
        remaining = PollingCoordinator.get_remaining_cooldown_seconds(file_id, file_type)
        self.assertEqual(remaining, 0)

        # Record a status check
        PollingCoordinator._record_status_check(file_id, file_type)
        
        # Should have cooldown remaining
        remaining = PollingCoordinator.get_remaining_cooldown_seconds(file_id, file_type)
        self.assertGreaterEqual(remaining, 1)
        self.assertLessEqual(remaining, PollingCoordinator.CHECK_COOLDOWN)

    @patch.object(AnonymizationService, 'get_status')
    def test_file_not_found_no_retry_after(self, mock_get_status):
        """Test that 404 responses don't include Retry-After headers"""
        # Mock service to return None (file not found)
        mock_get_status.return_value = None

        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertNotIn("Retry-After", response.headers)
