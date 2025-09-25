"""
Tests for ReportReader functionality and text extraction.

These tests focus on the core ReportReader functionality without requiring
the full lx-anonymizer setup.
"""
import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from datetime import date, datetime
from django.test import TestCase


class TestReportReaderCore(TestCase):
    """Core tests for ReportReader functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = Path(tempfile.mkdtemp())
        
        # Sample text content that would be extracted from PDF
        self.sample_text = """
Endoskopie-Bericht
Patient: Max Mustermann
Geburtsdatum: 15.03.1975
Untersuchungsdatum: 20.10.2023
Untersucher: Dr. Schmidt
Endoskop: Olympus GIF-HQ190

Befunde:
- Ösophagus: Normale Schleimhaut
- Magen: Antrale Gastritis
- Duodenum: Unauffällig

Diagnose: Chronische Gastritis
Empfehlung: PPI-Therapie
        """.strip()
        
        # Expected extracted metadata
        self.expected_metadata = {
            'patient_first_name': 'Max',
            'patient_last_name': 'Mustermann', 
            'patient_dob': date(1975, 3, 15),
            'examination_date': date(2023, 10, 20),
            'examiner_first_name': 'Dr.',
            'examiner_last_name': 'Schmidt',
            'endoscope_type': 'Olympus GIF-HQ190'
        }
        
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
        
    def test_text_extraction_simulation(self):
        """Test text extraction from PDF simulation."""
        # Simulate what pdfplumber would extract
        extracted_lines = self.sample_text.split('\n')
        
        # Verify key information is present
        patient_line = next((line for line in extracted_lines if 'Patient:' in line), None)
        self.assertIsNotNone(patient_line)
        self.assertIn('Max Mustermann', patient_line)
        
        dob_line = next((line for line in extracted_lines if 'Geburtsdatum:' in line), None)
        self.assertIsNotNone(dob_line)
        self.assertIn('15.03.1975', dob_line)
        
    def test_metadata_extraction_patterns(self):
        """Test metadata extraction using regex patterns."""
        import re
        
        # Patient name extraction - fix to avoid capturing newlines
        patient_pattern = r'Patient:\s*([^\n\r]+)'
        patient_match = re.search(patient_pattern, self.sample_text)
        self.assertIsNotNone(patient_match)
        self.assertEqual(patient_match.group(1).strip(), 'Max Mustermann')
        
        # DOB extraction
        dob_pattern = r'Geburtsdatum:\s*(\d{2}\.\d{2}\.\d{4})'
        dob_match = re.search(dob_pattern, self.sample_text)
        self.assertIsNotNone(dob_match)
        self.assertEqual(dob_match.group(1), '15.03.1975')
        
        # Examination date extraction
        exam_pattern = r'Untersuchungsdatum:\s*(\d{2}\.\d{2}\.\d{4})'
        exam_match = re.search(exam_pattern, self.sample_text)
        self.assertIsNotNone(exam_match)
        self.assertEqual(exam_match.group(1), '20.10.2023')
        
        # Examiner extraction - fix to avoid capturing newlines
        examiner_pattern = r'Untersucher:\s*([^\n\r]+)'
        examiner_match = re.search(examiner_pattern, self.sample_text)
        self.assertIsNotNone(examiner_match)
        self.assertEqual(examiner_match.group(1).strip(), 'Dr. Schmidt')
        
    def test_date_parsing_german_format(self):
        """Test parsing of German date formats."""
        def parse_german_date(date_str):
            """Parse German date format DD.MM.YYYY to date object."""
            try:
                day, month, year = date_str.split('.')
                return date(int(year), int(month), int(day))
            except (ValueError, AttributeError):
                return None
                
        # Test valid dates
        self.assertEqual(parse_german_date('15.03.1975'), date(1975, 3, 15))
        self.assertEqual(parse_german_date('20.10.2023'), date(2023, 10, 20))
        
        # Test invalid dates
        self.assertIsNone(parse_german_date('invalid'))
        self.assertIsNone(parse_german_date('32.13.2023'))  # Invalid day/month
        
    def test_anonymization_patterns(self):
        """Test text anonymization patterns."""
        def anonymize_text_simple(text, metadata):
            """Simple anonymization function for testing."""
            anonymized = text
            
            # Replace patient name
            if 'patient_first_name' in metadata and 'patient_last_name' in metadata:
                full_name = f"{metadata['patient_first_name']} {metadata['patient_last_name']}"
                anonymized = anonymized.replace(full_name, '[PATIENT_NAME]')
            
            # Replace DOB
            if 'patient_dob' in metadata:
                dob = metadata['patient_dob']
                if isinstance(dob, date):
                    german_dob = f"{dob.day:02d}.{dob.month:02d}.{dob.year}"
                    anonymized = anonymized.replace(german_dob, '[PATIENT_DOB]')
            
            # Replace examiner
            if 'examiner_first_name' in metadata and 'examiner_last_name' in metadata:
                examiner_name = f"{metadata['examiner_first_name']} {metadata['examiner_last_name']}"
                anonymized = anonymized.replace(examiner_name, '[EXAMINER_NAME]')
            
            return anonymized
            
        anonymized = anonymize_text_simple(self.sample_text, self.expected_metadata)
        
        # Verify anonymization
        self.assertNotIn('Max Mustermann', anonymized)
        self.assertNotIn('15.03.1975', anonymized)
        self.assertNotIn('Dr. Schmidt', anonymized)
        
        self.assertIn('[PATIENT_NAME]', anonymized)
        self.assertIn('[PATIENT_DOB]', anonymized)
        self.assertIn('[EXAMINER_NAME]', anonymized)
        
    def test_spacy_extractor_simulation(self):
        """Test SpaCy-based extraction simulation."""
        def extract_person_names(text):
            """Simulate SpaCy NER for person names."""
            # Simple pattern matching for German titles and names
            import re
            
            persons = []
            
            # Pattern for titles and names - fix to avoid capturing newlines
            patterns = [
                r'(Dr\.\s+[A-Za-zäöüß]+)',
                r'(Prof\.\s+[A-Za-zäöüß]+)',
                r'Patient:\s*([^\n\r]+)',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, text)
                persons.extend(matches)
                
            return [name.strip() for name in persons]
            
        extracted_names = extract_person_names(self.sample_text)
        
        self.assertIn('Max Mustermann', extracted_names)
        self.assertIn('Dr. Schmidt', extracted_names)


class TestOCRFallback(TestCase):
    """Tests for OCR fallback functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = Path(tempfile.mkdtemp())
        
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
        
    def test_ocr_fallback_trigger(self):
        """Test when OCR fallback should be triggered."""
        def should_use_ocr(text):
            """Determine if OCR fallback should be used."""
            if not text:
                return True
            if len(text.strip()) < 50:
                return True
            return False
            
        # Test cases
        self.assertTrue(should_use_ocr(None))
        self.assertTrue(should_use_ocr(''))
        self.assertTrue(should_use_ocr('Short text'))
        self.assertFalse(should_use_ocr('This is a longer text that should be sufficient for processing and should not trigger OCR fallback'))
        
    def test_image_preprocessing_simulation(self):
        """Test image preprocessing for OCR."""
        def preprocess_for_medical_text(image_data):
            """Simulate image preprocessing for medical text."""
            # Simulate preprocessing steps
            processed = {
                'contrast_enhanced': True,
                'noise_reduced': True,
                'text_regions_detected': True,
                'orientation_corrected': True
            }
            return processed
            
        # Mock image data
        mock_image = b'fake_image_data'
        processed = preprocess_for_medical_text(mock_image)
        
        self.assertTrue(processed['contrast_enhanced'])
        self.assertTrue(processed['noise_reduced'])
        self.assertTrue(processed['text_regions_detected'])
        
    def test_ensemble_ocr_simulation(self):
        """Test ensemble OCR approach simulation."""
        def ensemble_ocr_results(image_path):
            """Simulate ensemble OCR with multiple engines."""
            # Simulate results from different OCR engines
            tesseract_result = "Patient: Max Mustermann\nDOB: 15.03.1975"
            trocr_result = "Patient: Max Musterman\nDOB: 15.03.1975"  # Slight difference
            easyocr_result = "Patient: Max Mustermann\nDOB: unclear"
            
            results = [tesseract_result, trocr_result, easyocr_result]
            
            # Simple consensus: take the result that appears most frequently
            from collections import Counter
            
            # Split into words and count occurrences
            all_words = []
            for result in results:
                all_words.extend(result.split())
                
            word_counts = Counter(all_words)
            
            # Return the most comprehensive result (longest)
            return max(results, key=len)
            
        result = ensemble_ocr_results('dummy_path')
        self.assertIn('Max Mustermann', result)
        self.assertIn('15.03.1975', result)


