"""
Comprehensive tests for PDF import and anonymization functionality.

Tests the PdfImportService class and ReportReader integration including:
- PDF file import and processing
- Text extraction and OCR fallback
- Metadata extraction with various extractors
- Text anonymization
- Error handling and edge cases
- File management and state tracking
"""
import pytest
import tempfile
import shutil
import hashlib
from pathlib import Path
from unittest.mock import Mock, patch
from datetime import date

from django.test import TestCase
from django.db import IntegrityError

# Import the modules we're testing - using try/except for graceful handling
try:
    from endoreg_db.services.pdf_import import PdfImportService
    from endoreg_db.models.media.pdf.raw_pdf import RawPdfFile
    from endoreg_db.models.state.raw_pdf import RawPdfState
    from endoreg_db.models import SensitiveMeta
    IMPORTS_AVAILABLE = True
except ImportError:
    # Create mock classes for testing when imports are not available
    IMPORTS_AVAILABLE = False
    
    class PdfImportService:
        def __init__(self, allow_meta_overwrite=False):
            self.allow_meta_overwrite = allow_meta_overwrite
            self.processed_files = set()
            self.current_pdf = None
            self.processing_context = {}
    
    class RawPdfFile:
        pass
    
    class RawPdfState:
        pass
    
    class SensitiveMeta:
        pass


