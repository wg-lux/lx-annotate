"""
Test video import metadata mapping functionality.

Tests for ensuring complete metadata mapping from extracted data to SensitiveMeta.
"""

import logging
import pytest
from unittest.mock import MagicMock

# Adjust import paths to your project structure
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / "libs" / "endoreg-db"))

def test_update_sensitive_metadata_complete_mapping():
    """Test that _update_sensitive_metadata maps all available fields correctly."""
    # Import the service class
    from endoreg_db.services.video_import import VideoImportService
    
    # Create a mock video import service instance
    service = VideoImportService()
    
    # Mock the current_video and sensitive_meta
    mock_video = MagicMock()
    mock_sensitive_meta = MagicMock()
    mock_video.sensitive_meta = mock_sensitive_meta
    mock_video.video_hash = "test-video-123"
    service.current_video = mock_video
    service.logger = MagicMock()
    
    # Complete extracted metadata with all fields the FrameMetadataExtractor provides
    extracted_metadata = {
        'patient_first_name': 'Max',
        'patient_last_name': 'Hild', 
        'patient_dob': '1990-01-01',
        'casenumber': 'A-123',
        'patient_gender': 'M',
        'examination_date': '2025-09-29',
        'examination_time': '11:45',
        'examiner': 'Dr. Example',
    }
    
    # Mock hasattr to return True for all our fields
    def mock_hasattr(obj, attr):
        return attr in extracted_metadata
    
    # Mock getattr to return None (simulating empty initial values)
    def mock_getattr(obj, attr):
        return None
    
    # Mock setattr to capture what gets set
    set_values = {}
    def mock_setattr(obj, attr, value):
        set_values[attr] = value
    
    # Apply mocks
    import builtins
    original_hasattr = builtins.hasattr
    original_getattr = builtins.getattr
    original_setattr = builtins.setattr
    
    builtins.hasattr = mock_hasattr
    builtins.getattr = mock_getattr
    builtins.setattr = mock_setattr
    
    try:
        # Call the method under test
        service._update_sensitive_metadata(extracted_metadata)
        
        # Verify all fields were mapped (this will fail with current implementation)
        expected_fields = [
            'patient_first_name', 'patient_last_name', 'patient_dob',
            'casenumber', 'patient_gender', 'examination_date', 
            'examination_time', 'examiner'
        ]
        
        for field in expected_fields:
            assert field in set_values, f"Field {field} was not mapped"
            assert set_values[field] == extracted_metadata[field], f"Field {field} value mismatch"
        
        # Verify save was called
        mock_sensitive_meta.save.assert_called_once()
        
    finally:
        # Restore original functions
        builtins.hasattr = original_hasattr
        builtins.getattr = original_getattr
        builtins.setattr = original_setattr

def test_update_sensitive_metadata_partial_data():
    """Test that _update_sensitive_metadata handles partial data correctly."""
    from endoreg_db.services.video_import import VideoImportService
    
    service = VideoImportService()
    
    # Mock the current_video and sensitive_meta
    mock_video = MagicMock()
    mock_sensitive_meta = MagicMock()
    mock_video.sensitive_meta = mock_sensitive_meta
    service.current_video = mock_video
    service.logger = MagicMock()
    
    # Partial extracted metadata (only some fields)
    extracted_metadata = {
        'patient_first_name': 'Anna',
        'casenumber': 'B-456',
        # Missing other fields intentionally
    }
    
    # Mock functions
    def mock_hasattr(obj, attr):
        return attr in ['patient_first_name', 'casenumber', 'patient_last_name']
    
    def mock_getattr(obj, attr):
        return None
    
    set_values = {}
    def mock_setattr(obj, attr, value):
        set_values[attr] = value
    
    import builtins
    original_hasattr = builtins.hasattr
    original_getattr = builtins.getattr
    original_setattr = builtins.setattr
    
    builtins.hasattr = mock_hasattr
    builtins.getattr = mock_getattr
    builtins.setattr = mock_setattr
    
    try:
        service._update_sensitive_metadata(extracted_metadata)
        
        # Should only set fields that exist in extracted_metadata
        assert 'patient_first_name' in set_values
        assert 'casenumber' in set_values
        assert set_values['patient_first_name'] == 'Anna'
        assert set_values['casenumber'] == 'B-456'
        
        # Should not set fields that don't exist in extracted_metadata
        assert 'patient_last_name' not in set_values
        
    finally:
        builtins.hasattr = original_hasattr
        builtins.getattr = original_getattr
        builtins.setattr = original_setattr

def test_update_sensitive_metadata_empty_extracted_data():
    """Test that _update_sensitive_metadata handles empty extracted data."""
    from endoreg_db.services.video_import import VideoImportService
    
    service = VideoImportService()
    
    # Mock the current_video and sensitive_meta
    mock_video = MagicMock()
    mock_sensitive_meta = MagicMock()
    mock_video.sensitive_meta = mock_sensitive_meta
    service.current_video = mock_video
    service.logger = MagicMock()
    
    # Empty extracted metadata
    extracted_metadata = {}
    
    # Call the method
    service._update_sensitive_metadata(extracted_metadata)
    
    # Should return early and not call save
    mock_sensitive_meta.save.assert_not_called()