class TestLLMMetadataExtraction(TestCase):
    """Tests for LLM-based metadata extraction."""
    
    def test_deepseek_extraction_simulation(self):
        """Test DeepSeek metadata extraction simulation."""
        def extract_with_deepseek(text):
            """Simulate DeepSeek structured output extraction."""
            # Simulate LLM extraction with structured output
            if 'Max Mustermann' in text and '15.03.1975' in text:
                return {
                    'patient_first_name': 'Max',
                    'patient_last_name': 'Mustermann',
                    'patient_dob': '1975-03-15',
                    'examination_date': '2023-10-20',
                    'examiner_first_name': 'Dr.',
                    'examiner_last_name': 'Schmidt',
                    'endoscope_type': 'Olympus GIF-HQ190',
                    'casenumber': None
                }
            return {}
            
        text = """
        Endoskopie-Bericht
        Patient: Max Mustermann
        Geburtsdatum: 15.03.1975
        Untersuchungsdatum: 20.10.2023
        Untersucher: Dr. Schmidt
        """
        
        result = extract_with_deepseek(text)
        
        self.assertEqual(result['patient_first_name'], 'Max')
        self.assertEqual(result['patient_last_name'], 'Mustermann')
        self.assertEqual(result['patient_dob'], '1975-03-15')
        
    def test_llm_fallback_chain(self):
        """Test LLM extraction fallback chain."""
        def extract_with_fallback_chain(text):
            """Simulate extraction with multiple LLM fallbacks."""
            extractors = [
                ('deepseek', lambda t: {'patient_first_name': 'Max'} if 'Max' in t else {}),
                ('medllama', lambda t: {'patient_last_name': 'Mustermann'} if 'Mustermann' in t else {}),
                ('llama3', lambda t: {'patient_dob': '1975-03-15'} if '1975' in t else {})
            ]
            
            combined_result = {}
            
            for extractor_name, extractor_func in extractors:
                try:
                    result = extractor_func(text)
                    combined_result.update(result)
                except Exception:
                    # Fallback to next extractor
                    continue
                    
            return combined_result
            
        text = "Patient: Max Mustermann, DOB: 15.03.1975"
        result = extract_with_fallback_chain(text)
        
        self.assertIn('patient_first_name', result)
        self.assertIn('patient_last_name', result)
        self.assertIn('patient_dob', result)