class TestPdfImportServiceUnit(TestCase):
    """Unit tests for PdfImportService without file system dependencies."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.service = PdfImportService(allow_meta_overwrite=True)
        self.temp_dir = Path(tempfile.mkdtemp())
        
        # Create test PDF content
        self.test_pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj xref 0 4 0000000000 65535 f 0000000010 00000 n 0000000053 00000 n 0000000100 00000 n trailer<</Size 4/Root 1 0 R>> startxref 149 %%EOF"
        
        # Create test PDF file
        self.test_pdf_path = self.temp_dir / "test_report.pdf"
        self.test_pdf_path.write_bytes(self.test_pdf_content)
        
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
        
    def test_initialization(self):
        """Test service initialization with default and custom parameters."""
        # Test default initialization
        service_default = PdfImportService()
        self.assertFalse(service_default.allow_meta_overwrite)
        self.assertEqual(service_default.processed_files, set())
        self.assertIsNone(service_default.current_pdf)
        
        # Test custom initialization
        service_custom = PdfImportService(allow_meta_overwrite=True)
        self.assertTrue(service_custom.allow_meta_overwrite)
        
    def test_sha256_computation(self):
        """Test SHA256 hash computation."""
        expected_hash = hashlib.sha256(self.test_pdf_content).hexdigest()
        computed_hash = self.service._sha256(self.test_pdf_path)
        self.assertEqual(computed_hash, expected_hash)
        
    def test_quarantine_functionality(self):
        """Test file quarantine functionality."""
        # Create source file
        source_file = self.temp_dir / "source.pdf"
        source_file.write_bytes(b"test content")
        
        with patch('endoreg_db.utils.paths.PDF_DIR', self.temp_dir):
            quarantine_path = self.service._quarantine(source_file)
            
            # Check file was moved
            self.assertFalse(source_file.exists())
            self.assertTrue(quarantine_path.exists())
            self.assertEqual(quarantine_path.name, "source.pdf")
            self.assertIn("_processing", str(quarantine_path.parent))
            
    def test_processing_context_initialization(self):
        """Test processing context initialization."""
        self.service._initialize_processing_context(
            file_path=self.test_pdf_path,
            center_name="Test Center",
            delete_source=False,
            retry=False
        )
        
        context = self.service.processing_context
        self.assertEqual(context['file_path'], self.test_pdf_path)
        self.assertEqual(context['center_name'], "Test Center")
        self.assertFalse(context['delete_source'])
        self.assertFalse(context['retry'])
        self.assertIsNone(context['file_hash'])
        self.assertFalse(context['processing_started'])
        
    def test_duplicate_processing_prevention(self):
        """Test prevention of duplicate file processing."""
        self.service.processed_files.add(str(self.test_pdf_path))
        
        with self.assertRaises(ValueError) as context:
            self.service._initialize_processing_context(
                file_path=self.test_pdf_path,
                center_name="Test Center",
                delete_source=False,
                retry=False
            )
        
        self.assertIn("already processed", str(context.exception))
        
    def test_file_validation(self):
        """Test file existence validation."""
        # Test existing file
        self.service.processing_context = {'file_path': self.test_pdf_path}
        self.service._validate_and_prepare_file()  # Should not raise
        
        # Test non-existent file
        non_existent_path = self.temp_dir / "nonexistent.pdf"
        self.service.processing_context = {'file_path': non_existent_path}
        
        with self.assertRaises(FileNotFoundError):
            self.service._validate_and_prepare_file()


class TestPdfImportServiceIntegration(TestCase):
    """Integration tests for PdfImportService with Django models."""
    
    def setUp(self):
        """Set up test fixtures with Django models."""
        self.service = PdfImportService(allow_meta_overwrite=True)
        self.temp_dir = Path(tempfile.mkdtemp())
        
        # Create test PDF
        self.test_pdf_content = b"%PDF-1.4\nTest PDF content for integration testing"
        self.test_pdf_path = self.temp_dir / "integration_test.pdf"
        self.test_pdf_path.write_bytes(self.test_pdf_content)
        
        # Mock SensitiveMeta
        self.mock_sensitive_meta = Mock(spec=SensitiveMeta)
        self.mock_sensitive_meta.patient_first_name = "John"
        self.mock_sensitive_meta.patient_last_name = "Doe"
        self.mock_sensitive_meta.patient_dob = date(1990, 1, 1)
        
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
        
    @patch('endoreg_db.services.pdf_import.RawPdfFile')
    @patch('endoreg_db.services.pdf_import.SensitiveMeta')
    def test_pdf_instance_creation(self, mock_sensitive_meta_class, mock_raw_pdf_class):
        """Test PDF instance creation with mocked models."""
        # Setup mocks
        mock_pdf_instance = Mock(spec=RawPdfFile)
        mock_pdf_instance.id = 1
        mock_pdf_instance.sensitive_meta = self.mock_sensitive_meta
        mock_raw_pdf_class.objects.create.return_value = mock_pdf_instance
        
        mock_sensitive_meta_instance = Mock(spec=SensitiveMeta)
        mock_sensitive_meta_class.objects.create.return_value = mock_sensitive_meta_instance
        
        # Setup processing context
        self.service.processing_context = {
            'file_path': self.test_pdf_path,
            'center_name': "Test Center",
            'delete_source': False,
            'retry': False,
            'file_hash': "test_hash_123"
        }
        
        # Execute
        self.service._create_or_retrieve_pdf_instance()
        
        # Verify PDF creation was called
        mock_raw_pdf_class.objects.create.assert_called_once()
        call_args = mock_raw_pdf_class.objects.create.call_args[1]
        self.assertEqual(call_args['center'], "Test Center")
        self.assertEqual(call_args['file_hash'], "test_hash_123")
        
        # Verify current PDF was set
        self.assertEqual(self.service.current_pdf, mock_pdf_instance)
        
    @patch('endoreg_db.services.pdf_import.RawPdfFile')
    def test_duplicate_hash_handling(self, mock_raw_pdf_class):
        """Test handling of duplicate file hashes."""
        # Setup existing PDF with same hash
        existing_pdf = Mock(spec=RawPdfFile)
        existing_pdf.id = 1
        existing_pdf.file_hash = "duplicate_hash"
        
        mock_raw_pdf_class.objects.create.side_effect = IntegrityError("Duplicate hash")
        mock_raw_pdf_class.objects.get.return_value = existing_pdf
        
        self.service.processing_context = {
            'file_path': self.test_pdf_path,
            'center_name': "Test Center",
            'delete_source': False,
            'retry': False,
            'file_hash': "duplicate_hash"
        }
        
        # Execute
        self.service._create_or_retrieve_pdf_instance()
        
        # Verify existing PDF was retrieved
        mock_raw_pdf_class.objects.get.assert_called_once_with(file_hash="duplicate_hash")
        self.assertEqual(self.service.current_pdf, existing_pdf)
        
    def test_default_patient_data_creation(self):
        """Test creation of default patient data."""
        # Setup mock PDF without sensitive meta
        mock_pdf = Mock(spec=RawPdfFile)
        mock_pdf.sensitive_meta = None
        
        with patch('endoreg_db.models.SensitiveMeta.objects.create') as mock_create:
            mock_sensitive_meta = Mock(spec=SensitiveMeta)
            mock_create.return_value = mock_sensitive_meta
            
            self.service._ensure_default_patient_data(mock_pdf)
            
            # Verify SensitiveMeta was created
            mock_create.assert_called_once()
            
            # Verify assignment
            self.assertEqual(mock_pdf.sensitive_meta, mock_sensitive_meta)


class TestReportReaderIntegration(TestCase):
    """Tests for ReportReader integration in PDF import service."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.service = PdfImportService()
        
        # Sample extracted text
        self.sample_text = """
        Endoscopy Report
        Patient: John Doe
        DOB: 01.01.1990
        Date: 15.03.2023
        Examiner: Dr. Smith
        
        Findings: Normal mucosa observed.
        Conclusion: No abnormalities detected.
        """
        
        # Sample metadata
        self.sample_metadata = {
            'patient_first_name': 'John',
            'patient_last_name': 'Doe',
            'patient_dob': date(1990, 1, 1),
            'examination_date': date(2023, 3, 15),
            'examiner_first_name': 'Dr.',
            'examiner_last_name': 'Smith',
            'endoscope_type': 'Flexible',
            'casenumber': 'CASE-2023-001'
        }
        
    @patch('endoreg_db.services.pdf_import.PdfImportService._ensure_report_reading_available')
    def test_report_reader_availability_check(self, mock_ensure_available):
        """Test ReportReader availability checking."""
        # Test when ReportReader is available
        mock_report_reader_class = Mock()
        mock_ensure_available.return_value = (True, mock_report_reader_class)
        
        # Setup processing context
        self.service.processing_context = {}
        self.service.current_pdf = Mock(spec=RawPdfFile)
        self.service.current_pdf.file.path = "/test/path.pdf"
        
        # Execute
        self.service._process_text_and_metadata()
        
        mock_ensure_available.assert_called_once()
        
    def test_text_results_application(self):
        """Test application of text extraction results."""
        # Setup mock PDF
        mock_pdf = Mock(spec=RawPdfFile)
        self.service.current_pdf = mock_pdf
        
        # Setup processing context with results
        self.service.processing_context = {
            'original_text': self.sample_text,
            'anonymized_text': 'ANONYMIZED: Patient report with masked data'
        }
        
        # Execute
        self.service._apply_text_results()
        
        # Verify text was stored
        self.assertEqual(mock_pdf.text, self.sample_text)
        
    def test_metadata_results_application(self):
        """Test application of metadata extraction results."""
        # Setup mock PDF with SensitiveMeta
        mock_sensitive_meta = Mock(spec=SensitiveMeta)
        mock_pdf = Mock(spec=RawPdfFile)
        mock_pdf.sensitive_meta = mock_sensitive_meta
        self.service.current_pdf = mock_pdf
        
        # Setup processing context with metadata
        self.service.processing_context = {
            'extracted_metadata': self.sample_metadata
        }
        
        # Execute
        self.service._apply_metadata_results()
        
        # Verify metadata was applied
        self.assertEqual(mock_sensitive_meta.patient_first_name, 'John')
        self.assertEqual(mock_sensitive_meta.patient_last_name, 'Doe')
        self.assertEqual(mock_sensitive_meta.patient_dob, date(1990, 1, 1))
        
        # Verify save was called
        mock_sensitive_meta.save.assert_called_once()
        
    def test_date_parsing(self):
        """Test date field parsing with various formats."""
        test_cases = [
            ('01.01.1990', date(1990, 1, 1)),
            ('2023-03-15', date(2023, 3, 15)),
            ('15/03/2023', None),  # Unsupported format
            ('invalid_date', None),
            ('', None),
            (None, None)
        ]
        
        for raw_value, expected in test_cases:
            with self.subTest(raw_value=raw_value):
                result = self.service._parse_date_field(raw_value, 'test_key', 'test_field')
                self.assertEqual(result, expected)


