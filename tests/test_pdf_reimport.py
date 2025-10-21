#!/usr/bin/env python3
"""
Test script to verify PDF reimport functionality works correctly.
"""
import os
import sys
import django
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings_dev')
django.setup()

from endoreg_db.services.pdf_import import PdfImportService

def test_pdf_reimport():
    """Test that PDF reimport functionality works correctly."""
    
    # Create a service instance
    service = PdfImportService()
    
    # Test file path - use a file that we know exists
    test_file = Path("/home/admin/dev/lx-annotate/data/raw_pdfs/ca300ab6623217e4b570375b0fe3f315e35caf0d32968e42fc300af47891f409.pdf")
    
    if not test_file.exists():
        print(f"Test file not found: {test_file}")
        print("Please ensure a PDF file exists in the raw_pdfs directory.")
        return False
    
    print(f"Testing PDF reimport with file: {test_file}")
    
    # First import - should work normally
    print("First import attempt...")
    try:
        result1 = service.import_and_anonymize(
            file_path=test_file,
            center_name="university_hospital_wuerzburg",
            delete_source=False,
            retry=False
        )
        
        if result1:
            print(f"✅ First import successful: {result1.pdf_hash}")
        else:
            print("⚠️  First import returned None (file already being processed)")
            
    except Exception as e:
        print(f"❌ First import failed: {e}")
        return False
    
    # Second import - should handle gracefully (file already processed)
    print("\nSecond import attempt (should handle gracefully)...")
    try:
        result2 = service.import_and_anonymize(
            file_path=test_file,
            center_name="university_hospital_wuerzburg", 
            delete_source=False,
            retry=False
        )
        
        if result2:
            print(f"✅ Second import successful: {result2.pdf_hash}")
        else:
            print("✅ Second import returned None as expected (file already processed)")
            
    except ValueError as e:
        if "already being processed" in str(e):
            print("✅ Second import correctly detected duplicate processing")
        else:
            print(f"❌ Unexpected ValueError: {e}")
            return False
    except Exception as e:
        print(f"❌ Second import failed with unexpected error: {e}")
        return False
        
    # Retry import - should work with existing PDF
    print("\nRetry import attempt...")
    try:
        result3 = service.import_and_anonymize(
            file_path=test_file,
            center_name="university_hospital_wuerzburg",
            delete_source=False, 
            retry=True
        )
        
        if result3:
            print(f"✅ Retry import successful: {result3.pdf_hash}")
        else:
            print("⚠️  Retry import returned None")
            
    except Exception as e:
        print(f"❌ Retry import failed: {e}")
        return False
        
    print("\n✅ All PDF reimport tests completed successfully!")
    return True

if __name__ == "__main__":
    success = test_pdf_reimport()
    sys.exit(0 if success else 1)