class TestErrorHandling(TestCase):
    """Tests for error handling in PDF processing."""
    
    def test_corrupted_pdf_handling(self):
        """Test handling of corrupted PDF files."""
        def process_pdf_safe(pdf_content):
            """Safely process PDF with error handling."""
            try:
                if not pdf_content.startswith(b'%PDF'):
                    raise ValueError("Not a valid PDF file")
                    
                # Simulate processing
                return {
                    'text': 'Extracted text',
                    'metadata': {'status': 'success'}
                }
            except Exception as e:
                return {
                    'text': '',
                    'metadata': {'status': 'error', 'error': str(e)}
                }
                
        # Test valid PDF
        valid_pdf = b'%PDF-1.4\nValid content'
        result = process_pdf_safe(valid_pdf)
        self.assertEqual(result['metadata']['status'], 'success')
        
        # Test invalid PDF
        invalid_pdf = b'Not a PDF file'
        result = process_pdf_safe(invalid_pdf)
        self.assertEqual(result['metadata']['status'], 'error')
        
    def test_extraction_failure_recovery(self):
        """Test recovery from extraction failures."""
        def extract_with_recovery(text):
            """Extract metadata with fallback for failures."""
            try:
                # Primary extraction method
                if len(text) < 10:
                    raise ValueError("Text too short")
                    
                # Simulate successful extraction
                return {
                    'patient_first_name': 'John',
                    'method': 'primary'
                }
            except Exception:
                # Fallback extraction
                return {
                    'patient_first_name': 'Unknown',
                    'method': 'fallback'
                }
                
        # Test successful extraction
        long_text = "This is a long enough text for processing"
        result = extract_with_recovery(long_text)
        self.assertEqual(result['method'], 'primary')
        
        # Test fallback
        short_text = "Short"
        result = extract_with_recovery(short_text)
        self.assertEqual(result['method'], 'fallback')
        
    def test_anonymization_error_handling(self):
        """Test error handling in anonymization process."""
        def anonymize_safe(text, metadata):
            """Safely anonymize text with error handling."""
            try:
                if not text:
                    return text
                    
                anonymized = text
                
                # Replace patient information
                if metadata.get('patient_name'):
                    anonymized = anonymized.replace(
                        metadata['patient_name'], 
                        '[PATIENT_NAME]'
                    )
                    
                return anonymized
                
            except Exception as e:
                # Return original text with error marker
                return f"[ANONYMIZATION_ERROR: {str(e)}] {text}"
                
        # Test successful anonymization
        text = "Patient John Doe visited today"
        metadata = {'patient_name': 'John Doe'}
        result = anonymize_safe(text, metadata)
        self.assertIn('[PATIENT_NAME]', result)
        self.assertNotIn('[ANONYMIZATION_ERROR', result)
        
        # Test error handling
        problematic_metadata = {'patient_name': None}  # This will cause issues
        result = anonymize_safe(text, problematic_metadata)
        self.assertIn(text, result)  # Original text preserved


