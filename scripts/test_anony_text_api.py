#!/usr/bin/env python3
"""
Test script for the /api/pdf/anony_text/ endpoint
"""
import requests
import json
import sys
from pathlib import Path

def test_anony_text_api(base_url="http://127.0.0.1:8000"):
    """
    Test the anony_text API endpoint
    """
    url = f"{base_url}/api/pdf/anony_text/"
    
    # Send GET request
    print(f"Sending GET request to {url}")
    response = requests.get(url)
    
    # Print status code and response body
    print(f"Status code: {response.status_code}")
    print("Response body:")
    
    try:
        # Try to parse as JSON
        data = response.json()
        print(json.dumps(data, indent=2))
        
        # Check for common response patterns
        if 'error' in data:
            print(f"Error received: {data['error']}")
            if data['error'] == "No more PDFs available.":
                print("\nHint: The API indicates no PDFs are available. You may need to:")
                print("1. Import PDFs into the system first")
                print("2. Check the database configuration")
                print("3. Ensure PDF processing is working correctly")
        elif isinstance(data, dict) and data:
            print("\nSuccess! Received valid data from the API.")
            # Print some key fields if they exist
            for key in ['id', 'text', 'anonymized_text', 'sensitive_meta_id']:
                if key in data:
                    print(f"{key}: {data[key][:100]}..." if isinstance(data[key], str) else f"{key}: {data[key]}")
    except ValueError:
        print("Response is not valid JSON:")
        print(response.text)

if __name__ == "__main__":
    # Allow custom base URL if provided as argument
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    test_anony_text_api(base_url)
