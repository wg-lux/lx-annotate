"""
Optimierte Ollama LLM Metadaten-Extraktion mit leichtgewichtigen Modellen und REST API.

Diese Implementierung basiert auf den Best Practices:
1. Verwendung von instruction-tuned, quantisierten Modellen für bessere Performance
2. Direkte REST API Verwendung statt Python Client für bessere Kontrolle
3. Fail-safe Model Factory mit automatischem Fallback
4. Strukturierte Ausgabe mit JSON Schema Validation
"""

import json
import logging
import requests
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, ValidationError
from tenacity import retry, stop_after_attempt, wait_fixed
import time
import hashlib

# Konfiguriere Logging
logger = logging.getLogger(__name__)

class PatientMetadata(BaseModel):
    """Pydantic-Modell für Patientenmetadaten mit Validierung."""
    patient_name: str
    patient_age: int
    examination_date: str
    gender: str
    additional_info: Optional[str] = None

class ModelConfig:
    """Konfiguration für verfügbare Modelle mit Prioritäten."""
    
    # Priorisierte Modelliste: leichte, instruction-tuned Modelle zuerst
    MODELS = [
        {
            "name": "qwen2.5:1.5b-instruct",
            "priority": 4,
            "timeout": 12,
            "description": "Qwen 2.5 1.5B instruction-tuned - optimal für strukturierte Extraktion"
        },
        {
            "name": "llama3.2:1b", 
            "priority": 2,
            "timeout": 15,
            "description": "Llama 3.2 1B - kompakt und effizient"
        },
        {
            "name": "phi3.5:3.8b-mini-instruct-q4_K_M",
            "priority": 3,
            "timeout": 20,
            "description": "Phi 3.5 Mini quantisiert - gute Balance aus Größe und Qualität"
        },
        {
            "name": "deepseek-r1:1.5b",
            "priority": 1,
            "timeout": 60,
            "description": "Deepseek R1 - nur als letzter Fallback (reasoning model, langsam)"
        }
    ]
    
    @classmethod
    def get_models_by_priority(cls) -> List[Dict[str, Any]]:
        """Gibt Modelle sortiert nach Priorität zurück."""
        return sorted(cls.MODELS, key=lambda x: x["priority"])

