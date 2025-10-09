"""
Video Masking Tests

Tests for device mask and custom ROI masking functionality.
Created as part of Phase 1.3: Video Masking Implementation.

Tests cover:
- Device-specific mask loading
- Custom ROI masking
- Processing history tracking
- Error handling
- Video file creation and database updates
"""
import pytest
from pathlib import Path
from django.test import TestCase
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status as http_status

from endoreg_db.models import VideoFile, VideoMetadata, VideoProcessingHistory
from lx_anonymizer import FrameCleaner


class TestDeviceMaskLoading(TestCase):
    """Test device mask file loading and validation"""
    
    def setUp(self):
        """Initialize FrameCleaner for mask loading tests"""
        self.frame_cleaner = FrameCleaner()
        self.masks_dir = Path(__file__).parent.parent.parent / 'libs' / 'lx-anonymizer' / 'lx_anonymizer' / 'masks'
    
    def test_load_olympus_mask(self):
        """Test loading Olympus CV-1500 mask"""
        mask_config = self.frame_cleaner._load_mask('olympus_cv_1500')
        
        assert mask_config is not None
        assert mask_config['image_width'] == 1920
        assert mask_config['image_height'] == 1080
        assert mask_config['endoscope_image_x'] == 550
        assert mask_config['endoscope_image_width'] == 1350
        assert 'description' in mask_config
    
    def test_load_pentax_mask(self):
        """Test loading Pentax EPT-7000 mask"""
        mask_config = self.frame_cleaner._load_mask('pentax_ept_7000')
        
        assert mask_config is not None
        assert mask_config['image_width'] == 1920
        assert mask_config['image_height'] == 1080
        assert 'endoscope_image_x' in mask_config
        assert 'description' in mask_config
    
    def test_load_fujifilm_mask(self):
        """Test loading Fujifilm 4450HD mask"""
        mask_config = self.frame_cleaner._load_mask('fujifilm_4450hd')
        
        assert mask_config is not None
        assert mask_config['image_width'] == 1920
        assert mask_config['image_height'] == 1080
        assert 'endoscope_image_x' in mask_config
        assert 'description' in mask_config
    
    def test_load_generic_mask(self):
        """Test loading generic fallback mask"""
        mask_config = self.frame_cleaner._load_mask('generic')
        
        assert mask_config is not None
        assert mask_config['image_width'] == 1920
        assert mask_config['image_height'] == 1080
        assert 'endoscope_image_x' in mask_config
    
    def test_load_nonexistent_mask_creates_stub(self):
        """Test that loading non-existent mask creates a stub file"""
        # Use a unique name to avoid conflicts
        test_device = 'test_device_12345'
        
        # Ensure mask file doesn't exist
        mask_file = self.masks_dir / f'{test_device}_mask.json'
        if mask_file.exists():
            mask_file.unlink()
        
        # Load mask (should create stub)
        mask_config = self.frame_cleaner._load_mask(test_device)
        
        # Verify stub was created
        assert mask_file.exists()
        assert mask_config is not None
        assert mask_config['image_width'] == 1920  # Default stub values
        
        # Cleanup
        mask_file.unlink()
    
    def test_mask_files_are_valid_json(self):
        """Test that all mask files contain valid JSON"""
        import json
        
        mask_files = list(self.masks_dir.glob('*_mask.json'))
        assert len(mask_files) >= 4  # olympus, pentax, fujifilm, generic
        
        for mask_file in mask_files:
            with mask_file.open() as f:
                data = json.load(f)  # Should not raise JSONDecodeError
                
                # Verify required fields
                assert 'image_width' in data
                assert 'image_height' in data
                assert 'endoscope_image_x' in data
                assert 'endoscope_image_y' in data
                assert 'endoscope_image_width' in data
                assert 'endoscope_image_height' in data


class TestROIValidation(TestCase):
    """Test custom ROI validation logic"""
    
    def setUp(self):
        """Initialize FrameCleaner for ROI validation tests"""
        self.frame_cleaner = FrameCleaner()
    
    def test_valid_roi(self):
        """Test validation of valid ROI"""
        roi = {
            'x': 550,
            'y': 0,
            'width': 1350,
            'height': 1080
        }
        
        assert self.frame_cleaner._validate_roi(roi) is True
    
    def test_roi_missing_keys(self):
        """Test validation fails with missing keys"""
        roi = {
            'x': 550,
            'y': 0,
            'width': 1350
            # Missing 'height'
        }
        
        assert self.frame_cleaner._validate_roi(roi) is False
    
    def test_roi_negative_values(self):
        """Test validation fails with negative values"""
        roi = {
            'x': -10,
            'y': 0,
            'width': 1350,
            'height': 1080
        }
        
        assert self.frame_cleaner._validate_roi(roi) is False
    
    def test_roi_zero_dimensions(self):
        """Test validation fails with zero width or height"""
        roi = {
            'x': 550,
            'y': 0,
            'width': 0,
            'height': 1080
        }
        
        assert self.frame_cleaner._validate_roi(roi) is False
    
    def test_roi_unreasonably_large(self):
        """Test validation fails with unreasonably large values"""
        roi = {
            'x': 10000,
            'y': 0,
            'width': 1350,
            'height': 1080
        }
        
        assert self.frame_cleaner._validate_roi(roi) is False
    
    def test_roi_invalid_type(self):
        """Test validation fails with invalid type"""
        roi = "not a dictionary"
        
        assert self.frame_cleaner._validate_roi(roi) is False


