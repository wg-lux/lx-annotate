#!/usr/bin/env python3
"""
Beispielskript für die Verwendung der neuen Cropping-Funktionalität.

Dieses Skript demonstriert, wie sensitive Textregionen in PDFs erkannt 
und als separate Bilder extrahiert werden können.
"""

import os
import sys
from pathlib import Path

# Füge den lx-anonymizer Pfad hinzu
sys.path.insert(0, str(Path(__file__).parent / "libs" / "lx-anonymizer"))

from lx_anonymizer.report_reader import ReportReader
from lx_anonymizer.sensitive_region_cropper import crop_sensitive_regions_from_pdf


def demo_cropping_functionality():
    """
    Demonstriert die Cropping-Funktionalität mit einem Beispiel-PDF.
    """
    print("=== Demo: PDF Sensitive Region Cropping ===\n")
    
    # Konfiguration
    pdf_path = "data/raw_pdfs/example_report.pdf"  # Anpassen an vorhandenes PDF
    output_dir = "data/cropped_regions"
    
    # Erstelle Ausgabeverzeichnis
    os.makedirs(output_dir, exist_ok=True)
    
    # Prüfe, ob PDF existiert
    if not os.path.exists(pdf_path):
        print(f"❌ PDF nicht gefunden: {pdf_path}")
        print("Bitte passen Sie den Pfad in diesem Skript an.")
        return
    
    print(f"📄 Verarbeite PDF: {pdf_path}")
    print(f"📁 Ausgabeverzeichnis: {output_dir}\n")
    
    # === Methode 1: Convenience-Funktion ===
    print("🔍 Methode 1: Verwende Convenience-Funktion")
    try:
        results = crop_sensitive_regions_from_pdf(
            pdf_path=pdf_path,
            output_dir=output_dir,
            margin=25,  # Größerer Rand
            visualize=True  # Erstelle auch Visualisierungen
        )
        
        print("✅ Cropping erfolgreich abgeschlossen!")
        
        # Zeige Ergebnisse
        total_crops = sum(len(crops) for crops in results.values())
        print(f"📊 Statistiken:")
        print(f"   - Verarbeitete Seiten: {len(results)}")
        print(f"   - Gefundene sensitive Regionen: {total_crops}")
        
        for page, crop_files in results.items():
            if crop_files:
                print(f"   - {page}: {len(crop_files)} Regionen")
                for i, crop_file in enumerate(crop_files, 1):
                    file_size = os.path.getsize(crop_file) / 1024  # KB
                    print(f"     └─ Region {i}: {Path(crop_file).name} ({file_size:.1f} KB)")
        
    except Exception as e:
        print(f"❌ Fehler beim Cropping: {e}")
        return
    
    print("\n" + "="*60 + "\n")
    
    # === Methode 2: ReportReader mit erweiterten Optionen ===
    print("🔍 Methode 2: Verwende ReportReader mit Cropping")
    try:
        # Initialisiere ReportReader
        reader = ReportReader(locale='de_DE')
        
        # Verarbeite mit Cropping
        original_text, anonymized_text, report_meta, cropped_regions = reader.process_report_with_cropping(
            pdf_path=pdf_path,
            crop_output_dir=f"{output_dir}/method2",
            crop_sensitive_regions=True,
            use_llm_extractor='deepseek',  # Verwende LLM für bessere Extraktion
            verbose=True
        )
        
        print("✅ Erweiterte Verarbeitung erfolgreich!")
        
        # Zeige Metadaten
        print(f"📊 Report-Metadaten:")
        print(f"   - Cropping aktiviert: {report_meta.get('cropping_enabled', False)}")
        print(f"   - Gefundene Regionen: {report_meta.get('total_cropped_regions', 0)}")
        
        # Zeige extrahierte Patientendaten (anonymisiert)
        if report_meta.get('patient_first_name'):
            print(f"   - Patient gefunden: {report_meta.get('patient_first_name', 'N/A')} {report_meta.get('patient_last_name', 'N/A')}")
        if report_meta.get('patient_dob'):
            print(f"   - Geburtsdatum: {report_meta.get('patient_dob', 'N/A')}")
        if report_meta.get('casenumber'):
            print(f"   - Fallnummer: {report_meta.get('casenumber', 'N/A')}")
        
        # Textlängen
        print(f"   - Original Text: {len(original_text)} Zeichen")
        print(f"   - Anonymisierter Text: {len(anonymized_text)} Zeichen")
        
    except Exception as e:
        print(f"❌ Fehler bei erweiterter Verarbeitung: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print("\n" + "="*60 + "\n")
    
    # === Methode 3: Nur Visualisierung erstellen ===
    print("🔍 Methode 3: Erstelle nur Visualisierung für Debugging")
    try:
        reader = ReportReader(locale='de_DE')
        
        vis_files = reader.create_visualization_report(
            pdf_path=pdf_path,
            output_dir=f"{output_dir}/visualizations",
            visualize_all_pages=True
        )
        
        print(f"✅ Visualisierungen erstellt: {len(vis_files)} Dateien")
        for vis_file in vis_files:
            print(f"   📈 {Path(vis_file).name}")
        
    except Exception as e:
        print(f"❌ Fehler bei Visualisierung: {e}")
    
    print("\n🎉 Demo abgeschlossen!")
    print(f"📁 Alle Ausgabedateien befinden sich in: {output_dir}")


def analyze_pdf_for_sensitive_data(pdf_path):
    """
    Analysiert ein PDF auf sensitive Daten ohne Cropping.
    Nützlich zum Testen der Erkennungsalgorithmen.
    """
    print(f"🔍 Analysiere PDF auf sensitive Daten: {pdf_path}\n")
    
    try:
        reader = ReportReader(locale='de_DE')
        
        # Verarbeite nur Metadaten-Extraktion
        original_text, anonymized_text, report_meta = reader.process_report(
            pdf_path=pdf_path,
            use_llm_extractor='deepseek',
            verbose=True
        )
        
        print("📊 Gefundene sensitive Daten:")
        
        sensitive_fields = [
            ('Patient Vorname', 'patient_first_name'),
            ('Patient Nachname', 'patient_last_name'),
            ('Geburtsdatum', 'patient_dob'),
            ('Geschlecht', 'patient_gender'),
            ('Fallnummer', 'casenumber'),
            ('Untersucher', 'examiner_name'),
            ('Untersuchungsdatum', 'examination_date'),
            ('PDF Hash', 'pdf_hash')
        ]
        
        found_data = False
        for field_name, field_key in sensitive_fields:
            value = report_meta.get(field_key)
            if value is not None and value != "":
                print(f"   ✅ {field_name}: {value}")
                found_data = True
        
        if not found_data:
            print("   ⚠️  Keine sensitiven Daten gefunden")
        
        # Zeige Text-Preview
        print(f"\n📄 Text-Preview (erste 200 Zeichen):")
        print(f"   Original: {original_text[:200]}...")
        print(f"   Anonymisiert: {anonymized_text[:200]}...")
        
    except Exception as e:
        print(f"❌ Fehler bei der Analyse: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        if sys.argv[2:] and sys.argv[2] == "--analyze-only":
            analyze_pdf_for_sensitive_data(pdf_path)
        else:
            print("🔍 Führe Cropping für spezifisches PDF durch...")
            crop_sensitive_regions_from_pdf(
                pdf_path=pdf_path,
                output_dir="data/custom_cropped",
                visualize=True
            )
    else:
        demo_cropping_functionality()
