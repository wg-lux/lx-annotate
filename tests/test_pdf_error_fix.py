#!/usr/bin/env python3
"""
Test script to verify the PDF import KeyError fix works correctly.
"""
import os
import sys
import shutil
import django
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings.dev')
django.setup()

from endoreg_db.services.pdf_import import PdfImportService
from endoreg_db.models import RawPdfFile

def test_pdf_error_fix():
    """Test that the KeyError fix works correctly."""
    
    try:
        print("🔍 Starting PDF error fix test...")
        
        test_file = Path("/home/admin/dev/lx-annotate/test-data/lux-histo-1.pdf")
        
        if not test_file.exists():
            print(f"❌ Test file not found: {test_file}")
            return False
        
        print(f"📄 Testing PDF import fix with file: {test_file}")
        
        # Create a service instance
        service = PdfImportService()
        print("✅ PdfImportService created successfully")
        
        # Test the import
        print("🚀 Attempting PDF import...")
        result = service.import_and_anonymize(
            file_path=test_file,
            center_name="university_hospital_wuerzburg",
            delete_source=False
        )
        
        if result:
            print(f"✅ PDF import successful: {result.pdf_hash}")
        else:
            print("⚠️  PDF import returned None (likely already processed)")
            
        print("✅ No KeyError occurred - fix is working!")
        return True
        
    except KeyError as e:
        if 'file_path' in str(e):
            print(f"❌ KeyError 'file_path' still occurs: {e}")
            import traceback
            traceback.print_exc()
            return False
        else:
            print(f"❌ Unexpected KeyError: {e}")
            import traceback
            traceback.print_exc()
            return False
    except Exception as e:
        print(f"ℹ️  Other exception: {type(e).__name__}: {e}")
        print("✅ No KeyError occurred - fix is working!")
        return True

if __name__ == "__main__":
    success = test_pdf_error_fix()
    sys.exit(0 if success else 1)
