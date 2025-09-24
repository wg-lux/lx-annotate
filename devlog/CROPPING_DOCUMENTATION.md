# PDF Sensitive Region Cropping

Diese Dokumentation beschreibt die neue Cropping-Funktionalität für sensitive Textregionen in PDF-Dokumenten.

## Überblick

Das System kann automatisch sensitive Textregionen in medizinischen PDFs erkennen und als separate Bildausschnitte extrahieren. Dies ist nützlich für:

- **Anonymisierung**: Sensitive Bereiche können separat bearbeitet werden
- **Compliance**: Bessere Kontrolle über sensitive Daten
- **Qualitätssicherung**: Manuelle Überprüfung erkannter sensitiver Bereiche
- **Archivierung**: Getrennte Speicherung sensitiver und nicht-sensitiver Inhalte

## Funktionsweise

### 1. Textextraktion
- PDF wird zu Bildern konvertiert (PyMuPDF)
- OCR-Analyse mit Tesseract für Word-Level-Bounding-Boxes
- Fallback auf Ensemble-OCR bei schlechter Textqualität

### 2. Sensitive Datenerkennung
- **SpaCy NLP**: Strukturierte Extraktion von Patientendaten
- **Regex-Patterns**: Erkennung spezifischer Muster (Namen, Daten, IDs)
- **LLM-Integration**: Optional DeepSeek/Llama für verbesserte Extraktion

### 3. Region-Cropping
- Automatische Bounding-Box-Erstellung um sensitive Texte
- Intelligente Zusammenführung benachbarter Regionen
- Konfigurierbare Ränder und Mindestgrößen

## Installation

```bash
# Installiere Abhängigkeiten
pip install pdfplumber pytesseract pymupdf pillow
pip install spacy transformers torch

# Lade deutsches SpaCy-Modell
python -m spacy download de_core_news_sm
```

## Verwendung

### 1. Einfache Python-API

```python
from lx_anonymizer.sensitive_region_cropper import crop_sensitive_regions_from_pdf

# Croppt alle sensitiven Regionen aus einem PDF
results = crop_sensitive_regions_from_pdf(
    pdf_path="report.pdf",
    output_dir="./crops/",
    margin=25,
    visualize=True  # Erstellt Debug-Visualisierungen
)

print(f"Gefunden: {sum(len(crops) for crops in results.values())} Regionen")
```

### 2. Erweiterte ReportReader-Integration

```python
from lx_anonymizer.report_reader import ReportReader

reader = ReportReader(locale='de_DE')

# Verarbeitung mit Cropping
original, anonymized, meta, crops = reader.process_report_with_cropping(
    pdf_path="report.pdf",
    crop_output_dir="./output/",
    crop_sensitive_regions=True,
    use_llm_extractor='deepseek'
)

print(f"Cropped regions: {meta['total_cropped_regions']}")
```

### 3. Batch-Verarbeitung

```python
from lx_anonymizer.cropping_utils import BatchCropper

cropper = BatchCropper(
    output_base_dir="./batch_output/",
    max_workers=4
)

results = cropper.process_pdf_directory(
    pdf_dir="./pdfs/",
    create_report=True
)

print(f"Verarbeitet: {results['stats']['successful']} PDFs")
```

### 4. Command-Line Interface

```bash
# Einzelne PDF
python scripts/crop_pdf_cli.py report.pdf --output ./crops/

# Batch-Verarbeitung
python scripts/crop_pdf_cli.py --batch ./pdfs/ --output ./batch_crops/

# Mit Visualisierung
python scripts/crop_pdf_cli.py report.pdf --visualize --output ./debug/

# Nur Analyse (kein Cropping)
python scripts/crop_pdf_cli.py --analyze report.pdf --output ./analysis/

# Validierung der Ergebnisse
python scripts/crop_pdf_cli.py --validate ./crops/ --output ./validation/
```

## Konfiguration

### Sensitive Datentypen

Das System erkennt standardmäßig:

- **Patientennamen**: Vor- und Nachnamen
- **Geburtsdaten**: DD.MM.YYYY Format
- **Fallnummern**: Medizinische Case-IDs
- **Sozialversicherungsnummern**: Deutsche SSN-Formate
- **Telefonnummern**: Deutsche Telefonnummern
- **Adressen**: Straßenangaben
- **Arztnamen**: Dr. med. Bezeichnungen

### Anpassung der Erkennungsregeln

```python
from lx_anonymizer.sensitive_region_cropper import SensitiveRegionCropper

cropper = SensitiveRegionCropper(
    margin=30,                    # Rand um Regionen
    min_region_size=(150, 40),   # Mindestgröße (Breite, Höhe)
    merge_distance=60            # Max. Abstand für Zusammenführung
)

# Eigene Regex-Patterns hinzufügen
cropper.sensitive_patterns['email'] = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
```

### Konfigurationsdatei erstellen

```bash
python scripts/crop_pdf_cli.py --create-config config.json
```

## Ausgabestruktur