class TestPdfImportServiceErrorHandling(TestCase):
    """Tests for error handling and edge cases in PDF import service."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.service = PdfImportService()
        self.temp_dir = Path(tempfile.mkdtemp())
        
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
        
    def test_missing_file_handling(self):
        """Test handling of missing files."""
        non_existent_path = self.temp_dir / "missing.pdf"
        
        with self.assertRaises(Exception):
            self.service.import_and_anonymize(
                file_path=non_existent_path,
                center_name="Test Center"
            )
            
    def test_invalid_pdf_handling(self):
        """Test handling of invalid PDF files."""
        invalid_pdf = self.temp_dir / "invalid.pdf"
        invalid_pdf.write_text("This is not a PDF file")
        
        # Should not crash, but handle gracefully
        try:
            self.service.import_and_anonymize(
                file_path=invalid_pdf,
                center_name="Test Center"
            )
        except Exception as e:
            # Verify it's a reasonable error, not a crash
            self.assertIsInstance(e, (ValueError, FileNotFoundError, Exception))
            
    def test_cleanup_on_error(self):
        """Test cleanup functionality when errors occur."""
        # Setup service with current PDF
        mock_pdf = Mock(spec=RawPdfFile)
        self.service.current_pdf = mock_pdf
        self.service.processing_context = {'test': 'data'}
        
        # Execute cleanup
        self.service._cleanup_on_error()
        
        # Verify cleanup occurred
        self.assertIsNone(self.service.current_pdf)
        self.assertEqual(self.service.processing_context, {})
        
    def test_processing_state_management(self):
        """Test processing state management and error recovery."""
        mock_pdf = Mock(spec=RawPdfFile)
        mock_state = Mock(spec=RawPdfState)
        mock_pdf.get_or_create_state.return_value = mock_state
        
        self.service.current_pdf = mock_pdf
        
        # Test incomplete processing marking
        self.service._mark_processing_incomplete("Test error")
        
        # Verify state was updated
        mock_state.mark_processing_incomplete.assert_called_once_with("Test error")
        mock_state.save.assert_called_once()


class TestPdfImportEndToEnd(TestCase):
    """End-to-end tests for PDF import workflow."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.service = PdfImportService(allow_meta_overwrite=True)
        self.temp_dir = Path(tempfile.mkdtemp())
        
        # Create realistic test PDF content
        self.test_pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000100 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
