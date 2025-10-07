# OllamaOptimizedExtractor - Korrigierte Implementation

## Problem
Die ursprüngliche `extract_metadata` Methode hatte ein fehlerhaftes Fallback-System, das nicht alle verfügbaren Modelle durchprobierte und bei Fehlern nicht korrekt zum nächsten Modell wechselte.

## Implementierte Lösung

### 🔄 **Vollständiges Fallback-System**

```python
def extract_metadata(self, text: str) -> Optional[PatientMetadata]:
    # Bestimme alle verfügbaren Modelle für systematischen Fallback
    available_model_configs = [
        m for m in ModelConfig.get_models_by_priority() 
        if m["name"] in self.available_models
    ]
    
    # Versuche jedes Modell der Reihe nach
    for model_attempt, model_config in enumerate(available_model_configs):
        self.current_model = model_config
        
        try:
            # API-Request mit robuster Fehlerbehandlung
            response = self._make_api_request(payload)
            
            # JSON-Validierung mit Bereinigung
            cleaned_content = self._clean_json_response(content)
            metadata = PatientMetadata(**json.loads(cleaned_content))
            
            return metadata  # Erfolg!
            
        except (Timeout, JSON-Error, ValidationError):
            # Protokolliere Fehler und versuche nächstes Modell
            continue
```

### 🧹 **Robuste JSON-Bereinigung**

```python
def _clean_json_response(self, content: str) -> str:
    # Entferne Markdown-Code-Blöcke
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    
    # Extrahiere JSON-Block aus Antwort
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.strip().startswith('{'):
            json_start = i
            break
    
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip().endswith('}'):
            json_end = i
            break
    
    return '\n'.join(lines[json_start:json_end + 1]).strip()
```

### 📝 **Optimierter Prompt**

```python
def _create_extraction_prompt(self, text: str) -> str:
    return f"""Du bist ein medizinischer Datenextraktions-Assistent. 
Extrahiere die Patientenmetadaten aus dem folgenden Text und gib sie als gültiges JSON zurück.

EINGABE-TEXT:
{text}

ANWEISUNGEN:
1. Antworte NUR mit dem JSON-Objekt
2. Keine Markdown-Formatierung (```json) verwenden
3. Keine zusätzlichen Erklärungen oder Text außerhalb des JSON

BEISPIEL-AUSGABE:
{{"patient_name": "Max Mustermann", "patient_age": 45, "examination_date": "15.01.2024", "gender": "male"}}

JSON-AUSGABE:"""
```

### 🔧 **Verbesserte API-Requests**

```python
@retry(stop=stop_after_attempt(2), wait=wait_fixed(1))
def _make_api_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        timeout = self.current_model.get("timeout", 30)
        
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
                raise requests.RequestException("Unvollständige API-Antwort")
            
            return result
        else:
            raise requests.RequestException(f"HTTP {response.status_code}")
            
    except requests.Timeout:
        logger.error(f"⏰ Timeout ({timeout}s) bei {self.current_model['name']}")
        raise
    except requests.ConnectionError as e:
        logger.error(f"🔌 Verbindungsfehler zu Ollama: {e}")
        raise requests.RequestException(f"Ollama nicht erreichbar: {e}")
```

## Funktionsweise des Fallback-Systems

### 1. **Modell-Priorisierung**
```python
MODELS = [
    {"name": "qwen2.5:1.5b-instruct", "priority": 1, "timeout": 15},  # Schnellstes
    {"name": "llama3.2:1b", "priority": 2, "timeout": 20},           # Kompakt
    {"name": "phi3.5:3.8b-mini-instruct-q4_K_M", "priority": 3},    # Balanced
    {"name": "deepseek-r1:1.5b", "priority": 99, "timeout": 60}     # Fallback
]
```

### 2. **Systematischer Fallback**
- **Schritt 1**: Versuche Priorität 1 Modell (qwen2.5:1.5b-instruct)
- **Bei Timeout/Fehler**: Wechsle zu Priorität 2 (llama3.2:1b)
- **Bei JSON-Fehler**: Wechsle zu Priorität 3 (phi3.5)
- **Letzter Versuch**: deepseek-r1:1.5b (langsamster Fallback)

### 3. **Fehlertyp-spezifisches Handling**
- **Timeout**: Sofort nächstes Modell versuchen
- **JSON-Parsing**: JSON bereinigen, bei erneutem Fehler nächstes Modell
- **API-Fehler**: Mit Retry-Logik versuchen, dann nächstes Modell
- **Verbindungsfehler**: Sofortiger Abbruch (Ollama nicht erreichbar)

## Performance-Verbesserungen

### ⚡ **Geschwindigkeits-Optimierungen**
- **Leichte Modelle zuerst**: 1.5B Parameter vor 3.8B
- **Reduzierte Retry-Versuche**: 2 statt 3 für schnelleres Failover
- **Adaptive Timeouts**: 15s für kleine, 60s für große Modelle

### 🎯 **Erfolgswahrscheinlichkeit**
- **Mehrere Modelle**: 4 verschiedene Ansätze für Extraktion
- **JSON-Bereinigung**: Behandlung von Markdown und Formatierungsfehlern
- **Robuste Prompts**: Klare Anweisungen für konsistente Ausgabe

### 📊 **Monitoring & Debugging**
```python
logger.info(f"Versuch {model_attempt + 1}/{len(available_model_configs)}: "
           f"Extraktion mit {self.current_model['name']}")
logger.info(f"✅ Erfolgreich extrahiert mit {self.current_model['name']}: "
           f"{metadata.patient_name}, Alter: {metadata.patient_age}")
```

## Test-Integration

### 🧪 **Umfassende Tests**
Das mitgelieferte `test_ollama_extractor.py` testet:

1. **Standard-Fälle**: Deutsche Patientendaten
2. **Edge-Cases**: Komplexe Namen, unklare Geschlechter
3. **Fallback-Tests**: Schwierige/unleserliche Eingaben
4. **Performance-Metriken**: Zeit pro Extraktion und Erfolgsrate

### 📈 **Erwartete Ergebnisse**
- **Erfolgsrate**: >90% bei strukturierten medizinischen Texten
- **Durchschnittliche Zeit**: 2-5s pro Extraktion (abhängig vom Modell)
- **Fallback-Häufigkeit**: ~10-20% der Fälle benötigen Modell-Wechsel

## Integration in lx-annotator

```python
# Einfache Verwendung
from ollama_llm_meta_extraction_optimized import create_ollama_extractor

extractor = create_ollama_extractor()
text = "Herr Max Mustermann, 45 Jahre alt, wurde am 15.01.2024 untersucht."
metadata = extractor.extract_metadata(text)

if metadata:
    print(f"Patient: {metadata.patient_name}, Alter: {metadata.patient_age}")
else:
    print("Extraktion fehlgeschlagen")
```

## Lessons Learned

1. **Systematischer Fallback**: Alle verfügbaren Modelle durchprobieren statt early exit
2. **JSON-Robustheit**: Modelle geben oft verschmutzte JSON-Antworten zurück
3. **Timeout-Management**: Kleine Modelle benötigen aggressive Timeouts
4. **Error-Type Awareness**: Verschiedene Fehlertypen benötigen verschiedene Recovery-Strategien

Das verbesserte System stellt sicher, dass die Metadaten-Extraktion auch bei schwierigen Eingaben oder temporären Modell-Problemen robust funktioniert.