```
output_directory/
├── pdf_name/
│   ├── pdf_name_page_1_region_1.png
│   ├── pdf_name_page_1_region_2.png
│   ├── pdf_name_page_2_region_1.png
│   └── pdf_name_metadata.json
├── visualizations/
│   ├── pdf_name_page_1_analysis.png
│   └── pdf_name_page_2_analysis.png
└── batch_cropping_report.json
```

### Metadaten-Format

```json
{
  "pdf_path": "/path/to/report.pdf",
  "success": true,
  "total_regions": 3,
  "cropped_regions": {
    "page_1": [
      "/output/report_page_1_region_1.png",
      "/output/report_page_1_region_2.png"
    ],
    "page_2": [
      "/output/report_page_2_region_1.png"
    ]
  },
  "metadata": {
    "patient_name": "Max Mustermann",
    "case_number": "12345",
    "patient_dob": "1980-01-15",
    "pdf_hash": "sha256:abc123..."
  }
}
```

## Qualitätssicherung

### Visualisierungs-Modus

```python
# Erstellt Debug-Visualisierungen
reader.create_visualization_report(
    pdf_path="report.pdf",
    output_dir="./debug/",
    visualize_all_pages=True
)
```

Zeigt:
- 🔴 Rote Rechtecke: Erkannte sensitive Regionen
- 🔵 Blaue Rechtecke: Alle OCR-Word-Boxes

### Validierung der Ergebnisse

```python
from lx_anonymizer.cropping_utils import validate_cropping_results

validation = validate_cropping_results("./output/")
print(f"Gültig: {validation['valid']}")
print(f"Probleme: {validation['issues']}")
```

## Performance-Optimierung

### Parallele Verarbeitung

```python
# Batch-Verarbeitung mit 8 Threads
cropper = BatchCropper(max_workers=8)
```

### LLM-Integration

```python
# Bessere Extraktion mit DeepSeek (erfordert Ollama)
reader.process_report_with_cropping(
    use_llm_extractor='deepseek'  # oder 'medllama', 'llama3'
)
```

### OCR-Optimierung

```python
# Ensemble-OCR für schwierige Dokumente
reader.process_report(
    use_ensemble=True,
    crop_sensitive_regions=True
)
```

## Troubleshooting

### Häufige Probleme

1. **Keine sensitiven Regionen gefunden**
   - Überprüfe PDF-Qualität
   - Teste mit `--analyze` Modus
   - Anpassung der Regex-Patterns

2. **OCR-Fehler**
   - Installiere Tesseract korrekt
   - Verwende `use_ensemble=True`
   - Überprüfe Bildauflösung

3. **Speicher-Probleme**
   - Reduziere `max_workers`
   - Verarbeite kleinere Batches
   - Aktiviere GPU für TrOCR

### Debug-Modus

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Oder verwende verbose-Modus im CLI
python scripts/crop_pdf_cli.py report.pdf --verbose
```

## Integration in bestehende Workflows

### Django-Integration

```python
# In einer Django-View
from lx_anonymizer.report_reader import ReportReader

def process_uploaded_pdf(pdf_file):
    reader = ReportReader()
    
    original, anonymized, meta, crops = reader.process_report_with_cropping(
        pdf_path=pdf_file.path,
        crop_output_dir=f"media/crops/{pdf_file.id}/",
        crop_sensitive_regions=True
    )
    
    # Speichere Ergebnisse in Datenbank
    return {
        'cropped_regions': crops,
        'sensitive_data_found': meta['total_cropped_regions'] > 0
    }
```

### Automatisierte Pipeline

```python
# Überwachung eines Verzeichnisses
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class PDFHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.src_path.endswith('.pdf'):
            crop_sensitive_regions_from_pdf(
                pdf_path=event.src_path,
                output_dir="./auto_crops/"
            )

observer = Observer()
observer.schedule(PDFHandler(), "./incoming_pdfs/", recursive=False)
observer.start()
```

## Erweiterte Anpassungen

### Eigene Erkennungsalgorithmen

```python
class CustomSensitiveRegionCropper(SensitiveRegionCropper):
    def detect_sensitive_regions(self, image, word_boxes):
        # Eigene Logik implementieren
        custom_regions = self._my_custom_detection(image, word_boxes)
        
        # Kombiniere mit Standard-Erkennung
        standard_regions = super().detect_sensitive_regions(image, word_boxes)
        
        return custom_regions + standard_regions
```

### Integration externer APIs

```python
# Beispiel: Azure Cognitive Services
def azure_pii_detection(text):
    # Implementiere Azure PII-Erkennung
    pass

# Verwende in eigenem Cropper
cropper.external_pii_detector = azure_pii_detection
```

## Support und Dokumentation

- **Logs**: Alle Operationen werden geloggt
- **Metadaten**: Vollständige Nachverfolgung der Verarbeitung
- **Validierung**: Eingebaute Qualitätskontrolle
- **Visualisierung**: Debug-Ausgaben für Entwicklung

Für weitere Unterstützung siehe die Implementierung in:
- `libs/lx-anonymizer/lx_anonymizer/sensitive_region_cropper.py`
- `libs/lx-anonymizer/lx_anonymizer/cropping_utils.py`
- `examples/sensitive_region_cropping_demo.py`
