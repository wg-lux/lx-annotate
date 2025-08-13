#!/usr/bin/env python3
"""
Command Line Interface für PDF Sensitive Region Cropping.

Verwendung:
    python crop_pdf_cli.py einzelne_datei.pdf --output ./output/
    python crop_pdf_cli.py --batch ./pdf_verzeichnis/ --output ./batch_output/
    python crop_pdf_cli.py datei.pdf --visualize --output ./viz_output/
"""

import argparse
import sys
import os
from pathlib import Path
import json

# Füge lx-anonymizer zum Python Path hinzu
sys.path.insert(0, str(Path(__file__).parent.parent / "libs" / "lx-anonymizer"))

from lx_anonymizer.report_reader import ReportReader
from lx_anonymizer.sensitive_region_cropper import crop_sensitive_regions_from_pdf
from lx_anonymizer.cropping_utils import BatchCropper, validate_cropping_results, create_cropping_config


def crop_single_pdf(args):
    """Croppt eine einzelne PDF-Datei."""
    print(f"🔍 Verarbeite einzelne PDF: {args.input}")
    
    if not os.path.exists(args.input):
        print(f"❌ Datei nicht gefunden: {args.input}")
        return 1
    
    try:
        results = crop_sensitive_regions_from_pdf(
            pdf_path=args.input,
            output_dir=args.output,
            margin=args.margin,
            visualize=args.visualize
        )
        
        total_crops = sum(len(crops) for crops in results.values())
        print(f"✅ Cropping erfolgreich! Gefunden: {total_crops} sensitive Regionen")
        
        # Zeige Ergebnisse
        for page, crop_files in results.items():
            if crop_files:
                print(f"   📄 {page}: {len(crop_files)} Regionen")
                for crop_file in crop_files:
                    file_size = os.path.getsize(crop_file) / 1024
                    print(f"      └─ {Path(crop_file).name} ({file_size:.1f} KB)")
        
        return 0
        
    except Exception as e:
        print(f"❌ Fehler beim Cropping: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


def crop_batch_pdfs(args):
    """Croppt alle PDFs in einem Verzeichnis."""
    print(f"📁 Verarbeite Batch: {args.batch}")
    
    if not os.path.exists(args.batch):
        print(f"❌ Verzeichnis nicht gefunden: {args.batch}")
        return 1
    
    try:
        cropper = BatchCropper(
            output_base_dir=args.output,
            max_workers=args.workers,
            locale='de_DE'
        )
        
        results = cropper.process_pdf_directory(
            pdf_dir=args.batch,
            file_pattern="*.pdf",
            create_report=True
        )
        
        stats = results['stats']
        print(f"✅ Batch-Verarbeitung abgeschlossen!")
        print(f"   📊 Verarbeitet: {stats['processed']} PDFs")
        print(f"   ✅ Erfolgreich: {stats['successful']}")
        print(f"   ❌ Fehlgeschlagen: {stats['failed']}")
        print(f"   🎯 Gefundene Regionen: {stats['total_regions']}")
        print(f"   ⏱️  Zeit: {stats['processing_time']:.2f} Sekunden")
        
        if 'report_path' in results:
            print(f"   📋 Report: {results['report_path']}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Fehler bei Batch-Verarbeitung: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


def analyze_pdf(args):
    """Analysiert ein PDF ohne Cropping."""
    print(f"🔍 Analysiere PDF: {args.analyze}")
    
    if not os.path.exists(args.analyze):
        print(f"❌ Datei nicht gefunden: {args.analyze}")
        return 1
    
    try:
        reader = ReportReader(locale='de_DE')
        
        original_text, anonymized_text, report_meta = reader.process_report(
            pdf_path=args.analyze,
            use_llm_extractor='deepseek',
            verbose=args.verbose
        )
        
        print("📊 Analyse-Ergebnisse:")
        
        # Extrahierte Metadaten
        sensitive_fields = [
            ('Patient Vorname', 'patient_first_name'),
            ('Patient Nachname', 'patient_last_name'),
            ('Geburtsdatum', 'patient_dob'),
            ('Geschlecht', 'patient_gender'),
            ('Fallnummer', 'casenumber'),
            ('PDF Hash', 'pdf_hash')
        ]
        
        found_sensitive = False
        for field_name, field_key in sensitive_fields:
            value = report_meta.get(field_key)
            if value is not None and str(value).strip():
                print(f"   ✅ {field_name}: {value}")
                found_sensitive = True
        
        if not found_sensitive:
            print("   ⚠️  Keine sensitiven Daten automatisch erkannt")
        
        # Text-Statistiken
        print(f"\n📄 Text-Statistiken:")
        print(f"   📏 Original: {len(original_text)} Zeichen")
        print(f"   🔒 Anonymisiert: {len(anonymized_text)} Zeichen")
        
        # Speichere Analyse-Ergebnis
        if args.output:
            analysis_file = Path(args.output) / f"{Path(args.analyze).stem}_analysis.json"
            os.makedirs(args.output, exist_ok=True)
            
            analysis_data = {
                'pdf_path': args.analyze,
                'metadata': report_meta,
                'text_stats': {
                    'original_length': len(original_text),
                    'anonymized_length': len(anonymized_text)
                },
                'analysis_date': __import__('time').strftime('%Y-%m-%d %H:%M:%S')
            }
            
            with open(analysis_file, 'w', encoding='utf-8') as f:
                json.dump(analysis_data, f, indent=2, ensure_ascii=False, default=str)
            
            print(f"   💾 Analyse gespeichert: {analysis_file}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Fehler bei Analyse: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


def validate_output(args):
    """Validiert die Ausgabe einer Cropping-Operation."""
    print(f"🔍 Validiere Ausgabe: {args.validate}")
    
    if not os.path.exists(args.validate):
        print(f"❌ Verzeichnis nicht gefunden: {args.validate}")
        return 1
    
    try:
        validation_result = validate_cropping_results(args.validate)
        
        print(f"📊 Validierungs-Ergebnis:")
        print(f"   ✅ Gültig: {'Ja' if validation_result['valid'] else 'Nein'}")
        print(f"   📷 Crop-Bilder: {validation_result['total_crop_images']}")
        print(f"   📋 Metadaten-Dateien: {validation_result['total_metadata_files']}")
        
        if validation_result['issues']:
            print(f"   ⚠️  Probleme gefunden:")
            for issue in validation_result['issues']:
                print(f"      - {issue}")
        
        if 'orphaned_images' in validation_result:
            print(f"   🗂️  Verwaiste Bilder: {len(validation_result['orphaned_images'])}")
        
        # Speichere Validierungs-Report
        if args.output:
            report_file = Path(args.output) / "validation_report.json"
            os.makedirs(args.output, exist_ok=True)
            
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(validation_result, f, indent=2, ensure_ascii=False, default=str)
            
            print(f"   💾 Validierungs-Report: {report_file}")
        
        return 0 if validation_result['valid'] else 1
        
    except Exception as e:
        print(f"❌ Fehler bei Validierung: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


def main():
    """Hauptfunktion des CLI."""
    parser = argparse.ArgumentParser(
        description="PDF Sensitive Region Cropper CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Beispiele:
  %(prog)s report.pdf --output ./crops/
  %(prog)s --batch ./pdfs/ --output ./batch_crops/ --workers 4
  %(prog)s report.pdf --visualize --output ./debug/
  %(prog)s --analyze report.pdf --output ./analysis/
  %(prog)s --validate ./crops/ --output ./validation/
  %(prog)s --create-config ./config.json
        """
    )
    
    # Eingabe-Optionen
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('input', nargs='?', help='Einzelne PDF-Datei zum Cropping')
    group.add_argument('--batch', '-b', help='Verzeichnis mit PDFs für Batch-Verarbeitung')
    group.add_argument('--analyze', '-a', help='PDF-Datei nur analysieren (kein Cropping)')
    group.add_argument('--validate', '-val', help='Validiere Cropping-Ausgabe-Verzeichnis')
    group.add_argument('--create-config', '-cfg', help='Erstelle Beispiel-Konfigurationsdatei')
    
    # Ausgabe-Optionen
    parser.add_argument('--output', '-o', required=False, 
                       help='Ausgabeverzeichnis (Standard: ./cropped_output/)')
    
    # Cropping-Optionen
    parser.add_argument('--margin', type=int, default=20,
                       help='Zusätzlicher Rand um sensitive Bereiche (Standard: 20)')
    parser.add_argument('--visualize', action='store_true',
                       help='Erstelle Visualisierungen für Debugging')
    
    # Batch-Optionen
    parser.add_argument('--workers', type=int, default=4,
                       help='Anzahl paralleler Threads für Batch-Verarbeitung (Standard: 4)')
    
    # Allgemeine Optionen
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Ausführliche Ausgabe mit Fehlermeldungen')
    
    args = parser.parse_args()
    
    # Setze Standard-Ausgabeverzeichnis
    if not args.output and not args.create_config:
        args.output = './cropped_output'
    
    # Spezial-Behandlung für Config-Erstellung
    if args.create_config:
        try:
            config_path = create_cropping_config(args.create_config)
            print(f"✅ Konfigurationsdatei erstellt: {config_path}")
            return 0
        except Exception as e:
            print(f"❌ Fehler beim Erstellen der Konfiguration: {e}")
            return 1
    
    # Route zu entsprechender Funktion
    if args.input:
        return crop_single_pdf(args)
    elif args.batch:
        return crop_batch_pdfs(args)
    elif args.analyze:
        return analyze_pdf(args)
    elif args.validate:
        return validate_output(args)
    else:
        parser.error("Keine gültige Eingabe-Option angegeben")


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
