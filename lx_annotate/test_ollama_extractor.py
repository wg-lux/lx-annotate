#!/usr/bin/env python3
"""
Test-Skript für die verbesserte OllamaOptimizedExtractor.

Testet das Fallback-System und die robuste Metadaten-Extraktion.
"""

import logging
import sys
import time
from pathlib import Path

# Füge den Pfad zum Modul hinzu
sys.path.append(str(Path(__file__).parent))

from lx_anonymizer.ollama_llm_meta_extraction_optimized import create_ollama_extractor, PatientMetadata

# Konfiguriere detailliertes Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('ollama_test.log')
    ]
)

logger = logging.getLogger(__name__)

def test_extractor_functionality():
    """Testet die grundlegende Funktionalität des Extractors."""
    
    print("=" * 60)
    print("🧪 OLLAMA OPTIMIZED EXTRACTOR - FUNKTIONALITÄTS-TEST")
    print("=" * 60)
    
    try:
        # Extractor erstellen
        print("\n1️⃣ Erstelle Ollama Extractor...")
        extractor = create_ollama_extractor()
        
        # Modell-Informationen anzeigen
        model_info = extractor.get_model_info()
        print(f"\n📋 Modell-Informationen:")
        print(f"   Aktuelles Modell: {model_info['current_model']['name'] if model_info['current_model'] else 'None'}")
        print(f"   Verfügbare Modelle: {len(model_info['available_models'])}")
        for i, model in enumerate(model_info['available_models'][:5], 1):
            print(f"   {i}. {model}")
        if len(model_info['available_models']) > 5:
            print(f"   ... und {len(model_info['available_models']) - 5} weitere")
        
        return extractor
        
    except Exception as e:
        print(f"❌ Fehler beim Erstellen des Extractors: {e}")
        return None

def test_metadata_extraction(extractor):
    """Testet die Metadaten-Extraktion mit verschiedenen Test-Fällen."""
    
    if not extractor:
        print("⚠️ Kein Extractor verfügbar für Tests")
        return
    
    print(f"\n2️⃣ Teste Metadaten-Extraktion...")
    
    # Test-Fälle mit verschiedenen Schwierigkeitsgraden
    test_cases = [
        {
            "name": "Standard Deutsch",
            "text": "Herr Max Mustermann, 45 Jahre alt, wurde am 15.01.2024 untersucht.",
            "expected": {"name": "Max Mustermann", "age": 45, "gender": "male"}
        },
        {
            "name": "Weiblich mit Titel",
            "text": "Frau Dr. Anna Schmidt, 32 Jahre alt, Untersuchung am 20.02.2024",
            "expected": {"name": "Anna Schmidt", "age": 32, "gender": "female"}
        },
        {
            "name": "Kurze Form",
            "text": "Patient Klaus Weber (m), 58 Jahre, Termin: 10.03.2024",
            "expected": {"name": "Klaus Weber", "age": 58, "gender": "male"}
        },
        {
            "name": "Komplexer Fall",
            "text": "Die Patientin Maria Gonzalez-Rodriguez, geb. 12.04.1985 (39 Jahre), hatte heute ihren Kontrolltermin am 15.10.2024. Routineuntersuchung verlief normal.",
            "expected": {"name": "Maria Gonzalez-Rodriguez", "age": 39, "gender": "female"}
        },
        {
            "name": "Unklarer Fall",
            "text": "Pat. M. Meier, Alter unbekannt, heute gesehen",
            "expected": {"name": "M. Meier", "gender": "unknown"}
        }
    ]
    
    success_count = 0
    total_time = 0
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n   Test {i}/{len(test_cases)}: {test_case['name']}")
        print(f"   Text: {test_case['text']}")
        
        start_time = time.time()
        try:
            metadata = extractor.extract_metadata(test_case['text'])
            duration = time.time() - start_time
            total_time += duration
            
            if metadata:
                print(f"   ✅ Erfolg in {duration:.2f}s:")
                print(f"      Name: {metadata.patient_name}")
                print(f"      Alter: {metadata.patient_age}")
                print(f"      Datum: {metadata.examination_date}")
                print(f"      Geschlecht: {metadata.gender}")
                
                # Validiere Erwartungen
                expected = test_case['expected']
                if expected.get('name') and expected['name'] not in metadata.patient_name:
                    print(f"      ⚠️ Warnung: Erwarteter Name '{expected['name']}' nicht gefunden")
                if expected.get('age') and metadata.patient_age != expected['age']:
                    print(f"      ⚠️ Warnung: Erwartetes Alter {expected['age']}, erhalten {metadata.patient_age}")
                if expected.get('gender') and metadata.gender != expected['gender']:
                    print(f"      ⚠️ Warnung: Erwartetes Geschlecht '{expected['gender']}', erhalten '{metadata.gender}'")
                
                success_count += 1
            else:
                print(f"   ❌ Fehlgeschlagen nach {duration:.2f}s")
                
        except Exception as e:
            duration = time.time() - start_time
            print(f"   💥 Exception nach {duration:.2f}s: {e}")
    
    # Zusammenfassung
    print(f"\n📊 ZUSAMMENFASSUNG:")
    print(f"   Erfolgreiche Tests: {success_count}/{len(test_cases)} ({success_count/len(test_cases)*100:.1f}%)")
    print(f"   Durchschnittliche Zeit: {total_time/len(test_cases):.2f}s pro Test")
    print(f"   Gesamtzeit: {total_time:.2f}s")

