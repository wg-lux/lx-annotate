#!/usr/bin/env python3
"""
Test script to reproduce and fix the gibberish OCR issue.

This script:
1. Tests the current OCR pipeline with problematic frames
2. Demonstrates the gibberish issue
3. Shows improvements with the enhanced components
4. Provides before/after comparisons
"""

import cv2
import numpy as np
import logging
from pathlib import Path
import sys
import os

# Add project paths
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "libs" / "lx-anonymizer"))

from enhanced_frame_ocr import DiagnosticFrameOCR
from enhanced_best_frame_text import EnhancedBestFrameText

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_test_frame_with_text():
    """Create a synthetic test frame with medical overlay text."""
    # Create a black frame (simulating endoscopy video)
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # Add white text overlay (simulating medical information)
    text_overlay = np.ones((60, 400, 3), dtype=np.uint8) * 255
    
    # Use OpenCV to add text
    cv2.putText(text_overlay, "Patient: Max Mustermann", (10, 20), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    cv2.putText(text_overlay, "Geb.: 15.03.1980", (10, 40), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    cv2.putText(text_overlay, "Fall-Nr: 12345", (250, 20), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    cv2.putText(text_overlay, "Datum: 07.10.2025", (250, 40), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    
    # Place overlay on frame (top-left corner)
    frame[10:70, 10:410] = text_overlay
    
    return frame

def create_problematic_frame():
    """Create a frame that typically produces gibberish OCR results."""
    # Create a noisy, low-contrast frame
    frame = np.random.randint(50, 200, (480, 640, 3), dtype=np.uint8)
    
    # Add some very small, unclear text
    overlay = np.ones((30, 300, 3), dtype=np.uint8) * 128
    
    # Add noise and make text barely visible
    noise = np.random.randint(-30, 30, overlay.shape, dtype=np.int32)
    overlay = np.clip(overlay.astype(np.int32) + noise, 0, 255).astype(np.uint8)
    
    # Add very small text that will be hard to OCR
    cv2.putText(overlay, "tiny unclear text", (5, 15), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.3, (200, 200, 200), 1)
    
    frame[50:80, 50:350] = overlay
    
    return frame

def test_ocr_comparison():
    """Test OCR with original vs enhanced methods."""
    logger.info("🚀 Starting OCR comparison test")
    
    # Create test frames
    good_frame = create_test_frame_with_text()
    bad_frame = create_problematic_frame()
    
    # Test with original settings (simulated)
    logger.info("\n📊 Testing ORIGINAL OCR configuration:")
    original_ocr = DiagnosticFrameOCR(enable_diagnostics=True)
    
    # Test good frame
    text1, conf1, _ = original_ocr.extract_text_from_frame(good_frame, frame_id=1)
    logger.info(f"Good frame: '{text1}' (conf: {conf1:.2f})")
    
    # Test problematic frame
    text2, conf2, _ = original_ocr.extract_text_from_frame(bad_frame, frame_id=2)
    logger.info(f"Bad frame: '{text2}' (conf: {conf2:.2f})")
    
    # Test with enhanced settings
    logger.info("\n🔧 Testing ENHANCED OCR configuration (OCR_FIX_V1=1):")
    os.environ['OCR_FIX_V1'] = '1'
    
    enhanced_ocr = DiagnosticFrameOCR(enable_diagnostics=True)
    
    # Test good frame with enhancement
    text3, conf3, _ = enhanced_ocr.extract_text_from_frame(good_frame, frame_id=3)
    logger.info(f"Good frame (enhanced): '{text3}' (conf: {conf3:.2f})")
    
    # Test problematic frame with enhancement
    text4, conf4, _ = enhanced_ocr.extract_text_from_frame(bad_frame, frame_id=4)
    logger.info(f"Bad frame (enhanced): '{text4}' (conf: {conf4:.2f})")
    
    # Compare results
    logger.info("\n📈 COMPARISON RESULTS:")
    logger.info(f"Good frame improvement: {conf3:.2f} vs {conf1:.2f} ({conf3-conf1:+.2f})")
    logger.info(f"Bad frame improvement: {conf4:.2f} vs {conf2:.2f} ({conf4-conf2:+.2f})")
    
    return {
        'original': {'good': (text1, conf1), 'bad': (text2, conf2)},
        'enhanced': {'good': (text3, conf3), 'bad': (text4, conf4)}
    }

def test_best_frame_text_selection():
    """Test the enhanced BestFrameText selection."""
    logger.info("\n🎯 Testing BestFrameText selection")
    
    # Create original selector
    original_selector = EnhancedBestFrameText()
    
    # Create enhanced selector
    os.environ['OCR_FIX_V1'] = '1'
    enhanced_selector = EnhancedBestFrameText()
    
    # Test data: mix of good and gibberish text
    test_samples = [
        ("Patient: Max Mustermann, geb. 15.03.1980", 0.85, False),
        ("äälgii;i%}%liig„ipärr'..t", 0.15, False),
        ("Fall-Nr: 12345, Datum: 07.10.2025", 0.78, True),
        ("';;;f.\"j;i;i;';_.'", 0.05, False),
        ("Dr. Schmidt, Untersuchung Endoskopie", 0.92, False),
        ("?il';.i'.l:;f;;\"'.\"-", 0.12, False),
        ("Herr Weber, 45 Jahre alt", 0.88, False),
    ]
    
    # Feed samples to both selectors
    for text, conf, sensitive in test_samples:
        original_selector.push(text, conf, sensitive)
        enhanced_selector.push(text, conf, sensitive)
    
    # Get results
    original_result = original_selector.reduce()
    enhanced_result = enhanced_selector.reduce()
    
    logger.info(f"Original selection: '{original_result['best'][:50]}...'")
    logger.info(f"Enhanced selection: '{enhanced_result['best'][:50]}...'")
    
    # Get diagnostic info
    original_diag = original_selector.get_diagnostic_info()
    enhanced_diag = enhanced_selector.get_diagnostic_info()
    
    logger.info(f"Original: {original_diag['total_samples']} samples, "
               f"avg quality: {original_diag.get('avg_quality_score', 0):.2f}")
    logger.info(f"Enhanced: {enhanced_diag['total_samples']} samples, "
               f"avg quality: {enhanced_diag.get('avg_quality_score', 0):.2f}")
    
    return {
        'original': original_result,
        'enhanced': enhanced_result,
        'diagnostics': {'original': original_diag, 'enhanced': enhanced_diag}
    }

def run_integration_test():
    """Run a complete integration test simulating the frame cleaning pipeline."""
    logger.info("\n🔗 Running integration test")
    
    # Simulate frame cleaning process
    frames = [
        create_test_frame_with_text(),
        create_problematic_frame(),
        create_test_frame_with_text(),  # Duplicate good frame
        create_problematic_frame(),     # Duplicate bad frame
    ]
    
    # Test with original pipeline (OCR_FIX_V1=0)
    os.environ['OCR_FIX_V1'] = '0'
    
    original_ocr = DiagnosticFrameOCR(enable_diagnostics=True)
    original_selector = EnhancedBestFrameText()
    
    logger.info("Processing with ORIGINAL pipeline:")
    for i, frame in enumerate(frames):
        text, conf, _ = original_ocr.extract_text_from_frame(frame, frame_id=i)
        original_selector.push(text, conf, False)
        logger.info(f"Frame {i}: '{text[:30]}...' (conf: {conf:.2f})")
    
    original_result = original_selector.reduce()
    
    # Test with enhanced pipeline (OCR_FIX_V1=1)
    os.environ['OCR_FIX_V1'] = '1'
    
    enhanced_ocr = DiagnosticFrameOCR(enable_diagnostics=True)
    enhanced_selector = EnhancedBestFrameText()
    
    logger.info("\nProcessing with ENHANCED pipeline:")
    for i, frame in enumerate(frames):
        text, conf, _ = enhanced_ocr.extract_text_from_frame(frame, frame_id=i+10)
        enhanced_selector.push(text, conf, False)
        logger.info(f"Frame {i}: '{text[:30]}...' (conf: {conf:.2f})")
    
    enhanced_result = enhanced_selector.reduce()
    
    logger.info("\n📊 FINAL RESULTS:")
    logger.info(f"Original representative text: '{original_result['best'][:100]}...'")
    logger.info(f"Enhanced representative text: '{enhanced_result['best'][:100]}...'")
    
    # Check for gibberish patterns
    original_gibberish = check_gibberish(original_result['best'])
    enhanced_gibberish = check_gibberish(enhanced_result['best'])
    
    logger.info(f"Original text gibberish score: {original_gibberish:.2f}")
    logger.info(f"Enhanced text gibberish score: {enhanced_gibberish:.2f}")
    
    improvement = original_gibberish - enhanced_gibberish
    logger.info(f"Gibberish improvement: {improvement:+.2f} {'✅' if improvement > 0.2 else '❌'}")
    
    return {
        'original_text': original_result['best'],
        'enhanced_text': enhanced_result['best'],
        'original_gibberish': original_gibberish,
        'enhanced_gibberish': enhanced_gibberish,
        'improvement': improvement
    }

def check_gibberish(text: str) -> float:
    """Calculate gibberish score for text (0.0 = clean, 1.0 = gibberish)."""
    if not text:
        return 1.0
    
    import re
    import unicodedata
    
    text = unicodedata.normalize("NFKC", text)
    
    # Character analysis
    punct_chars = r"""!@#$%^&*()_+{}|:"<>?`~[]\;',./§°^""‚''–—•…"""
    punct_ratio = sum(1 for ch in text if ch in punct_chars) / len(text)
    
    # Word analysis
    words = re.findall(r"[A-Za-zÄÖÜäöüß]{2,}", text)
    readable_words = [w for w in words if len(w) >= 3 and not all(c == w[0] for c in w)]
    
    # Gibberish indicators
    gibberish_score = 0.0
    
    if punct_ratio > 0.5:
        gibberish_score += 0.4
    
    if len(readable_words) == 0:
        gibberish_score += 0.3
    
    repeated_chars = len(re.findall(r"(.)\1{3,}", text))
    if repeated_chars > 2:
        gibberish_score += 0.2
    
    special_symbols = sum(1 for ch in text if ord(ch) > 127 and not ch.isalpha())
    if special_symbols > len(text) * 0.2:
        gibberish_score += 0.1
    
    return min(1.0, gibberish_score)

def main():
    """Main test function."""
    logger.info("🔍 OCR Gibberish Diagnostic Test Suite")
    logger.info("=" * 60)
    
    try:
        # Test 1: OCR comparison
        ocr_results = test_ocr_comparison()
        
        # Test 2: BestFrameText selection
        selection_results = test_best_frame_text_selection()
        
        # Test 3: Integration test
        integration_results = run_integration_test()
        
        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("📋 TEST SUMMARY")
        logger.info("=" * 60)
        
        if integration_results['improvement'] > 0.2:
            logger.info("✅ SUCCESS: Enhanced pipeline significantly reduces gibberish")
            logger.info(f"   Gibberish reduction: {integration_results['improvement']:.2f}")
        else:
            logger.info("❌ PARTIAL: Enhancement shows some improvement but may need tuning")
            logger.info(f"   Gibberish reduction: {integration_results['improvement']:.2f}")
        
        logger.info(f"\nTo enable the fix in production:")
        logger.info(f"   export OCR_FIX_V1=1")
        logger.info(f"\nDiagnostic files saved to: ./debug/ocr/")
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
