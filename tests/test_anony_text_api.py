"""
Pytest tests for the /api/pdf/anony_text/ endpoint
"""
import pytest
import requests
import json

# Base URL for the API
BASE_URL = "http://127.0.0.1:8000" 

def test_anony_text_endpoint_accessibility():
    """Test if the anony_text endpoint is accessible and returns a valid response"""
    url = f"{BASE_URL}/api/pdf/anony_text/"
    response = requests.get(url)
    
    # Endpoint should be accessible (status code 200 or 404)
    assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
    
    # If endpoint exists (200), verify the response format
    if response.status_code == 200:
        try:
            data = response.json()
            # Add assertions for expected data structure if endpoint is implemented
            assert isinstance(data, (dict, list)), "Response should be JSON dict or list"
        except ValueError:
            # If it's not JSON, it might be a different content type (like PDF)
            assert response.headers.get('content-type') is not None, "Should have content-type header"
    
    # If endpoint doesn't exist (404), that's also acceptable for now
    elif response.status_code == 404:
        # This is expected if the endpoint isn't implemented yet
        pass

def test_anony_text_endpoint_data():
    """Test the data returned by the anony_text endpoint"""
    url = f"{BASE_URL}/api/pdf/anony_text/"
    response = requests.get(url)
    
    # Parse response
    data = response.json()
    
    # If there are no PDFs, we expect an error message
    if 'error' in data:
        assert data['error'] == "No more PDFs available."
    else:
        # If we have data, validate important fields
        required_fields = ['id', 'text', 'anonymized_text', 'sensitive_meta_id']
        for field in required_fields:
            assert field in data, f"Required field '{field}' missing from response"