def test_fallback_system(extractor):
    """Testet das Fallback-System bei schwierigen Eingaben."""
    
    if not extractor:
        print("⚠️ Kein Extractor verfügbar für Fallback-Tests")
        return
    
    print(f"\n3️⃣ Teste Fallback-System...")
    
    # Schwierige Test-Fälle die Modell-Fallbacks auslösen könnten
    difficult_cases = [
        "Sehr unstrukturierter Text ohne klare Metadaten aber vielleicht Max 30 Jahre",
        "Complex English text: Mr. John Doe, age 40, examination on 2024-01-15",
        "Кирилица и смешанный текст с Patient Иван 25 лет",
        "Emoji Test 🏥 Patient 👨 Hans Mueller 🎂 35 Jahre 📅 heute",
        ""  # Leerer Text
    ]
    
    for i, difficult_text in enumerate(difficult_cases, 1):
        print(f"\n   Schwieriger Fall {i}: '{difficult_text[:50]}{'...' if len(difficult_text) > 50 else ''}'")
        
        start_time = time.time()
        try:
            metadata = extractor.extract_metadata(difficult_text)
            duration = time.time() - start_time
            
            if metadata:
                print(f"   ✅ Überraschender Erfolg in {duration:.2f}s: {metadata.patient_name}")
            else:
                print(f"   ⚪ Erwartetes Fehlschlagen nach {duration:.2f}s")
                
        except Exception as e:
            duration = time.time() - start_time
            print(f"   ⚠️ Exception in {duration:.2f}s: {e}")

def main():
    """Hauptfunktion für alle Tests."""
    
    try:
        # Teste Grundfunktionalität
        extractor = test_extractor_functionality()
        
        if extractor:
            # Teste Metadaten-Extraktion
            test_metadata_extraction(extractor)
            
            # Teste Fallback-System
            test_fallback_system(extractor)
            
            print(f"\n🎉 Tests abgeschlossen!")
            
            # Finale Modell-Info
            final_info = extractor.get_model_info()
            print(f"\n📋 Finales Modell: {final_info['current_model']['name'] if final_info['current_model'] else 'None'}")
        else:
            print(f"\n❌ Tests konnten nicht ausgeführt werden - Extractor-Fehler")
            
    except KeyboardInterrupt:
        print(f"\n\n⏹️ Tests abgebrochen durch Benutzer")
    except Exception as e:
        print(f"\n💥 Unerwarteter Fehler: {e}")
        logger.exception("Unerwarteter Fehler in Tests")

if __name__ == "__main__":
    main()
