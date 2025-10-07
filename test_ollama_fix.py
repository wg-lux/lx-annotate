#!/usr/bin/env python3
"""
Quick test to verify the ollama_llm_meta_extraction fix works correctly.
This test verifies the corrected behavior without full integration.
"""

import sys
import os
sys.path.insert(0, '/home/admin/dev/lx-annotate/libs/lx-anonymizer')

def test_basic_functionality():
    """Test that the fix maintains basic contract: always returns dict."""
    from lx_anonymizer.ollama_llm_meta_extraction import _safe_keys_view, extractor_instance
    
    # Test PHI-safe logging helper
    test_dict = {"patient_first_name": "Test", "patient_last_name": "User"}
    keys = _safe_keys_view(test_dict)
    assert isinstance(keys, list)
    assert "patient_first_name" in keys
    assert "patient_last_name" in keys
    print("✓ _safe_keys_view works correctly")
    
    # Test extractor instance exists
    assert hasattr(extractor_instance, 'regex_extract_llm_meta')
    print("✓ extractor_instance is properly initialized")
    
    # Test regex extraction returns dict
    test_text = "Patient: John Doe, DOB: 01.01.1990"
    result = extractor_instance.regex_extract_llm_meta(test_text)
    assert isinstance(result, dict)
    print("✓ regex_extract_llm_meta returns dict")
    
    print("\nAll basic functionality tests passed!")

if __name__ == "__main__":
    test_basic_functionality()