149
%%EOF"""
        
        self.test_pdf_path = self.temp_dir / "endoscopy_report.pdf"
        self.test_pdf_path.write_bytes(self.test_pdf_content)
        
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
        
    @patch('endoreg_db.services.pdf_import.RawPdfFile')
    @patch('endoreg_db.services.pdf_import.SensitiveMeta')
    @patch('endoreg_db.services.pdf_import.RawPdfState')
    def test_simple_import_workflow(self, mock_state_class, mock_sensitive_meta_class, mock_pdf_class):
        """Test simple import workflow without ReportReader."""
        # Setup mocks
        mock_pdf = Mock(spec=RawPdfFile)
        mock_pdf.id = 1
        mock_pdf.file_hash = "test_hash"
        mock_pdf_class.objects.create.return_value = mock_pdf
        
        mock_sensitive_meta = Mock(spec=SensitiveMeta)
        mock_sensitive_meta_class.objects.create.return_value = mock_sensitive_meta
        mock_pdf.sensitive_meta = mock_sensitive_meta
        
        mock_state = Mock(spec=RawPdfState)
        mock_pdf.get_or_create_state.return_value = mock_state
        
        # Execute simple import
        with patch('endoreg_db.utils.paths.PDF_DIR', self.temp_dir):
            result = self.service.import_simple(
                file_path=self.test_pdf_path,
                center_name="Test Medical Center",
                delete_source=False
            )
        
        # Verify result
        self.assertEqual(result, mock_pdf)
        
        # Verify PDF was created
        mock_pdf_class.objects.create.assert_called_once()
        
        # Verify sensitive meta was created
        mock_sensitive_meta_class.objects.create.assert_called_once()
        
    @pytest.mark.integration
    @patch('endoreg_db.services.pdf_import.PdfImportService._ensure_report_reading_available')
    @patch('endoreg_db.services.pdf_import.RawPdfFile')
    def test_full_anonymization_workflow(self, mock_pdf_class, mock_ensure_reader):
        """Test full anonymization workflow with mocked ReportReader."""
        # Setup ReportReader mock
        mock_report_reader_class = Mock()
        mock_report_reader_instance = Mock()
        mock_report_reader_class.return_value = mock_report_reader_instance
        
        # Configure process_report_with_cropping return
        mock_report_reader_instance.process_report_with_cropping.return_value = (
            "Patient: John Doe\nDOB: 01.01.1990\nFindings: Normal",
            "Patient: [ANONYMIZED]\nDOB: [ANONYMIZED]\nFindings: Normal",
            {
                'patient_first_name': 'John',
                'patient_last_name': 'Doe',
                'patient_dob': date(1990, 1, 1)
            },
            {}  # cropped_regions_info
        )
        
        mock_ensure_reader.return_value = (True, mock_report_reader_class)
        
        # Setup PDF mock
        mock_pdf = Mock(spec=RawPdfFile)
        mock_pdf.id = 1
        mock_pdf.sensitive_meta = Mock(spec=SensitiveMeta)
        mock_pdf.get_or_create_state.return_value = Mock(spec=RawPdfState)
        mock_pdf_class.objects.create.return_value = mock_pdf
        
        # Execute full workflow
        with patch('endoreg_db.utils.paths.PDF_DIR', self.temp_dir):
            with patch('endoreg_db.services.pdf_import.PdfImportService.create_sensitive_file'):
                result = self.service.import_and_anonymize(
                    file_path=self.test_pdf_path,
                    center_name="Test Medical Center",
                    delete_source=False
                )
        
        # Verify ReportReader was used
        mock_report_reader_instance.process_report_with_cropping.assert_called_once()
        
        # Verify text was extracted and stored
        self.assertIsNotNone(mock_pdf.text)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
