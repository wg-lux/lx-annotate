#!/usr/bin/env python3
"""
Debug examiner validation
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "libs" / "lx-anonymizer"))

from lx_anonymizer.frame_metadata_extractor import FrameMetadataExtractor

extractor = FrameMetadataExtractor()

test_cases = [
    "Dr. Schmidt",
    "- n - T - y - o F A gi P x",
    "Schmidt",
    "Dr. M. Schmidt",
    "a - b - c - d - e - f",
    "Prof. Dr. Mueller",
]

print("Testing _is_valid_examiner():")
print("=" * 60)

for examiner in test_cases:
    result = extractor._is_valid_examiner(examiner)
    print(f"{examiner:40s} -> {result}")
    
    # Manual checks
    special_char_count = sum(1 for c in examiner if c in '.-')
    total_chars = len(examiner)
    special_ratio = special_char_count / total_chars if total_chars > 0 else 0
    
    words = examiner.split()
    valid_words = [w for w in words if len(w) >= 2 and w.replace('-', '').replace('.', '').isalpha()]
    
    print(f"  Length: {len(examiner)}, Special ratio: {special_ratio:.2f}, Valid words: {valid_words}")
    print()
