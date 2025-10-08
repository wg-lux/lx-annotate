#!/usr/bin/env python3
"""
Test OCR Pipeline Components
Tests each stage of the OCR processing to identify bottlenecks or failures
"""

import sys
import cv2
import numpy as np
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

# Add libs to path
sys.path.insert(0, str(Path(__file__).parent / "libs" / "lx-anonymizer"))

from lx_anonymizer.frame_ocr import FrameOCR
from lx_anonymizer.frame_metadata_extractor import FrameMetadataExtractor

# Sample OCR text that should be extracted from a medical video frame
SAMPLE_GOOD_TEXT = """
Patient: Max Mustermann
Geburtsdatum: 21.03.1994
Untersuchung: 15.02.2024
Untersucher: Dr. Schmidt
Fallnr: 12345
"""

SAMPLE_NOISY_TEXT = """
P a t i e n t : M a x M u s t e r m a n n
G e b u r t s d a t u m : 2 1 . 0 3 . 1 9 9 4
U n t e r s u c h u n g : 1 5 . 0 2 . 2 0 2 4
U n t e r s u c h e r : D r . S c h m i d t
"""

SAMPLE_GIBBERISH = """
- n - T - y - o F A gi P x . .. n lrib .r . .- - . .. L N - I x E o E N e . . ä C . . - q L
P@t!ent: M@x Mu$t3rm@nn
G3burt$d@tum: 21.03.1994
"""

def test_metadata_extraction():
    """Test metadata extraction from different text samples"""
    print("=" * 80)
    print("TESTING METADATA EXTRACTION")
    print("=" * 80)
    
    extractor = FrameMetadataExtractor()
    
    test_cases = [
        ("GOOD TEXT", SAMPLE_GOOD_TEXT),
        ("NOISY TEXT", SAMPLE_NOISY_TEXT),
        ("GIBBERISH", SAMPLE_GIBBERISH),
    ]
    
    for name, text in test_cases:
        print(f"\n{name}:")
        print("-" * 40)
        print(f"Input text:\n{text[:100]}...")
        
        try:
            metadata = extractor.extract_metadata_from_frame_text(text)
            print(f"\nExtracted metadata:")
            for key, value in metadata.items():
                if value not in (None, "", "Unknown"):
                    print(f"  {key}: {value}")
            
            # Check what's considered sensitive
            is_sensitive = extractor.is_sensitive_content(metadata)
            print(f"\nIs sensitive: {is_sensitive}")
            
            # Count extracted fields
            valid_fields = sum(1 for v in metadata.values() if v not in (None, "", "Unknown"))
            print(f"Valid fields extracted: {valid_fields}/{len(metadata)}")
            
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()