class MetadataCache:
    """
    Cache für Metadaten-Extraktionsergebnisse um wiederholte LLM-Aufrufe zu vermeiden.
    """
    
    def __init__(self, max_size: int = 100):
        self.cache = {}
        self.max_size = max_size
        self.hit_count = 0
        self.miss_count = 0
    
    def _generate_key(self, text: str) -> str:
        """Generiert einen Cache-Key basierend auf Text-Inhalt."""
        return hashlib.md5(text.encode('utf-8')).hexdigest()[:16]
    
    def get(self, text: str) -> Optional[PatientMetadata]:
        """Holt Metadaten aus dem Cache."""
        key = self._generate_key(text)
        if key in self.cache:
            self.hit_count += 1
            logger.debug(f"Cache HIT für Key {key}")
            return self.cache[key]
        else:
            self.miss_count += 1
            return None
    
    def put(self, text: str, metadata: PatientMetadata):
        """Speichert Metadaten im Cache."""
        if len(self.cache) >= self.max_size:
            # Remove oldest entry (simple FIFO)
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        key = self._generate_key(text)
        self.cache[key] = metadata
        logger.debug(f"Cache PUT für Key {key}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Gibt Cache-Statistiken zurück."""
        total_requests = self.hit_count + self.miss_count
        hit_rate = self.hit_count / total_requests if total_requests > 0 else 0
        
        return {
            "hit_count": self.hit_count,
            "miss_count": self.miss_count,
            "hit_rate": hit_rate,
            "cache_size": len(self.cache),
            "max_size": self.max_size
        }

class OllamaOptimizedExtractor:
    """
    Optimierte Ollama-Integration für Metadaten-Extraktion.
    
    Verwendet REST API direkt und implement ein fail-safe Modell-System.
    """
    
    def __init__(self, base_url: str = "http://localhost:11434", enable_cache: bool = True):
        self.base_url = base_url
        self.chat_endpoint = f"{base_url}/api/chat"
        self.available_models = self._check_available_models()
        self.current_model = None
        self.cache = MetadataCache() if enable_cache else None
        self._initialize_best_model()
        self.cache = MetadataCache()  # Cache-Instanz für Metadaten
    
    def _check_available_models(self) -> List[str]:
        """Überprüft, welche Modelle verfügbar sind."""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models_data = response.json()
                return [model["name"] for model in models_data.get("models", [])]
            return []
        except Exception as e:
            logger.warning(f"Konnte verfügbare Modelle nicht abfragen: {e}")
            return []
    
    def _initialize_best_model(self):
        """Initialisiert das beste verfügbare Modell."""
        for model_config in ModelConfig.get_models_by_priority():
            if model_config["name"] in self.available_models:
                self.current_model = model_config
                logger.info(f"Verwende Modell: {model_config['name']} - {model_config['description']}")
                return
        
        # Fallback falls kein konfiguriertes Modell verfügbar ist
        if self.available_models:
            fallback_model = {
                "name": self.available_models[0],
                "priority": 999,
                "timeout": 30,
                "description": "Fallback-Modell"
            }
            self.current_model = fallback_model
            logger.warning(f"Verwende Fallback-Modell: {fallback_model['name']}")
        else:
            raise RuntimeError("Keine Ollama-Modelle verfügbar!")
    
    def _create_extraction_prompt(self, text: str) -> str:
        """
        Erstellt einen optimierten Prompt für Metadaten-Extraktion.
        
        Args:
            text: Input-Text zur Metadaten-Extraktion
            
        Returns:
            Optimierter Prompt-String
        """
        # Kurzer, präziser Prompt für bessere Performance
        return f"""Extrahiere Patientendaten aus diesem medizinischen Text als JSON:

TEXT: {text[:500]}

Ausgabe nur JSON mit diesen Feldern:
- patient_name: Name des Patienten (falls vorhanden)
- patient_age: Alter als Zahl
- examination_date: Datum im Originalformat  
- gender: "male", "female" oder "unknown"

JSON:"""
    
    def _create_json_schema(self) -> Dict[str, Any]:
        """Erstellt das JSON-Schema für strukturierte Ausgabe."""
        return {
            "type": "object",
            "properties": {
                "patient_name": {"type": "string"},
                "patient_age": {"type": "integer"},
                "examination_date": {"type": "string"},
                "gender": {"type": "string", "enum": ["male", "female", "unknown"]},
                "additional_info": {"type": "string"}
            },
            "required": ["patient_name", "patient_age", "examination_date", "gender"]
        }
    
    @retry(stop=stop_after_attempt(2), wait=wait_fixed(1))
    def _make_api_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Macht API-Request mit Retry-Logik und robuster Fehlerbehandlung.
        
        Args:
            payload: Request-Payload für Ollama API
            
        Returns:
            Response-Dictionary von der API
            
        Raises:
            requests.RequestException: Bei API-Fehlern
            requests.Timeout: Bei Timeouts
        """
        try:
            timeout = self.current_model.get("timeout", 30)
            
            logger.debug(f"🔗 API-Request an {self.chat_endpoint} mit Modell {payload['model']}")
            
            response = requests.post(
                self.chat_endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Validiere Antwortstruktur
                if "message" not in result or "content" not in result["message"]:
                    logger.error(f"❌ Unerwartete API-Antwortstruktur: {result}")
                    raise requests.RequestException("Unvollständige API-Antwort")
                
                content_length = len(result["message"]["content"])
                logger.debug(f"✅ API-Response erhalten: {content_length} Zeichen")
                
                return result
            else:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                logger.error(f"❌ API-Fehler: {error_msg}")
                raise requests.RequestException(error_msg)
                
        except requests.Timeout:
            logger.error(f"⏰ Timeout ({timeout}s) bei Modell {self.current_model['name']}")
            raise
        except requests.ConnectionError as e:
            logger.error(f"🔌 Verbindungsfehler zu Ollama: {e}")
            raise requests.RequestException(f"Ollama nicht erreichbar: {e}")
        except Exception as e:
            logger.error(f"💥 Unerwarteter API-Fehler: {e}")
            raise
    
    def _try_next_model(self) -> bool:
        """
        Wechselt zum nächsten verfügbaren Modell basierend auf Priorität.
        
        Returns:
            True wenn ein nächstes Modell verfügbar ist, False sonst
        """
        if not self.current_model:
            return False
            
        current_priority = self.current_model.get("priority", 0)
        
        # Finde nächstes Modell mit höherer Priorität
        for model_config in ModelConfig.get_models_by_priority():
            if (model_config["priority"] > current_priority and 
                model_config["name"] in self.available_models):
                
                old_model = self.current_model["name"]
                self.current_model = model_config
                logger.info(f"🔄 Modell-Wechsel: {old_model} → {model_config['name']} "
                           f"(Priorität {current_priority} → {model_config['priority']})")
                return True
        
        logger.warning("⚠️ Keine weiteren Modelle für Fallback verfügbar")
        return False
    
    def extract_metadata(self, text: str) -> Optional[PatientMetadata]:
        """
        Extrahiert Patientenmetadaten aus Text mit fail-safe Modell-System.
        
        Args:
            text: Input-Text zur Extraktion
            
        Returns:
            PatientMetadata Objekt oder None bei Fehler
        """
        # Überprüfe zuerst den Cache
        cached_metadata = self.cache.get(text)
        if cached_metadata:
            logger.info("✅ Metadaten aus Cache geladen")
            return cached_metadata
        
        if not self.current_model:
            logger.error("Kein Modell verfügbar für Extraktion")
            return None
            
        # Bestimme verfügbare Modelle für Fallback
        available_model_configs = [
            m for m in ModelConfig.get_models_by_priority() 
            if m["name"] in self.available_models
        ]
        
        if not available_model_configs:
            logger.error("Keine konfigurierten Modelle verfügbar")
            return None
            
        # Versuche alle verfügbaren Modelle der Reihe nach
        for model_attempt, model_config in enumerate(available_model_configs):
            # Setze aktuelles Modell für diesen Versuch
            self.current_model = model_config
            
            try:
                start_time = time.time()
                
                payload = {
                    "model": self.current_model["name"],
                    "messages": [
                        {
                            "role": "user",
                            "content": self._create_extraction_prompt(text)
                        }
                    ],
                    "stream": False,
                    "format": self._create_json_schema()
                }
                
                logger.info(f"Versuch {model_attempt + 1}/{len(available_model_configs)}: "
                           f"Extraktion mit {self.current_model['name']}")
                
                # API-Request mit Retry-Logik
                response = self._make_api_request(payload)
                content = response["message"]["content"]
                
                # Performance-Metriken loggen
                duration = time.time() - start_time
                token_count = response.get("eval_count", 0)
                logger.info(f"API-Erfolg in {duration:.2f}s, {token_count} Tokens")
                
                # JSON parsen und validieren
                try:
                    # Bereinige Antwort falls nötig (entferne Markdown-Blöcke etc.)
                    cleaned_content = self._clean_json_response(content)
                    metadata_dict = json.loads(cleaned_content)
                    metadata = PatientMetadata(**metadata_dict)
                    
                    # Speichere im Cache
                    self.cache.put(text, metadata)
                    
                    logger.info(f"✅ Erfolgreich extrahiert mit {self.current_model['name']}: "
                              f"{metadata.patient_name}, Alter: {metadata.patient_age}, "
                              f"Datum: {metadata.examination_date}")
                    
                    return metadata
                    
                except (json.JSONDecodeError, ValidationError) as e:
                    logger.warning(f"JSON/Validierung fehlgeschlagen für {self.current_model['name']}: {e}")
                    logger.debug(f"Rohe Antwort: {content}")
                    
                    # Bei JSON-Fehlern versuche das nächste Modell
                    if model_attempt < len(available_model_configs) - 1:
                        logger.info("Versuche nächstes Modell wegen JSON-Fehler...")
                        continue
                    else:
                        raise ValueError("Alle Modelle lieferten ungültige JSON-Antworten")
                
            except requests.Timeout:
                logger.warning(f"Timeout bei {self.current_model['name']} nach {self.current_model.get('timeout', 30)}s")
                # Bei Timeout versuche das nächste Modell
                if model_attempt < len(available_model_configs) - 1:
                    logger.info("Versuche nächstes Modell wegen Timeout...")
                    continue
                else:
                    logger.error("Alle Modelle liefen in Timeout")
                    break
                    
            except Exception as e:
                logger.error(f"Fehler mit Modell {self.current_model['name']}: {e}")
                
                # Bei anderen Fehlern versuche das nächste Modell
                if model_attempt < len(available_model_configs) - 1:
                    logger.info("Versuche nächstes Modell wegen Fehler...")
                    continue
                else:
                    logger.error("Alle Modelle fehlgeschlagen")
                    break
        
        logger.error("❌ Alle verfügbaren Modelle fehlgeschlagen")
        return None
    
    def _clean_json_response(self, content: str) -> str:
        """
        Bereinigt die Modell-Antwort um gültiges JSON zu extrahieren.
        
        Args:
            content: Rohe Antwort vom Modell
            
        Returns:
            Bereinigter JSON-String
        """
        # Entferne Markdown-Code-Blöcke falls vorhanden
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        # Entferne führende/nachfolgende Whitespaces und Erklärungen
        lines = content.split('\n')
        json_start = -1
        json_end = -1
        
        # Finde JSON-Block
        for i, line in enumerate(lines):
            if line.strip().startswith('{'):
                json_start = i
                break
        
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip().endswith('}'):
                json_end = i
                break
        
        if json_start >= 0 and json_end >= 0:
            content = '\n'.join(lines[json_start:json_end + 1])
        
        return content.strip()
    
    def get_model_info(self) -> Dict[str, Any]:
        """Gibt Informationen über das aktuelle Modell und Cache-Statistiken zurück."""
        info = {
            "current_model": self.current_model,
            "available_models": self.available_models,
            "total_models": len(self.available_models)
        }
        
        # Cache-Statistiken hinzufügen
        if self.cache:
            info["cache_stats"] = self.cache.get_stats()
        
        return info
    
    def extract_metadata_smart_sampling(self, text: str, confidence_threshold: float = 0.7) -> Optional[PatientMetadata]:
        """
        Extrahiert Metadaten mit Smart-Sampling für bessere Performance.
        Stoppt früh wenn Konfidenz erreicht wird.
        
        Args:
            text: Input-Text zur Extraktion
            confidence_threshold: Schwellwert für frühen Stopp
            
        Returns:
            PatientMetadata Objekt oder None bei Fehler
        """
        # Pre-Check: Enthält der Text überhaupt relevante Informationen?
        if not self._contains_patient_data(text):
            logger.debug("Text enthält keine erkennbaren Patientendaten, überspringe LLM-Extraktion")
            return None
            
        # Verwende nur das schnellste verfügbare Modell für Smart Sampling
        fastest_model = self._get_fastest_available_model()
        if not fastest_model:
            return self.extract_metadata(text)  # Fallback zur normalen Extraktion
            
        original_model = self.current_model
        self.current_model = fastest_model
        
        try:
            # Verwende sehr kurzen Text für bessere Performance
            truncated_text = text[:200] if len(text) > 200 else text
            
            start_time = time.time()
            
            payload = {
                "model": self.current_model["name"],
                "messages": [
                    {
                        "role": "user", 
                        "content": self._create_fast_extraction_prompt(truncated_text)
                    }
                ],
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Niedriger für konsistentere Ergebnisse
                    "top_p": 0.9,
                    "num_predict": 150,  # Begrenzte Token-Anzahl für Geschwindigkeit
                }
            }
            
            logger.info(f"Smart-Sampling mit {self.current_model['name']}")
            response = self._make_api_request(payload)
            content = response["message"]["content"]
            
            duration = time.time() - start_time
            logger.info(f"Smart-Sampling in {duration:.2f}s abgeschlossen")
            
            # Schnelle JSON-Parsing ohne komplexe Validierung
            try:
                cleaned_content = self._clean_json_response(content)
                metadata_dict = json.loads(cleaned_content)
                
                # Einfache Konfidenz-Bewertung basierend auf gefundenen Daten
                confidence = self._calculate_confidence(metadata_dict)
                
                if confidence >= confidence_threshold:
                    metadata = PatientMetadata(**metadata_dict)
                    logger.info(f"✅ Smart-Sampling erfolgreich (Konfidenz: {confidence:.2f}): "
                              f"{metadata.patient_name}, Alter: {metadata.patient_age}")
                    return metadata
                else:
                    logger.info(f"Smart-Sampling Konfidenz zu niedrig ({confidence:.2f}), verwende Vollextraktion")
                    return self.extract_metadata(text)  # Fallback zur vollständigen Extraktion
                    
            except (json.JSONDecodeError, ValidationError) as e:
                logger.debug(f"Smart-Sampling JSON-Fehler, Fallback zur Vollextraktion: {e}")
                return self.extract_metadata(text)
                
        except Exception as e:
            logger.warning(f"Smart-Sampling fehlgeschlagen, Fallback zur Vollextraktion: {e}")
            return self.extract_metadata(text)
            
        finally:
            # Restore original model
            self.current_model = original_model

    def _contains_patient_data(self, text: str) -> bool:
        """Schnelle Prüfung ob Text potentielle Patientendaten enthält."""
        if not text or len(text.strip()) < 10:
            return False
            
        # Einfache Keyword-basierte Prüfung
        keywords = [
            'patient', 'name', 'alter', 'geburt', 'datum', 'untersuchung',
            'herr', 'frau', 'jahre', 'jahr', 'männlich', 'weiblich',
            'mr', 'mrs', 'dr', 'prof'
        ]
        
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in keywords)

    def _get_fastest_available_model(self) -> Optional[Dict[str, Any]]:
        """Gibt das schnellste verfügbare Modell zurück."""
        for model_config in ModelConfig.get_models_by_priority():
            if model_config["name"] in self.available_models:
                return model_config
        return None

    def _create_fast_extraction_prompt(self, text: str) -> str:
        """Erstellt einen ultra-kurzen Prompt für maximale Geschwindigkeit."""
        return f"""Extract patient data as JSON from: {text}

Format: {{"patient_name": "...", "patient_age": 0, "examination_date": "...", "gender": "unknown"}}

JSON:"""

    def _calculate_confidence(self, metadata_dict: dict) -> float:
        """
        Berechnet eine einfache Konfidenz basierend auf gefundenen Daten.
        
        Returns:
            Konfidenz-Score zwischen 0.0 und 1.0
        """
        score = 0.0
        
        # Patient Name
        name = metadata_dict.get("patient_name", "")
        if name and name.lower() not in ["unknown", "", "patient", "null"]:
            score += 0.4
            
        # Patient Age  
        age = metadata_dict.get("patient_age", 0)
        if isinstance(age, int) and 0 < age < 120:
            score += 0.3
            
        # Examination Date
        date = metadata_dict.get("examination_date", "")
        if date and date.lower() not in ["unknown", "", "null"]:
            score += 0.2
            
        # Gender
        gender = metadata_dict.get("gender", "")
        if gender and gender.lower() in ["male", "female"]:
            score += 0.1
            
        return min(score, 1.0)

class FrameSamplingOptimizer:
    """
    Optimiert Frame-Sampling für bessere Performance.
    Reduziert unnötige OCR-Operationen durch intelligente Frame-Auswahl.
    """
    
    def __init__(self, max_frames: int = 50, skip_similar_threshold: float = 0.85):
        self.max_frames = max_frames
        self.skip_similar_threshold = skip_similar_threshold
        self.processed_hashes = set()
        self.last_metadata = None
        
    def should_process_frame(self, frame_idx: int, total_frames: int, frame_hash: str = None) -> bool:
        """
        Entscheidet ob ein Frame verarbeitet werden soll.
        
        Args:
            frame_idx: Index des aktuellen Frames
            total_frames: Gesamtanzahl der Frames
            frame_hash: Optional - Hash des Frame-Inhalts für Duplikat-Erkennung
            
        Returns:
            True wenn Frame verarbeitet werden soll
        """
        # Erste Frames immer verarbeiten
        if frame_idx < 5:
            return True
            
        # Letzte Frames immer verarbeiten
        if frame_idx >= total_frames - 5:
            return True
            
        # Frame-Hash Duplikat-Check
        if frame_hash and frame_hash in self.processed_hashes:
            return False
            
        # Adaptive Sampling basierend auf Videolänge
        if total_frames <= 100:
            # Kurze Videos: jeden 2. Frame
            return frame_idx % 2 == 0
        elif total_frames <= 500:
            # Mittlere Videos: jeden 5. Frame
            return frame_idx % 5 == 0
        else:
            # Lange Videos: jeden 10. Frame
            return frame_idx % 10 == 0
    
    def register_processed_frame(self, frame_hash: str, metadata: dict):
        """Registriert einen verarbeiteten Frame."""
        if frame_hash:
            self.processed_hashes.add(frame_hash)
        self.last_metadata = metadata
    
    def get_sampling_strategy(self, total_frames: int) -> Dict[str, Any]:
        """
        Gibt die optimale Sampling-Strategie für die gegebene Frame-Anzahl zurück.
        
        Returns:
            Dictionary mit Sampling-Parametern
        """
        if total_frames <= 50:
            return {
                "strategy": "dense",
                "skip_factor": 1,
                "max_samples": total_frames,
                "description": "Alle Frames verarbeiten (kurzes Video)"
            }
        elif total_frames <= 200:
            return {
                "strategy": "moderate", 
                "skip_factor": 2,
                "max_samples": total_frames // 2,
                "description": "Jeden 2. Frame verarbeiten"
            }
        elif total_frames <= 1000:
            return {
                "strategy": "sparse",
                "skip_factor": 5, 
                "max_samples": total_frames // 5,
                "description": "Jeden 5. Frame verarbeiten"
            }
        else:
            return {
                "strategy": "minimal",
                "skip_factor": 10,
                "max_samples": min(self.max_frames, total_frames // 10),
                "description": "Jeden 10. Frame verarbeiten (langes Video)"
            }


# Factory-Funktion für einfache Verwendung
def create_ollama_extractor(enable_cache: bool = True, enable_smart_sampling: bool = True) -> OllamaOptimizedExtractor:
    """
    Erstellt eine optimierte Ollama-Extractor-Instanz.
    
    Args:
        enable_cache: Aktiviert Metadaten-Caching
        enable_smart_sampling: Aktiviert Smart-Sampling für bessere Performance
    """
    extractor = OllamaOptimizedExtractor(enable_cache=enable_cache)
    
    # Setze optimale Einstellungen für medizinische Datenextraktion
    if enable_smart_sampling:
        logger.info("Smart-Sampling aktiviert für optimale Performance")
    
    return extractor

# Convenience-Funktion für maximale Performance
def create_fast_extractor() -> OllamaOptimizedExtractor:
    """Erstellt Extractor mit maximaler Performance-Optimierung."""
    return create_ollama_extractor(enable_cache=True, enable_smart_sampling=True)

# Erweiterte Factory-Funktion
def create_optimized_extractor_with_sampling() -> tuple[OllamaOptimizedExtractor, FrameSamplingOptimizer]:
    """Erstellt optimierte Extractor- und Sampling-Instanzen."""
    extractor = OllamaOptimizedExtractor()
    optimizer = FrameSamplingOptimizer()
    return extractor, optimizer

# Beispiel-Verwendung
if __name__ == "__main__":
    # Logging konfigurieren
    logging.basicConfig(level=logging.INFO)
    
    # Extractor erstellen
    extractor = create_ollama_extractor()
    
    # Test-Texte
    test_texts = [
        "Herr Müller, 45 Jahre alt, wurde am 15.01.2024 untersucht.",
        "Frau Schmidt, 32 Jahre alt, Untersuchung am 20.02.2024",
        "Patient Klaus Weber (m), 58 Jahre, Termin: 10.03.2024"
    ]
    
    print(f"Modell-Info: {extractor.get_model_info()}")
    print("-" * 50)
    
    for i, text in enumerate(test_texts, 1):
        print(f"\nTest {i}: {text}")
        
        start_time = time.time()
        metadata = extractor.extract_metadata(text)
        duration = time.time() - start_time
        
        if metadata:
            print(f"✅ Erfolgreich in {duration:.2f}s:")
            print(f"   Name: {metadata.patient_name}")
            print(f"   Alter: {metadata.patient_age}")
            print(f"   Datum: {metadata.examination_date}")
            print(f"   Geschlecht: {metadata.gender}")
        else:
            print(f"❌ Fehlgeschlagen nach {duration:.2f}s")
    
class EnrichedMetadataExtractor:
    """
    Erweiterte Metadaten-Extraktion mit Frame-Sampling-Integration.
    Kombiniert LLM-Extraktion mit visuellen Frame-Daten.
    """
    
    def __init__(self, ollama_extractor: OllamaOptimizedExtractor, frame_optimizer: FrameSamplingOptimizer):
        self.ollama_extractor = ollama_extractor
        self.frame_optimizer = frame_optimizer
        self.frame_context = {}
        self.temporal_metadata = []
        
    def extract_from_frame_sequence(self, frames_data: List[Dict[str, Any]], ocr_texts: List[str] = None) -> Dict[str, Any]:
        """
        Extrahiert angereicherte Metadaten aus einer Frame-Sequenz.
        
        Args:
            frames_data: Liste von Frame-Daten aus sample_frames_coroutine
            ocr_texts: Optional - bereits extrahiierte OCR-Texte
            
        Returns:
            Angereicherte Metadaten-Dictionary
        """
        enriched_metadata = {
            "llm_extracted": {},
            "frame_context": {},
            "temporal_analysis": {},
            "confidence_scores": {},
            "source_frames": []
        }
        
        # 1. Sammle Frame-Kontext
        self._analyze_frame_context(frames_data, enriched_metadata)
        
        # 2. OCR-Text-Aggregation
        combined_text = self._aggregate_ocr_texts(frames_data, ocr_texts)
        
        # 3. LLM-Extraktion auf aggregiertem Text
        if combined_text:
            llm_metadata = self.ollama_extractor.extract_metadata_smart_sampling(combined_text)
            if llm_metadata:
                enriched_metadata["llm_extracted"] = {
                    "patient_name": llm_metadata.patient_name,
                    "patient_age": llm_metadata.patient_age,
                    "examination_date": llm_metadata.examination_date,
                    "gender": llm_metadata.gender,
                    "additional_info": llm_metadata.additional_info
                }
        
        # 4. Temporale Analyse der Frames
        self._perform_temporal_analysis(frames_data, enriched_metadata)
        
        # 5. Konfidenz-Bewertung
        self._calculate_enriched_confidence(enriched_metadata)
        
        return enriched_metadata
    
    def _analyze_frame_context(self, frames_data: List[Dict[str, Any]], enriched_metadata: Dict[str, Any]):
        """Analysiert visuellen Kontext der Frames."""
        frame_stats = {
            "total_frames": len(frames_data),
            "text_frames": 0,
            "quality_scores": [],
            "timestamps": [],
            "frame_types": {}
        }
        
        for frame_data in frames_data:
            # Frame-Qualität bewerten
            if "quality_score" in frame_data:
                frame_stats["quality_scores"].append(frame_data["quality_score"])
            
            # Timestamp-Information
            if "timestamp" in frame_data:
                frame_stats["timestamps"].append(frame_data["timestamp"])
            
            # Text-Frames zählen
            if frame_data.get("has_text", False) or frame_data.get("ocr_confidence", 0) > 0.5:
                frame_stats["text_frames"] += 1
            
            # Frame-Typ klassifizieren
            frame_type = self._classify_frame_type(frame_data)
            frame_stats["frame_types"][frame_type] = frame_stats["frame_types"].get(frame_type, 0) + 1
        
        enriched_metadata["frame_context"] = frame_stats
    
    def _aggregate_ocr_texts(self, frames_data: List[Dict[str, Any]], ocr_texts: List[str] = None) -> str:
        """Aggregiert OCR-Texte intelligent."""
        all_texts = []
        
        # Verwende bereitgestellte OCR-Texte oder extrahiere aus Frame-Daten
        if ocr_texts:
            all_texts.extend(ocr_texts)
        else:
            for frame_data in frames_data:
                if "ocr_text" in frame_data and frame_data["ocr_text"]:
                    all_texts.append(frame_data["ocr_text"])
        
        if not all_texts:
            return ""
        
        # Entferne Duplikate und sehr ähnliche Texte
        unique_texts = self._deduplicate_texts(all_texts)
        
        # Priorisiere Texte mit höherer Konfidenz
        prioritized_texts = self._prioritize_by_confidence(unique_texts, frames_data)
        
        # Kombiniere zu einem kohärenten Text
        return " | ".join(prioritized_texts[:5])  # Maximal 5 beste Texte
    
    def _deduplicate_texts(self, texts: List[str]) -> List[str]:
        """Entfernt doppelte und sehr ähnliche Texte."""
        unique_texts = []
        seen_hashes = set()
        
        for text in texts:
            if not text or len(text.strip()) < 3:
                continue
                
            # Normalisiere Text für Vergleich
            normalized = text.lower().strip()
            text_hash = hashlib.md5(normalized.encode()).hexdigest()[:8]
            
            if text_hash not in seen_hashes:
                seen_hashes.add(text_hash)
                unique_texts.append(text)
        
        return unique_texts
    
    def _prioritize_by_confidence(self, texts: List[str], frames_data: List[Dict[str, Any]]) -> List[str]:
        """Priorisiert Texte basierend auf OCR-Konfidenz."""
        text_confidence_pairs = []
        
        for i, text in enumerate(texts):
            confidence = 0.5  # Default-Konfidenz
            
            # Suche entsprechende Frame-Daten
            if i < len(frames_data) and "ocr_confidence" in frames_data[i]:
                confidence = frames_data[i]["ocr_confidence"]
            
            text_confidence_pairs.append((text, confidence))
        
        # Sortiere nach Konfidenz (absteigend)
        text_confidence_pairs.sort(key=lambda x: x[1], reverse=True)
        
        return [text for text, _ in text_confidence_pairs]
    
    def _classify_frame_type(self, frame_data: Dict[str, Any]) -> str:
        """Klassifiziert Frame-Typ basierend auf Eigenschaften."""
        if frame_data.get("has_patient_info", False):
            return "patient_info"
        elif frame_data.get("has_ui_elements", False):
            return "ui_frame"
        elif frame_data.get("ocr_confidence", 0) > 0.7:
            return "text_frame"
        elif frame_data.get("is_endoscopy_view", False):
            return "endoscopy"
        else:
            return "unknown"
    
    def _perform_temporal_analysis(self, frames_data: List[Dict[str, Any]], enriched_metadata: Dict[str, Any]):
        """Führt temporale Analyse der Frame-Sequenz durch."""
        temporal_info = {
            "duration_analysis": {},
            "text_appearance_timeline": [],
            "stability_scores": {},
            "change_points": []
        }
        
        # Analysiere Text-Erscheinungen über Zeit
        for i, frame_data in enumerate(frames_data):
            if frame_data.get("ocr_text"):
                temporal_info["text_appearance_timeline"].append({
                    "frame_index": i,
                    "timestamp": frame_data.get("timestamp", i),
                    "text_snippet": frame_data["ocr_text"][:50] + "..." if len(frame_data["ocr_text"]) > 50 else frame_data["ocr_text"],
                    "confidence": frame_data.get("ocr_confidence", 0)
                })
        
        # Erkenne Änderungspunkte in der Text-Stabilität
        if len(temporal_info["text_appearance_timeline"]) > 1:
            temporal_info["change_points"] = self._detect_text_change_points(temporal_info["text_appearance_timeline"])
        
        enriched_metadata["temporal_analysis"] = temporal_info
    
    def _detect_text_change_points(self, timeline: List[Dict[str, Any]]) -> List[int]:
        """Erkennt Punkte wo sich Text-Inhalt signifikant ändert."""
        change_points = []
        
        for i in range(1, len(timeline)):
            current_text = timeline[i]["text_snippet"]
            previous_text = timeline[i-1]["text_snippet"]
            
            # Einfache Ähnlichkeitsberechnung
            similarity = self._calculate_text_similarity(current_text, previous_text)
            
            if similarity < 0.3:  # Signifikante Änderung
                change_points.append(timeline[i]["frame_index"])
        
        return change_points
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Berechnet einfache Text-Ähnlichkeit."""
        if not text1 or not text2:
            return 0.0
        
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0
    
    def _calculate_enriched_confidence(self, enriched_metadata: Dict[str, Any]):
        """Berechnet erweiterte Konfidenz-Scores."""
        confidence_scores = {
            "llm_confidence": 0.0,
            "frame_quality_confidence": 0.0,
            "temporal_stability_confidence": 0.0,
            "overall_confidence": 0.0
        }
        
        # LLM-Konfidenz
        llm_data = enriched_metadata.get("llm_extracted", {})
        if llm_data:
            confidence_scores["llm_confidence"] = self.ollama_extractor._calculate_confidence(llm_data)
        
        # Frame-Qualität-Konfidenz
        frame_context = enriched_metadata.get("frame_context", {})
        quality_scores = frame_context.get("quality_scores", [])
        if quality_scores:
            confidence_scores["frame_quality_confidence"] = sum(quality_scores) / len(quality_scores)
        
        # Temporale Stabilität
        temporal_analysis = enriched_metadata.get("temporal_analysis", {})
        text_timeline = temporal_analysis.get("text_appearance_timeline", [])
        if text_timeline:
            avg_ocr_confidence = sum(item["confidence"] for item in text_timeline) / len(text_timeline)
            confidence_scores["temporal_stability_confidence"] = avg_ocr_confidence
        
        # Gesamt-Konfidenz (gewichteter Durchschnitt)
        weights = {"llm_confidence": 0.5, "frame_quality_confidence": 0.2, "temporal_stability_confidence": 0.3}
        overall = sum(confidence_scores[key] * weights[key] for key in weights.keys())
        confidence_scores["overall_confidence"] = overall
        
        enriched_metadata["confidence_scores"] = confidence_scores


class FrameDataProcessor:
    """
    Verarbeitet Frame-Daten aus sample_frames_coroutine für Metadaten-Anreicherung.
    """
    
    @staticmethod
    def process_coroutine_output(coroutine_result: Any) -> List[Dict[str, Any]]:
        """
        Verarbeitet die Ausgabe von sample_frames_coroutine zu standardisiertem Format.
        
        Args:
            coroutine_result: Ergebnis der sample_frames_coroutine
            
        Returns:
            Liste von standardisierten Frame-Daten
        """
        processed_frames = []
        
        # Anpassung je nach Format der Coroutine-Ausgabe
        if isinstance(coroutine_result, list):
            for i, frame_item in enumerate(coroutine_result):
                processed_frame = FrameDataProcessor._normalize_frame_data(frame_item, i)
                processed_frames.append(processed_frame)
        elif hasattr(coroutine_result, '__iter__'):
            for i, frame_item in enumerate(coroutine_result):
                processed_frame = FrameDataProcessor._normalize_frame_data(frame_item, i)
                processed_frames.append(processed_frame)
        
        return processed_frames
    
    @staticmethod
    def _normalize_frame_data(frame_item: Any, frame_index: int) -> Dict[str, Any]:
        """Normalisiert Frame-Daten zu einheitlichem Format."""
        normalized = {
            "frame_index": frame_index,
            "timestamp": frame_index,  # Default-Timestamp
            "ocr_text": "",
            "ocr_confidence": 0.0,
            "has_text": False,
            "has_patient_info": False,
            "has_ui_elements": False,
            "is_endoscopy_view": False,
            "quality_score": 0.5
        }
        
        # Verschiedene Input-Formate handhaben
        if isinstance(frame_item, dict):
            normalized.update(frame_item)
        elif hasattr(frame_item, '__dict__'):
            normalized.update(frame_item.__dict__)
        elif isinstance(frame_item, (tuple, list)) and len(frame_item) >= 2:
            # Annahme: (frame_data, ocr_text) oder ähnlich
            if len(frame_item) > 1 and isinstance(frame_item[1], str):
                normalized["ocr_text"] = frame_item[1]
                normalized["has_text"] = bool(frame_item[1])
        
        return normalized


# Erweiterte Factory-Funktion für angereicherte Extraktion
def create_enriched_extractor() -> EnrichedMetadataExtractor:
    """Erstellt einen angereicherten Metadaten-Extractor."""
    ollama_extractor = create_fast_extractor()
    frame_optimizer = FrameSamplingOptimizer()
    return EnrichedMetadataExtractor(ollama_extractor, frame_optimizer)

# Beispiel-Integration für sample_frames_coroutine
async def extract_enriched_metadata_from_video(video_path: str, sample_frames_coroutine) -> Dict[str, Any]:
    """
    Beispiel-Funktion für die Integration mit sample_frames_coroutine.
    
    Args:
        video_path: Pfad zum Video
        sample_frames_coroutine: Die sample_frames_coroutine Funktion
        
    Returns:
        Angereicherte Metadaten
    """
    
    # 1. Führe sample_frames_coroutine aus
    logger.info(f"Starte Frame-Sampling für Video: {video_path}")
    frame_samples = await sample_frames_coroutine(video_path)
    
    # 2. Verarbeite Coroutine-Ausgabe
    processed_frames = FrameDataProcessor.process_coroutine_output(frame_samples)
    logger.info(f"Verarbeitete {len(processed_frames)} Frames")
    
    # 3. Erstelle angereicherten Extractor
    enriched_extractor = create_enriched_extractor()
    
    # 4. Extrahiere angereicherte Metadaten
    enriched_metadata = enriched_extractor.extract_from_frame_sequence(processed_frames)
    
    # 5. Füge Video-spezifische Informationen hinzu
    enriched_metadata["video_info"] = {
        "video_path": video_path,
        "processing_timestamp": time.time(),
        "total_sampled_frames": len(processed_frames)
    }
    
    # 6. Logge Ergebnisse
    logger.info(f"✅ Angereicherte Metadaten-Extraktion abgeschlossen:")
    if enriched_metadata.get("llm_extracted"):
        llm_data = enriched_metadata["llm_extracted"]
        logger.info(f"   Patient: {llm_data.get('patient_name', 'Unknown')}")
        logger.info(f"   Alter: {llm_data.get('patient_age', 'Unknown')}")
        logger.info(f"   Datum: {llm_data.get('examination_date', 'Unknown')}")
    
    confidence = enriched_metadata.get("confidence_scores", {}).get("overall_confidence", 0)
    logger.info(f"   Gesamt-Konfidenz: {confidence:.2f}")
    
    return enriched_metadata


def integrate_with_frame_cleaner(frame_cleaner_instance, video_path: str) -> Dict[str, Any]:
    """
    Integration mit dem bestehenden FrameCleaner für nahtlose Metadaten-Anreicherung.
    
    Args:
        frame_cleaner_instance: Instanz des FrameCleaner
        video_path: Pfad zum Video
        
    Returns:
        Angereicherte Metadaten
    """
    
    # 1. Simuliere Frame-Sampling (angepasst an FrameCleaner-Architektur)
    frames_data = []
    
    # Verwende FrameCleaner's _iter_video Methode für konsistentes Frame-Sampling
    for idx, gray_frame, stride in frame_cleaner_instance._iter_video(Path(video_path), total_frames=None):
        
        # OCR-Extraktion für diesen Frame
        ocr_text, ocr_conf, _ = frame_cleaner_instance.frame_ocr.extract_text_from_frame(
            gray_frame, roi=None, high_quality=True
        )
        
        # Frame-Daten zusammenstellen
        frame_data = {
            "frame_index": idx,
            "timestamp": idx * stride if stride else idx,
            "ocr_text": ocr_text or "",
            "ocr_confidence": ocr_conf,
            "has_text": bool(ocr_text and len(ocr_text.strip()) > 3),
            "quality_score": 0.8 if ocr_conf > 0.5 else 0.3,
            "stride": stride
        }
        
        frames_data.append(frame_data)
        
        # Begrenzte Anzahl von Frames für Performance
        if len(frames_data) >= 50:
            break
    
    # 2. Erstelle angereicherten Extractor
    enriched_extractor = create_enriched_extractor()
    
    # 3. Extrahiere angereicherte Metadaten
    enriched_metadata = enriched_extractor.extract_from_frame_sequence(frames_data)
    
    # 4. Integriere mit bestehenden FrameCleaner-Metadaten
    # Diese können dann mit dem bestehenden accumulated Dictionary gemerged werden
    
    return enriched_metadata


class VideoMetadataEnricher:
    """
    Haupt-Klasse für Video-Metadaten-Anreicherung mit verschiedenen Datenquellen.
    """
    
    def __init__(self):
        self.enriched_extractor = create_enriched_extractor()
        self.frame_processor = FrameDataProcessor()
        
    def enrich_from_multiple_sources(self, 
                                   video_path: str,
                                   frame_samples: List[Any] = None,
                                   ocr_texts: List[str] = None,
                                   existing_metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Reichert Metadaten aus verschiedenen Quellen an.
        
        Args:
            video_path: Pfad zum Video
            frame_samples: Ausgabe von sample_frames_coroutine
            ocr_texts: Bereits extrahierte OCR-Texte
            existing_metadata: Bestehende Metadaten (z.B. aus FrameCleaner)
            
        Returns:
            Vollständig angereicherte Metadaten
        """
        
        final_metadata = {
            "source_info": {
                "video_path": video_path,
                "processing_method": "enriched_extraction",
                "timestamp": time.time()
            },
            "enriched_data": {},
            "legacy_data": existing_metadata or {},
            "integration_stats": {}
        }
        
        # 1. Verarbeite Frame-Samples falls vorhanden
        if frame_samples:
            processed_frames = self.frame_processor.process_coroutine_output(frame_samples)
            enriched_data = self.enriched_extractor.extract_from_frame_sequence(processed_frames, ocr_texts)
            final_metadata["enriched_data"] = enriched_data
        
        # 2. Merge mit bestehenden Metadaten
        if existing_metadata:
            final_metadata = self._merge_metadata_sources(final_metadata, existing_metadata)
        
        # 3. Berechne Integrations-Statistiken
        final_metadata["integration_stats"] = self._calculate_integration_stats(final_metadata)
        
        return final_metadata
    
    def _merge_metadata_sources(self, enriched_metadata: Dict[str, Any], existing_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Merged angereicherte Metadaten mit bestehenden Daten."""
        
        # Prioritäts-basiertes Merging
        merged = enriched_metadata.copy()
        
        # LLM-Daten haben Priorität über legacy OCR-Extraktion
        llm_data = enriched_metadata.get("enriched_data", {}).get("llm_extracted", {})
        
        for key in ["patient_name", "patient_age", "examination_date", "gender"]:
            if key in existing_metadata and (not llm_data.get(key) or llm_data.get(key) in ["unknown", "", None]):
                # Verwende Legacy-Daten als Fallback
                if "fallback_data" not in merged:
                    merged["fallback_data"] = {}
                merged["fallback_data"][key] = existing_metadata[key]
        
        return merged
    
    def _calculate_integration_stats(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Berechnet Statistiken über die Metadaten-Integration."""
        
        stats = {
            "data_sources_used": [],
            "confidence_comparison": {},
            "data_completeness": 0.0
        }
        
        # Erkenne verwendete Datenquellen
        if metadata.get("enriched_data"):
            stats["data_sources_used"].append("enriched_llm")
        if metadata.get("legacy_data"):
            stats["data_sources_used"].append("legacy_ocr")
        if metadata.get("fallback_data"):
            stats["data_sources_used"].append("fallback_data")
        
        # Daten-Vollständigkeit berechnen
        required_fields = ["patient_name", "patient_age", "examination_date", "gender"]
        filled_fields = 0
        
        for source in ["enriched_data", "legacy_data", "fallback_data"]:
            source_data = metadata.get(source, {})
            if isinstance(source_data, dict) and "llm_extracted" in source_data:
                source_data = source_data["llm_extracted"]
            
            for field in required_fields:
                if source_data.get(field) not in [None, "", "unknown"]:
                    filled_fields += 1
                    break  # Feld ist gefüllt, nächstes Feld
        
        stats["data_completeness"] = filled_fields / len(required_fields)
        
        return stats