class TestMaskConfigCreation(TestCase):
    """Test mask configuration creation from ROI"""
    
    def setUp(self):
        """Initialize FrameCleaner for config creation tests"""
        self.frame_cleaner = FrameCleaner()
    
    def test_create_mask_config_from_roi(self):
        """Test creating mask config from processor ROI"""
        endoscope_roi = {
            'x': 550,
            'y': 0,
            'width': 1350,
            'height': 1080
        }
        
        mask_config = self.frame_cleaner._create_mask_config_from_roi(endoscope_roi)
        
        assert mask_config is not None
        assert mask_config['endoscope_image_x'] == 550
        assert mask_config['endoscope_image_y'] == 0
        assert mask_config['endoscope_image_width'] == 1350
        assert mask_config['endoscope_image_height'] == 1080
        assert mask_config['image_width'] == 1920  # Default HD
        assert mask_config['image_height'] == 1080
    
    def test_create_mask_config_infers_image_size(self):
        """Test that mask config infers image size from ROI"""
        # ROI that exceeds default 1920x1080
        endoscope_roi = {
            'x': 500,
            'y': 100,
            'width': 1500,
            'height': 1100
        }
        
        mask_config = self.frame_cleaner._create_mask_config_from_roi(endoscope_roi)
        
        # Image dimensions should be inferred (ROI + margin)
        assert mask_config['image_width'] >= 2000  # 500 + 1500 + margin
        assert mask_config['image_height'] >= 1200  # 100 + 1100 + margin


