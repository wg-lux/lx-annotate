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
    
    # Endpoint should be accessible (status code 200)
    assert response.status_code == 200
    
    # Response should be valid JSON
    try:
        data = response.json()
        assert isinstance(data, dict)
    except ValueError:
        pytest.fail("Response is not valid JSON")

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
