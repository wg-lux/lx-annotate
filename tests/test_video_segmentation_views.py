"""
Tests for video segmentation views.

Tests both VideoLabelView (segment loading) and VideoStreamView (video streaming)
to ensure they work correctly for both Vue SPA and React dashboard frontends.
"""
import pytest
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import Mock, patch
from pathlib import Path
import tempfile
import os

from endoreg_db.models import (
    VideoFile, Center, EndoscopyProcessor, VideoMeta, 
    VideoPredictionMeta, ModelMeta, LabelSet, AiModel, Gender,
    Label, LabelType, LabelVideoSegment
)


class VideoSegmentationViewTests(TestCase):
    """Test video segmentation API endpoints."""

    def setUp(self):
        """Set up test data using factories instead of hardcoded fixtures."""
        # Create test user
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client = Client()
        self.client.login(username='testuser', password='testpass')
        
        # Create test center
        self.center = Center.objects.create(name="Test Center")
        
        # Create test processor (without center parameter)
        self.processor = EndoscopyProcessor.objects.create(
            name="Test Processor",
            image_width=1920,
            image_height=1080,
            endoscope_image_x=100,
            endoscope_image_y=100,
            endoscope_image_width=200,
            endoscope_image_height=200,
            examination_date_x=300,
            examination_date_y=300,
            examination_date_width=150,
            examination_date_height=50,
            patient_first_name_x=400,
            patient_first_name_y=400,
            patient_first_name_width=150,
            patient_first_name_height=30,
            patient_last_name_x=500,
            patient_last_name_y=500,
            patient_last_name_width=150,
            patient_last_name_height=30,
            patient_dob_x=600,
            patient_dob_y=600,
            patient_dob_width=150,
            patient_dob_height=30
        )
        
        # Add center to processor using ManyToMany relationship
        self.processor.centers.add(self.center)
        
        # Create test gender
        self.gender = Gender.objects.create(name="Male")
        
        # Create label type for labels
        self.label_type, _ = LabelType.objects.get_or_create(
            name="video_segmentation",
            defaults={"description": "Video segmentation labels"}
        )
        
        # Create test labelset
        self.labelset = LabelSet.objects.create(name="test_labelset")
        
        # Create test AI model
        self.ai_model = AiModel.objects.create(name="test_model")
        
        # Create test model meta for predictions
        self.model_meta, _ = ModelMeta.objects.get_or_create(
            name="test_meta",
            defaults={
                "version": "1.0",
                "description": "Test model for video segmentation"
            }
        )
        
        # Create test video with temporary file
        self.temp_video_file = tempfile.NamedTemporaryFile(
            suffix='.mp4', delete=False
        )
        self.temp_video_file.write(b'fake video content')
        self.temp_video_file.close()
        
        self.video = VideoFile.objects.create(
            original_file_name="test_video.mp4",
            fps=25.0,
            frame_dir="/tmp/test_frames",
            center=self.center  # Add required center
        )
        
        # Create test labels - including the problematic ones from the bug report
        self.label_nbi = Label.objects.create(name="nbi", label_type=self.label_type)
        self.label_polyp = Label.objects.create(name="polyp", label_type=self.label_type) 
        self.label_snare = Label.objects.create(name="snare", label_type=self.label_type)
        self.label_appendix = Label.objects.create(name="appendix", label_type=self.label_type)
        self.label_blood = Label.objects.create(name="blood", label_type=self.label_type)
        
        # Create test prediction meta with required model_meta
        self.prediction_meta = VideoPredictionMeta.objects.create(
            video_file=self.video,
            model_meta=self.model_meta
        )
        
        # Create test segments for the problematic labels
        self.segment_nbi = LabelVideoSegment.objects.create(
            video_file=self.video,
            label=self.label_nbi,
            start_frame_number=100,
            end_frame_number=200,
            prediction_meta=self.prediction_meta
        )
        
        self.segment_polyp = LabelVideoSegment.objects.create(
            video_file=self.video,
            label=self.label_polyp,
            start_frame_number=300,
            end_frame_number=400,
            prediction_meta=self.prediction_meta
        )
        
        self.segment_snare = LabelVideoSegment.objects.create(
            video_file=self.video,
            label=self.label_snare,
            start_frame_number=500,
            end_frame_number=600,
            prediction_meta=self.prediction_meta
        )

    def tearDown(self):
        """Clean up temporary files."""
        if os.path.exists(self.temp_video_file.name):
            os.unlink(self.temp_video_file.name)

    def test_label_view_success_for_valid_labels(self):
        """Test successful retrieval of label segments for all label types."""
        test_labels = ['nbi', 'polyp', 'snare', 'appendix', 'blood']
        
        for label_name in test_labels:
            with self.subTest(label=label_name):
                url = f"/api/videos/{self.video.id}/labels/{label_name}/"
                
                response = self.client.get(url)
                
                # Should return 200 (either with data or empty)
                self.assertIn(response.status_code, [status.HTTP_200_OK])
                data = response.json()
                
                # Verify response structure
                self.assertEqual(data["label"], label_name)
                self.assertIn("time_segments", data)
                self.assertIn("frame_predictions", data)
                
                # Verify segments exist for nbi, polyp, snare
                if label_name in ['nbi', 'polyp', 'snare']:
                    self.assertGreater(len(data["time_segments"]), 0)
                else:
                    # appendix, blood should have empty segments
                    self.assertEqual(len(data["time_segments"]), 0)

    def test_label_view_returns_404_for_missing_label(self):
        """Test 404 response when label doesn't exist."""
        url = f"/api/videos/{self.video.id}/labels/nonexistent/"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        data = response.json()
        self.assertIn("error", data)
        self.assertIn("Label 'nonexistent' not found", data["error"])

    def test_label_view_no_type_error_for_nbi_polyp_snare(self):
        """Regression test: ensure no TypeError on string/string path concatenation for problematic labels."""
        problematic_labels = ['nbi', 'polyp', 'snare']
        
        for label_name in problematic_labels:
            with self.subTest(label=label_name):
                url = f"/api/videos/{self.video.id}/labels/{label_name}/"
                
                # This should not raise TypeError: unsupported operand type(s) for /: 'str' and 'str'
                response = self.client.get(url)
                
                # The key test: no exception should be raised during execution
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                data = response.json()
                
                # Verify basic structure
                self.assertEqual(data["label"], label_name)
                self.assertGreater(len(data["time_segments"]), 0)
                
                # Verify frame data has proper structure (even if frame_file_path is empty)
                segment = data["time_segments"][0]
                self.assertIn("frames", segment)
                frame_data = list(segment["frames"].values())[0]
                self.assertIn("frame_filename", frame_data)
                self.assertIn("frame_file_path", frame_data)  # May be empty string
                self.assertIn("predictions", frame_data)

    def test_video_label_view_missing_video_returns_404(self):
        """Test 404 response when video doesn't exist."""
        url = "/api/videos/99999/labels/nbi/"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"], "Video not found")

    def test_video_label_view_no_segments_returns_empty_data(self):
        """Test empty response when no segments exist for label."""
        url = f"/api/videos/{self.video.id}/labels/appendix/"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["label"], "appendix")
        self.assertEqual(data["time_segments"], [])
        self.assertEqual(data["frame_predictions"], {})

    def test_stream_view_byte_range_intact(self):
        """Test video streaming with byte range requests - ensures regression protection."""
        # Mock the video file to have an active_file_path
        with patch.object(self.video, 'active_file_path', self.temp_video_file.name):
            url = f"/api/videostream/{self.video.id}/"
            
            response = self.client.get(url)
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response['Content-Type'], 'video/mp4')
            self.assertIn('Accept-Ranges', response)
            self.assertEqual(response['Accept-Ranges'], 'bytes')
            self.assertIn('Content-Length', response)
            self.assertIn('Content-Range', response.get('Content-Range', 'bytes'))  # Check for range support
            self.assertIn('Access-Control-Allow-Origin', response)

    def test_video_stream_view_missing_file_returns_404(self):
        """Test 404 response when video file is missing."""
        url = f"/api/videostream/{self.video.id}/"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_video_stream_view_missing_video_returns_404(self):
        """Test 404 response when video doesn't exist."""
        url = "/api/videostream/99999/"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_both_frontends_vue_and_react_compatibility(self):
        """Test that both Vue SPA and React dashboard can use the APIs."""
        # Test with Vue SPA headers
        vue_headers = {
            'HTTP_ACCEPT': 'application/json',
            'HTTP_USER_AGENT': 'Mozilla/5.0 (Vue.js SPA)'
        }
        
        url = f"/api/videos/{self.video.id}/labels/nbi/"
        vue_response = self.client.get(url, **vue_headers)
        
        # Test with React dashboard headers  
        react_headers = {
            'HTTP_ACCEPT': 'application/json',
            'HTTP_USER_AGENT': 'Mozilla/5.0 (React Dashboard)'
        }
        
        react_response = self.client.get(url, **react_headers)
        
        # Both should return identical data
        self.assertEqual(vue_response.status_code, status.HTTP_200_OK)
        self.assertEqual(react_response.status_code, status.HTTP_200_OK)
        self.assertEqual(vue_response.json(), react_response.json())
        
        # Verify response schema matches expected format for both clients
        for response in [vue_response, react_response]:
            data = response.json()
            self.assertIn("label", data)
            self.assertIn("time_segments", data)
            self.assertIn("frame_predictions", data)
            
            # Verify segment structure
            if data["time_segments"]:
                segment = data["time_segments"][0]
                required_fields = ["segment_id", "segment_start", "segment_end", 
                                   "start_time", "end_time", "frames"]
                for field in required_fields:
                    self.assertIn(field, segment)

    def test_fps_conversion_handles_string_values(self):
        """Test that string FPS values are correctly converted to float."""
        # Create video with string FPS (simulating database inconsistency)
        video_with_string_fps = VideoFile.objects.create(
            original_file_name="string_fps_video.mp4",
            fps="30.0",  # String instead of float
            frame_dir="/tmp/test_frames_2",
            center=self.center  # Add required center
        )
        
        LabelVideoSegment.objects.create(
            video_file=video_with_string_fps,
            label=self.label_nbi,
            start_frame_number=30,
            end_frame_number=60,
            prediction_meta=self.prediction_meta
        )
        
        url = f"/api/videos/{video_with_string_fps.id}/labels/nbi/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify time calculation works with string FPS
        segment = data["time_segments"][0]
        self.assertEqual(segment["start_time"], 1.0)  # 30/30 fps
        self.assertEqual(segment["end_time"], 2.0)    # 60/30 fps

    def test_path_handling_with_different_frame_dir_types(self):
        """Test path handling with various frame_dir configurations."""
        test_cases = [
            ("/tmp/frames", "string path"),
            (Path("/tmp/frames"), "Path object"),
            (None, "None value"),
            ("", "empty string"),
        ]
        
        for frame_dir_value, description in test_cases:
            with self.subTest(frame_dir=description):
                video = VideoFile.objects.create(
                    original_file_name=f"test_{description.replace(' ', '_')}.mp4",
                    fps=25.0,
                    frame_dir=frame_dir_value,
                    center=self.center  # Add required center
                )
                
                LabelVideoSegment.objects.create(
                    video_file=video,
                    label=self.label_nbi,
                    start_frame_number=10,
                    end_frame_number=20,
                    prediction_meta=self.prediction_meta
                )
                
                url = f"/api/videos/{video.id}/labels/nbi/"
                response = self.client.get(url)
                
                # Should never return 500, even with problematic paths
                self.assertNotEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                
                data = response.json()
                segment = data["time_segments"][0]
                frame_data = list(segment["frames"].values())[0]
                
                # frame_file_path should be a string (may be empty)
                self.assertIsInstance(frame_data["frame_file_path"], str)

    def test_segment_json_schema_unchanged(self):
        """Verify that segment JSON schema remains unchanged for frontend compatibility."""
        url = f"/api/videos/{self.video.id}/labels/nbi/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify top-level schema
        expected_top_level = {"label", "time_segments", "frame_predictions"}
        self.assertEqual(set(data.keys()), expected_top_level)
        
        # Verify segment schema
        segment = data["time_segments"][0]
        expected_segment_fields = {
            "segment_id", "segment_start", "segment_end", 
            "start_time", "end_time", "frames"
        }
        self.assertEqual(set(segment.keys()), expected_segment_fields)
        
        # Verify frame schema
        frame_data = list(segment["frames"].values())[0]
        expected_frame_fields = {"frame_filename", "frame_file_path", "predictions"}
        self.assertEqual(set(frame_data.keys()), expected_frame_fields)
        
        # Verify prediction schema
        prediction = frame_data["predictions"]
        expected_prediction_fields = {"frame_number", "label", "confidence"}
        self.assertEqual(set(prediction.keys()), expected_prediction_fields)

    def test_error_logging_without_500_responses(self):
        """Test that path errors are logged as warnings but don't cause 500 responses."""
        # Create a video with a problematic frame_dir that might cause path issues
        video = VideoFile.objects.create(
            original_file_name="problematic_video.mp4",
            fps=25.0,
            frame_dir=123,  # Invalid type that could cause issues
            center=self.center  # Add required center
        )
        
        LabelVideoSegment.objects.create(
            video_file=video,
            label=self.label_nbi,
            start_frame_number=10,
            end_frame_number=20,
            prediction_meta=self.prediction_meta
        )
        
        with self.assertLogs('endoreg_db.views.video_segmentation_views', level='WARNING') as cm:
            url = f"/api/videos/{video.id}/labels/nbi/"
            response = self.client.get(url)
            
            # Should return 200, not 500
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Check that warning was logged
            warning_logged = any('Could not construct frame path' in record for record in cm.output)
            self.assertTrue(warning_logged, "Expected warning about frame path construction")

    @patch('endoreg_db.views.video_segmentation_views.Path')
    def test_video_label_view_handles_path_errors(self, mock_path):
        """Test that path construction errors are handled gracefully."""
        # Mock Path to raise an exception
        mock_path.side_effect = Exception("Path construction failed")
        
        url = f"/api/videos/{self.video.id}/labels/nbi/"
        response = self.client.get(url)
        
        # Should still return 200 but with empty frame_file_path
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify segments exist but frame paths are empty
        self.assertEqual(len(data["time_segments"]), 1)
        segment = data["time_segments"][0]
        frame_data = list(segment["frames"].values())[0]
        self.assertEqual(frame_data["frame_file_path"], "")

    def test_permission_layer_intact(self):
        """Test that permission layer remains intact (403 responses work correctly)."""
        # Test unauthenticated request to a protected endpoint
        # Note: VideoLabelView allows anonymous access, so we test a different endpoint
        
        # For now, verify that our changes don't break the response structure
        url = f"/api/videos/{self.video.id}/labels/nbi/"
        response = self.client.get(url)
        
        # Should work fine with current permissions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # TODO: Add test for endpoints that actually require authentication
        # when such endpoints are identified in the permission structure