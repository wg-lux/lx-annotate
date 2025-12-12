"""
Test frame cleaner metadata extraction functionality.

Tests for ensuring proper metadata extraction and bug fixes.
"""

import logging
import pytest
from unittest.mock import patch
import numpy as np

# Adjust import paths to your project structure
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / "libs" / "lx-anonymizer"))

from lx_anonymizer.frame_cleaner import FrameCleaner

@pytest.fixture
def cleaner():
    """Create FrameCleaner instance for testing."""
    c = FrameCleaner(use_minicpm=False)  # Disable MiniCPM for simpler testing
    return c

def test_process_frame_uses_extractor_result(cleaner, caplog):
    """Test that _process_frame uses the extractor result, not the class."""
    with patch.object(
        cleaner.frame_metadata_extractor, 
        'extract_metadata_from_frame_text', 
        return_value={'patient_last_name': 'Muster'}
    ) as mock_ext:
        with patch.object(
            cleaner.frame_metadata_extractor,
            'is_sensitive_content',
            return_value=True
        ):
            with patch.object(
                cleaner.frame_ocr,
                'extract_text_from_frame',
                return_value=("Test OCR text", 0.9, {})
            ):
                caplog.set_level(logging.DEBUG)
                
                # Create dummy frame
                gray_frame = np.zeros((100, 100), dtype=np.uint8)
                
                is_sensitive, frame_metadata, ocr_text, ocr_conf = cleaner._process_frame(
                    gray_frame, None
                )
                
                assert frame_metadata.get('patient_last_name') == 'Muster'
                assert isinstance(frame_metadata, dict), "Result should be dict, not class"
                assert mock_ext.called
                assert is_sensitive is True
                assert ocr_text == "Test OCR text"
                assert ocr_conf == 0.9

def test_process_frame_empty_ocr_logs_and_handles_gracefully(cleaner, caplog):
    """Test that empty OCR text is handled gracefully with proper logging."""
    with patch.object(
        cleaner.frame_ocr,
        'extract_text_from_frame',
        return_value=("", 0.0, {})
    ):
        with patch.object(
            cleaner.frame_metadata_extractor,
            'extract_metadata_from_frame_text',
            return_value={}
        ):
            with patch.object(
                cleaner.frame_metadata_extractor,
                'is_sensitive_content',
                return_value=False
            ):
                caplog.set_level(logging.DEBUG)
                
                # Create dummy frame
                gray_frame = np.zeros((100, 100), dtype=np.uint8)
                
                is_sensitive, frame_metadata, ocr_text, ocr_conf = cleaner._process_frame(
                    gray_frame, None
                )
                
                assert frame_metadata == {}
                assert is_sensitive is False
                assert ocr_text == ""
                assert ocr_conf == 0.0

def test_process_frame_exception_handling(cleaner, caplog):
    """Test that exceptions in metadata extraction are handled gracefully."""
    with patch.object(
        cleaner.frame_ocr,
        'extract_text_from_frame',
        return_value=("Valid OCR text", 0.8, {})
    ):
        with patch.object(
            cleaner.frame_metadata_extractor,
            'extract_metadata_from_frame_text',
            side_effect=Exception("Extraction failed")
        ):
            caplog.set_level(logging.ERROR)
            
            # Create dummy frame
            gray_frame = np.zeros((100, 100), dtype=np.uint8)
            
            # This should not raise an exception
            is_sensitive, frame_metadata, ocr_text, ocr_conf = cleaner._process_frame(
                gray_frame, None
            )
            
            # Should have fallback behavior or handle the exception gracefully
            assert ocr_text == "Valid OCR text"
            # Check that error was logged
            error_logs = [r for r in caplog.records if r.levelname == 'ERROR']
            assert len(error_logs) > 0
