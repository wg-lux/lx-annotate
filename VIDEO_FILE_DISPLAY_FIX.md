# Fix: VideoFile zeigt keine active und raw file nach neuem Import

## Problem
Nach einem neuen Video-Import zeigt das VideoFile keine `active_file` und `raw_file` in der Benutzeroberfläche an, obwohl die Datei erfolgreich importiert wurde.

## Root Cause Analyse

### 1. Hauptproblem: Fehlerhafte `active_file` Property
**Datei**: `video_file.py`, Zeile 365-376
**Problem**: Die `active_file` Property gab nur `processed_file` zurück und warf einen Fehler, wenn keine processed_file vorhanden war, anstatt auf `raw_file` zurückzugreifen.

```python
# VORHER (fehlerhaft):
@property
def active_file(self) -> File:
    if self.is_processed:
        return self.processed_file
    else:
        raise ValueError("No active file available...")  # ❌ Fehler bei neuen Imports!

# NACHHER (korrekt):
@property  
def active_file(self) -> File:
    if self.is_processed:
        return self.processed_file
    elif self.has_raw:
        return self.raw_file  # ✅ Fallback auf raw_file
    else:
        raise ValueError("No active file available...")
```

### 2. Sekundärproblem: Absolute Pfade in `_create_sensitive_file`
**Datei**: `video_import.py`, Zeile 354-355
**Problem**: Die `raw_file` wurde mit einem absoluten Pfad gesetzt, anstatt eines relativen Pfads vom Storage-Root.

```python
# VORHER (problematisch):
video_file.raw_file = str(target_file_path)  # Absoluter Pfad

# NACHHER (korrekt):
storage_root = data_paths["storage"]
relative_path = target_file_path.relative_to(storage_root)
video_file.raw_file.name = str(relative_path)  # Relativer Pfad
```

## Implementierte Lösungen

### Fix 1: `active_file` Property Korrektur

**Auswirkung**: Neue Video-Imports zeigen jetzt korrekt die raw_file als active_file an, bis eine processed_file verfügbar ist.

**Verhalten**:
- **Bei processed file vorhanden**: Zeigt `processed_file` (bisheriges Verhalten)
- **Bei nur raw file vorhanden**: Zeigt `raw_file` (neu hinzugefügt)
- **Bei keiner Datei vorhanden**: Wirft aussagekräftigen Fehler

### Fix 2: Korrekte Pfad-Behandlung in `_create_sensitive_file`

**Verbesserungen**:
- **Relativer Pfad**: Konsistent mit `create_from_file.py` Implementation
- **Fallback-Mechanismus**: Bei Fehlern beim relativen Pfad-Setzen
- **Besseres Logging**: Detaillierte Protokollierung der Pfad-Updates

```python
# Primäre Methode (relativ zu storage root)
storage_root = data_paths["storage"] 
relative_path = target_file_path.relative_to(storage_root)
video_file.raw_file.name = str(relative_path)

# Fallback-Methode bei Fehlern
video_file.raw_file.name = f"videos/sensitive/{target_file_path.name}"
```

## Workflow-Auswirkungen

### Neuer Import-Workflow:
1. **Video erstellt**: `raw_file` gesetzt, `processed_file` = None
2. **active_file Abfrage**: Gibt `raw_file` zurück ✅ (vorher: Fehler ❌)
3. **UI-Anzeige**: Zeigt "Raw" Status mit verfügbarer Datei ✅
4. **Nach Verarbeitung**: `processed_file` gesetzt, `active_file` gibt `processed_file` zurück
5. **UI-Anzeige**: Zeigt "Processed" Status ✅

### Betroffene Komponenten:
- **Frontend Video-Liste**: Zeigt jetzt korrekt raw files für neue Imports
- **Video-Streaming**: Kann auf raw files zugreifen bis processed verfügbar
- **Download-Funktionalität**: Funktioniert mit raw files
- **Video-Player**: Kann raw files abspielen

## Rückwärtskompatibilität
- ✅ **Bestehende processed files**: Unveränderte Funktionalität
- ✅ **Bestehende raw files**: Verbesserte Zugänglichkeit
- ✅ **API-Kompatibilität**: Keine Breaking Changes

## Testing-Szenarien

### Test 1: Neuer Video-Import
```python
# Import neues Video
video = VideoImportService().import_and_anonymize(file_path, center, processor)

# Erwartetes Verhalten:
assert video.has_raw == True
assert video.is_processed == False
assert video.active_file == video.raw_file  # Neu funktionsfähig
```

### Test 2: Video nach Verarbeitung
```python
# Nach Anonymisierung
video.processed_file = processed_file_path
video.save()

# Erwartetes Verhalten:
assert video.has_raw == True
assert video.is_processed == True  
assert video.active_file == video.processed_file  # Bevorzugt processed
```

### Test 3: Fehlerfall
```python
# Video ohne Dateien
video.raw_file = None
video.processed_file = None

# Erwartetes Verhalten:
with pytest.raises(ValueError, match="No active file available"):
    _ = video.active_file
```

## Monitoring und Logs

### Neue Log-Nachrichten:
```
INFO: Updated video.raw_file to point to sensitive location: videos/sensitive/uuid.mp4
WARNING: Failed to set relative path, using fallback: [error]
INFO: Updated video.raw_file using fallback method: videos/sensitive/uuid.mp4
```

### Metriken:
- **Success Rate**: Video-Imports mit funktionierender active_file
- **Path Accuracy**: Anteil relativer vs. absoluter Pfade
- **UI Responsiveness**: Zeit bis zur Anzeige neuer Videos

## Lessons Learned

1. **Fallback-Mechanismen**: Properties sollten graceful degradation implementieren
2. **Pfad-Konsistenz**: Relative Pfade sind kritisch für portable Storage-Systeme
3. **Defensive Programmierung**: Nicht annehmen, dass processed_file immer verfügbar ist
4. **Test Coverage**: Edge Cases für verschiedene File-Zustände abdecken

Der Fix stellt sicher, dass neue Video-Imports sofort in der UI sichtbar und zugänglich sind, auch vor der Verarbeitung zu anonymisierten Videos.
