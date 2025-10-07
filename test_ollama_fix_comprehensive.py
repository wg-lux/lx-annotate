#!/usr/bin/env python3
"""
Comprehensive test to verify the ollama_llm_meta_extraction fix.
Tests that the implementation meets all requirements from ollama_fix.md
"""

import sys
import json
from unittest.mock import Mock, patch
sys.path.insert(0, '/home/admin/dev/lx-annotate/libs/lx-anonymizer')

from lx_anonymizer.ollama_llm_meta_extraction import extract_meta_ollama, _extract_json_block, _safe_keys_view

def test_pydantic_success_returns_validated_dict():
    """Test: Given valid cleaned_json_str, assert returns dict and doesn't call regex."""
    print("Testing: Pydantic success returns validated dict...")
    
    # Mock ollama chat to return valid JSON
    valid_json = '{"patient_first_name": "John", "patient_last_name": "Doe", "patient_gender": "m", "patient_dob": null, "casenumber": "12345"}'
    
    with patch('lx_anonymizer.ollama_llm_meta_extraction.chat') as mock_chat:
        with patch('lx_anonymizer.ollama_llm_meta_extraction.extractor_instance') as mock_extractor:
            # Setup mock response
            mock_chat.return_value = {
                'message': {'content': f'Here is the result: {valid_json}'}
            }
            
            result = extract_meta_ollama("Test patient report", model="test-model")
            
            # Verify result is dict
            assert isinstance(result, dict), f"Expected dict, got {type(result)}"
            assert "patient_first_name" in result
            assert result["patient_first_name"] == "John"
            
            # Verify regex wasn't called (fallback path)
            assert not mock_extractor.regex_extract_llm_meta.called, "Regex should not be called on Pydantic success"
            
    print("✓ Pydantic success test passed")

def test_pydantic_validation_error_falls_back_to_regex():
    """Test: Given invalid JSON/schema, assert regex is called and returns dict."""
    print("Testing: Pydantic validation error falls back to regex...")
    
    # Mock ollama chat to return invalid JSON
    invalid_json = '{"invalid_field": "value", "malformed": }'
    
    with patch('lx_anonymizer.ollama_llm_meta_extraction.chat') as mock_chat:
        with patch('lx_anonymizer.ollama_llm_meta_extraction.extractor_instance') as mock_extractor:
            # Setup mock response
            mock_chat.return_value = {
                'message': {'content': f'Here is the result: {invalid_json}'}
            }
            
            # Mock regex to return expected dict
            mock_extractor.regex_extract_llm_meta.return_value = {
                "patient_first_name": "Jane",
                "patient_last_name": "Smith",
                "patient_gender": None,
                "patient_dob": None,
                "casenumber": None
            }
            
            result = extract_meta_ollama("Test patient report", model="test-model")
            
            # Verify result is dict from regex
            assert isinstance(result, dict), f"Expected dict, got {type(result)}"
            assert result["patient_first_name"] == "Jane"
            
            # Verify regex was called
            assert mock_extractor.regex_extract_llm_meta.called, "Regex should be called on Pydantic failure"
            
    print("✓ Pydantic validation error fallback test passed")

def test_no_merge_occurs():
    """Test: When Pydantic succeeds, regex is not called."""
    print("Testing: No merge occurs between Pydantic and regex...")
    
    valid_json = '{"patient_first_name": "Alice", "patient_last_name": "Johnson", "patient_gender": "f", "patient_dob": null, "casenumber": null}'
    
    with patch('lx_anonymizer.ollama_llm_meta_extraction.chat') as mock_chat:
        with patch('lx_anonymizer.ollama_llm_meta_extraction.extractor_instance') as mock_extractor:
            # Setup mock response
            mock_chat.return_value = {
                'message': {'content': valid_json}
            }
            
            result = extract_meta_ollama("Test patient report", model="test-model")
            
            # Verify result is from Pydantic only
            assert isinstance(result, dict)
            assert result["patient_first_name"] == "Alice"
            
            # Verify regex was NOT called
            assert not mock_extractor.regex_extract_llm_meta.called, "Regex should NOT be called when Pydantic succeeds"
            
    print("✓ No merge test passed")

def test_regex_failure_returns_empty_dict():
    """Test: Make regex raise; assert {} returned and error log produced."""
    print("Testing: Regex failure returns empty dict...")
    
    with patch('lx_anonymizer.ollama_llm_meta_extraction.chat') as mock_chat:
        with patch('lx_anonymizer.ollama_llm_meta_extraction.extractor_instance') as mock_extractor:
            # Setup mock response with invalid JSON that fails Pydantic
            mock_chat.return_value = {
                'message': {'content': 'No valid JSON here'}
            }
            
            # Make regex raise an exception
            mock_extractor.regex_extract_llm_meta.side_effect = Exception("Regex failed")
            
            result = extract_meta_ollama("Test patient report", model="test-model")
            
            # Verify empty dict returned
            assert result == {}, f"Expected empty dict, got {result}"
            
    print("✓ Regex failure test passed")

def test_always_returns_dict():
    """Test: Function always returns dict type."""
    print("Testing: Function always returns dict...")
    
    # Test various scenarios
    test_cases = [
        # Valid JSON scenario
        ('{"patient_first_name": "Test", "patient_last_name": "User", "patient_gender": null, "patient_dob": null, "casenumber": null}', True),
        # Invalid JSON scenario 
        ('Invalid response text', False),
        # Empty response scenario
        ('', False)
    ]
    
    for content, should_succeed_pydantic in test_cases:
        with patch('lx_anonymizer.ollama_llm_meta_extraction.chat') as mock_chat:
            with patch('lx_anonymizer.ollama_llm_meta_extraction.extractor_instance') as mock_extractor:
                mock_chat.return_value = {'message': {'content': content}}
                
                if not should_succeed_pydantic:
                    # Mock regex fallback
                    mock_extractor.regex_extract_llm_meta.return_value = {"patient_first_name": None}
                
                result = extract_meta_ollama("Test", model="test-model")
                assert isinstance(result, dict), f"Expected dict, got {type(result)} for content: {content[:50]}..."
    
    print("✓ Always returns dict test passed")

def test_helper_functions():
    """Test helper functions work correctly."""
    print("Testing: Helper functions work correctly...")
    
    # Test _safe_keys_view
    test_dict = {"patient_first_name": "Test", "patient_last_name": "User"}
    keys = _safe_keys_view(test_dict)
    assert isinstance(keys, list)
    assert len(keys) == 2
    assert "patient_first_name" in keys
    
    # Test _extract_json_block
    text_with_json = 'Here is some text {"patient_first_name": "John"} and more text'
    extracted = _extract_json_block(text_with_json)
    assert extracted == '{"patient_first_name": "John"}'
    
    # Test with no JSON
    text_no_json = 'No JSON here at all'
    extracted = _extract_json_block(text_no_json)
    assert extracted is None
    
    print("✓ Helper functions test passed")

def run_all_tests():
    """Run all tests and report results."""
    print("="*60)
    print("COMPREHENSIVE OLLAMA FIX TESTS")
    print("="*60)
    
    tests = [
        test_pydantic_success_returns_validated_dict,
        test_pydantic_validation_error_falls_back_to_regex,
        test_no_merge_occurs,
        test_regex_failure_returns_empty_dict,
        test_always_returns_dict,
        test_helper_functions
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ {test.__name__} FAILED: {e}")
    
    print("="*60)
    print(f"RESULTS: {passed}/{total} tests passed")
    print("="*60)
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! The fix meets the specification requirements.")
        return True
    else:
        print("❌ Some tests failed. Please review the implementation.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