def test_frame_preprocessing():
    """Test image preprocessing quality"""
    print("\n" + "=" * 80)
    print("TESTING FRAME PREPROCESSING")
    print("=" * 80)
    
    # Create synthetic test frame (simulating grayscale video frame with text)
    frame = np.ones((480, 640), dtype=np.uint8) * 128  # Mid-gray background
    
    # Add some "text-like" regions with varying contrast
    frame[100:120, 100:300] = 200  # High contrast "text"
    frame[150:170, 100:300] = 140  # Low contrast "text"
    frame[200:220, 100:300] = 180  # Medium contrast "text"
    
    # Add noise
    noise = np.random.randint(-20, 20, frame.shape, dtype=np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    print(f"\nOriginal frame stats:")
    print(f"  Shape: {frame.shape}")
    print(f"  Dtype: {frame.dtype}")
    print(f"  Mean: {frame.mean():.2f}")
    print(f"  Std: {frame.std():.2f}")
    print(f"  Min: {frame.min()}, Max: {frame.max()}")
    
    try:
        ocr = FrameOCR()
        
        # Test preprocessing
        print("\nTesting preprocessing...")
        pil_image = ocr.preprocess_frame_for_ocr(frame, roi=None)
        
        print(f"Preprocessed image:")
        print(f"  Mode: {pil_image.mode}")
        print(f"  Size: {pil_image.size}")
        
        # Convert back to numpy for stats
        processed_array = np.array(pil_image)
        print(f"  Mean: {processed_array.mean():.2f}")
        print(f"  Std: {processed_array.std():.2f}")
        print(f"  Min: {processed_array.min()}, Max: {processed_array.max()}")
        
        # Test if preprocessing is actually applied
        diff = np.abs(processed_array.astype(float) - frame.astype(float)).mean()
        print(f"\nMean difference from original: {diff:.2f}")
        if diff < 1.0:
            print("  ⚠️  WARNING: Preprocessing seems to have minimal effect!")
        else:
            print("  ✓ Preprocessing is modifying the image")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

def test_ocr_with_synthetic_frame():
    """Test OCR on synthetic frame with known text"""
    print("\n" + "=" * 80)
    print("TESTING OCR WITH SYNTHETIC FRAME")
    print("=" * 80)
    
    # Create a simple synthetic frame with clear text
    # For this test, we'll create a white background with black text
    frame = np.ones((200, 800, 3), dtype=np.uint8) * 255  # White background
    
    # Add text using OpenCV
    text = "Patient: Max Mustermann"
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(frame, text, (50, 100), font, 1, (0, 0, 0), 2, cv2.LINE_AA)
    
    # Convert to grayscale
    gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    print(f"Synthetic frame created:")
    print(f"  Shape: {gray_frame.shape}")
    print(f"  Expected text: '{text}'")
    
    try:
        ocr = FrameOCR()
        
        # Test with preprocessing enabled
        print("\nTesting OCR with preprocessing...")
        extracted_text, confidence, ocr_data = ocr.extract_text_from_frame(
            gray_frame, 
            roi=None, 
            high_quality=True
        )
        
        print(f"  Extracted text: '{extracted_text}'")
        print(f"  Confidence: {confidence:.3f}")
        print(f"  Text match: {text.lower() in extracted_text.lower()}")
        
        # Check if preprocessing was used
        if hasattr(ocr, '_extract_text_pytesseract'):
            print("\n  Testing direct pytesseract (should use preprocessing)...")
            extracted_text_pt, confidence_pt, _ = ocr._extract_text_pytesseract(
                gray_frame,
                roi=None,
                high_quality=True
            )
            print(f"    Text: '{extracted_text_pt}'")
            print(f"    Confidence: {confidence_pt:.3f}")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

def test_merge_metadata():
    """Test metadata merging logic"""
    print("\n" + "=" * 80)
    print("TESTING METADATA MERGING")
    print("=" * 80)
    
    extractor = FrameMetadataExtractor()
    
    # Simulate accumulated metadata over multiple frames
    base = {
        "patient_first_name": None,
        "patient_last_name": None,
        "patient_dob": None,
        "patient_gender": "M",  # Found in frame 1
        "casenumber": None,
        "examination_date": None,
        "examination_time": None,
        "examiner": None,
    }
    
    # Frame 2: Found patient name
    frame2 = {
        "patient_first_name": "Max",
        "patient_last_name": "Mustermann",
        "patient_dob": None,
        "patient_gender": None,
        "casenumber": None,
        "examination_date": None,
        "examination_time": None,
        "examiner": None,
    }
    
    # Frame 3: Found date but also garbage examiner
    frame3 = {
        "patient_first_name": None,
        "patient_last_name": None,
        "patient_dob": "1994-03-21",
        "patient_gender": None,
        "casenumber": None,
        "examination_date": "2024-02-15",
        "examination_time": None,
        "examiner": "- n - T - y - o F A gi P x",  # Should be rejected
    }
    
    # Frame 4: Found valid examiner
    frame4 = {
        "patient_first_name": None,
        "patient_last_name": None,
        "patient_dob": None,
        "patient_gender": None,
        "casenumber": None,
        "examination_date": None,
        "examination_time": None,
        "examiner": "Dr. Schmidt",  # Should be accepted
    }
    
    print("\nBase metadata:")
    print(f"  {base}")
    
    result = base.copy()
    
    for i, frame_meta in enumerate([frame2, frame3, frame4], start=2):
        print(f"\nMerging frame {i} metadata:")
        print(f"  Input: {frame_meta}")
        result = extractor.merge_metadata(result, frame_meta)
        print(f"  Result: {result}")
        
        # Count valid fields
        valid_fields = sum(1 for v in result.values() if v not in (None, "", "Unknown"))
        print(f"  Valid fields: {valid_fields}/8")

def main():
    """Run all tests"""
    print("\n" + "=" * 80)
    print("OCR PIPELINE DIAGNOSTIC TESTS")
    print("=" * 80)
    
    tests = [
        ("Metadata Extraction", test_metadata_extraction),
        ("Frame Preprocessing", test_frame_preprocessing),
        ("OCR with Synthetic Frame", test_ocr_with_synthetic_frame),
        ("Metadata Merging", test_merge_metadata),
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"\n❌ Test '{test_name}' FAILED with exception:")
            print(f"   {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 80)
    print("TESTS COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()
