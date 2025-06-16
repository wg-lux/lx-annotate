#!/usr/bin/env python3
"""
Script zum Importieren eines Test-PDFs
"""
import os
import sys
import django

# Django-Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings')
django.setup()

from endoreg_db.models import RawPdfFile, SensitiveMeta, Center
from pathlib import Path

def import_test_pdf(pdf_path):
    """Import ein PDF für Tests"""
    pdf_path = Path(pdf_path)
    
    if not pdf_path.exists():
        print(f"Error: PDF nicht gefunden: {pdf_path}")
        return False
    
    # Stelle sicher, dass ein Test-Center existiert
    center, created = Center.objects.get_or_create(name="test_center")
    
    # PDF importieren
    try:
        raw_pdf = RawPdfFile.create_from_file(
            file_path=pdf_path,
            center_name=center.name,
            delete_source=False  # Originaldatei behalten
        )
        print(f"PDF erfolgreich importiert: {raw_pdf}")
        return raw_pdf
    except Exception as e:
        print(f"Fehler beim Importieren des PDFs: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Verwendung: python import_test_pdf.py /pfad/zu/test.pdf")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = import_test_pdf(pdf_path)
    sys.exit(0 if result else 1)