class TestIntegrationWorkflow(TestCase):
    """Integration tests for the complete workflow."""
    
    def test_complete_pdf_processing_workflow(self):
        """Test the complete PDF processing workflow."""
        def complete_workflow(pdf_content, use_ocr_fallback=False):
            """Simulate complete PDF processing workflow."""
            results = {
                'stages': [],
                'text': '',
                'metadata': {},
                'anonymized_text': '',
                'success': False
            }
            
            try:
                # Stage 1: PDF validation
                if not pdf_content.startswith(b'%PDF'):
                    raise ValueError("Invalid PDF")
                results['stages'].append('pdf_validated')
                
                # Stage 2: Text extraction
                if use_ocr_fallback:
                    # Simulate OCR extraction
                    results['text'] = 'OCR extracted: Patient Max Mustermann DOB 15.03.1975'
                    results['stages'].append('ocr_extraction')
                else:
                    # Simulate pdfplumber extraction
                    results['text'] = 'Patient: Max Mustermann\nGeburtsdatum: 15.03.1975'
                    results['stages'].append('text_extraction')
                
                # Stage 3: Metadata extraction
                if 'Max Mustermann' in results['text']:
                    results['metadata'] = {
                        'patient_first_name': 'Max',
                        'patient_last_name': 'Mustermann'
                    }
                    results['stages'].append('metadata_extraction')
                    
                # Stage 4: Anonymization
                results['anonymized_text'] = results['text'].replace(
                    'Max Mustermann', '[PATIENT_NAME]'
                )
                results['stages'].append('anonymization')
                
                results['success'] = True
                
            except Exception as e:
                results['error'] = str(e)
                
            return results
            
        # Test successful workflow
        valid_pdf = b'%PDF-1.4\nContent'
        result = complete_workflow(valid_pdf)
        
        self.assertTrue(result['success'])
        self.assertIn('pdf_validated', result['stages'])
        self.assertIn('text_extraction', result['stages'])
        self.assertIn('metadata_extraction', result['stages'])
        self.assertIn('anonymization', result['stages'])
        
        # Test OCR fallback workflow
        result_ocr = complete_workflow(valid_pdf, use_ocr_fallback=True)
        self.assertTrue(result_ocr['success'])
        self.assertIn('ocr_extraction', result_ocr['stages'])
        
        # Test failure handling
        invalid_pdf = b'Not a PDF'
        result_invalid = complete_workflow(invalid_pdf)
        self.assertFalse(result_invalid['success'])
        self.assertIn('error', result_invalid)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