@pytest.mark.skipif(
    not Path('test-data/videos/sample_short.mp4').exists(),
    reason="Test video fixture not available"
)
class TestVideoMaskingIntegration(TestCase):
    """
    Integration tests for video masking workflow.
    
    NOTE: These tests require a sample video file at:
    test-data/videos/sample_short.mp4
    
    Create with: ffmpeg -f lavfi -i testsrc=duration=5:size=1920x1080:rate=30 \
                        -pix_fmt yuv420p test-data/videos/sample_short.mp4
    """
    
    def setUp(self):
        """Set up test video and database fixtures"""
        self.client = APIClient()
        self.frame_cleaner = FrameCleaner()
        
        # Create test video file in database
        self.video = VideoFile.objects.create(
            # Add required fields based on your VideoFile model
            # filename='sample_short.mp4',
            # raw_file='test-data/videos/sample_short.mp4',
            # ... other required fields
        )
        
        self.test_video_path = Path('test-data/videos/sample_short.mp4')
        self.output_dir = Path(settings.MEDIA_ROOT) / 'test_output'
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def tearDown(self):
        """Clean up test output files"""
        if self.output_dir.exists():
            for file in self.output_dir.glob('*.mp4'):
                file.unlink()
    
    def test_apply_device_mask_olympus(self):
        """Test applying Olympus CV-1500 mask to video"""
        output_path = self.output_dir / 'olympus_masked.mp4'
        
        mask_config = self.frame_cleaner._load_mask('olympus_cv_1500')
        success = self.frame_cleaner._mask_video(
            input_video=self.test_video_path,
            mask_config=mask_config,
            output_video=output_path
        )
        
        assert success is True
        assert output_path.exists()
        assert output_path.stat().st_size > 0
    
    def test_apply_custom_roi_mask(self):
        """Test applying custom ROI mask to video"""
        output_path = self.output_dir / 'custom_masked.mp4'
        
        endoscope_roi = {
            'x': 600,
            'y': 50,
            'width': 1300,
            'height': 1000
        }
        
        mask_config = self.frame_cleaner._create_mask_config_from_roi(endoscope_roi)
        success = self.frame_cleaner._mask_video(
            input_video=self.test_video_path,
            mask_config=mask_config,
            output_video=output_path
        )
        
        assert success is True
        assert output_path.exists()
        assert output_path.stat().st_size > 0
    
    def test_mask_video_via_api(self):
        """Test video masking via REST API endpoint"""
        response = self.client.post(
            f'/api/video-apply-mask/{self.video.id}/',
            data={
                'mask_type': 'device',
                'device_name': 'olympus_cv_1500',
                'processing_method': 'streaming'
            },
            format='json'
        )
        
        assert response.status_code == http_status.HTTP_200_OK
        assert 'output_file' in response.data
        assert 'processing_time' in response.data
        
        # Verify processing history was created
        history = VideoProcessingHistory.objects.filter(
            video=self.video,
            operation=VideoProcessingHistory.OPERATION_MASKING
        ).latest('created_at')
        
        assert history.status == VideoProcessingHistory.STATUS_SUCCESS
    
    def test_mask_video_updates_anonymized_file(self):
        """Test that masking updates video.anonymized_file field"""
        response = self.client.post(
            f'/api/video-apply-mask/{self.video.id}/',
            data={
                'mask_type': 'device',
                'device_name': 'olympus_cv_1500'
            },
            format='json'
        )
        
        assert response.status_code == http_status.HTTP_200_OK
        
        # Refresh from database
        self.video.refresh_from_db()
        
        # Verify anonymized_file was set
        assert self.video.anonymized_file is not None
        assert 'masked.mp4' in str(self.video.anonymized_file)
    
    def test_mask_video_creates_processing_history(self):
        """Test that masking creates processing history record"""
        initial_count = VideoProcessingHistory.objects.count()
        
        response = self.client.post(
            f'/api/video-apply-mask/{self.video.id}/',
            data={
                'mask_type': 'custom',
                'roi': {
                    'x': 550,
                    'y': 0,
                    'width': 1350,
                    'height': 1080
                }
            },
            format='json'
        )
        
        assert response.status_code == http_status.HTTP_200_OK
        
        # Verify new history record created
        assert VideoProcessingHistory.objects.count() == initial_count + 1
        
        history = VideoProcessingHistory.objects.latest('created_at')
        assert history.operation == VideoProcessingHistory.OPERATION_MASKING
        assert history.status == VideoProcessingHistory.STATUS_SUCCESS
        assert 'roi' in history.config
    
    def test_mask_video_error_handling(self):
        """Test error handling for invalid masking requests"""
        # Test missing device_name for device mask
        response = self.client.post(
            f'/api/video-apply-mask/{self.video.id}/',
            data={
                'mask_type': 'device'
                # Missing device_name
            },
            format='json'
        )
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        
        # Test missing ROI for custom mask
        response = self.client.post(
            f'/api/video-apply-mask/{self.video.id}/',
            data={
                'mask_type': 'custom'
                # Missing roi
            },
            format='json'
        )
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data


class TestMaskingPerformance(TestCase):
    """Performance tests for masking operations"""
    
    @pytest.mark.slow
    @pytest.mark.skipif(
        not Path('test-data/videos/sample_1min.mp4').exists(),
        reason="1-minute test video not available"
    )
    def test_masking_performance_1080p_1min(self):
        """Test masking performance on 1080p 1-minute video"""
        import time
        
        frame_cleaner = FrameCleaner()
        input_video = Path('test-data/videos/sample_1min.mp4')
        output_video = Path(settings.MEDIA_ROOT) / 'test_output' / 'perf_test.mp4'
        output_video.parent.mkdir(parents=True, exist_ok=True)
        
        mask_config = frame_cleaner._load_mask('olympus_cv_1500')
        
        start_time = time.time()
        success = frame_cleaner._mask_video(
            input_video=input_video,
            mask_config=mask_config,
            output_video=output_video
        )
        elapsed_time = time.time() - start_time
        
        assert success is True
        assert elapsed_time < 120  # Should complete in under 2 minutes
        
        # Log performance for monitoring
        print(f"Masking 1-minute 1080p video took {elapsed_time:.2f}s")
        
        # Cleanup
        if output_video.exists():
            output_video.unlink()


# Pytest fixtures for test data setup
@pytest.fixture
def sample_video_path(tmp_path):
    """Create a small test video using FFmpeg"""
    video_path = tmp_path / 'test_video.mp4'
    
    import subprocess
    cmd = [
        'ffmpeg', '-f', 'lavfi', '-i', 'testsrc=duration=5:size=1920x1080:rate=30',
        '-pix_fmt', 'yuv420p', '-y', str(video_path)
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True, timeout=30)
        return video_path
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        pytest.skip("FFmpeg not available or test video creation failed")


@pytest.fixture
def video_with_metadata(db):
    """Create VideoFile instance with metadata for testing"""
    video = VideoFile.objects.create(
        # Add required fields
    )
    
    VideoMetadata.objects.create(
        video=video,
        sensitive_frame_count=0,
        sensitive_ratio=0.0,
        sensitive_frame_ids='[]'
    )
    
    return video
