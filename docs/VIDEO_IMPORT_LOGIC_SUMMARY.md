# Video Import Logic Implementation

## Überblick

Die Video-Import-Logik wurde erfolgreich umgesetzt, um Videos gemäß den geforderten Spezifikationen zu verwalten:

### Zielverzeichnisse:
- **Unverarbeitete Videos (raw_file_path)**: `/home/admin/dev/lx-annotate/data/videos`
- **Verarbeitete Videos (file_path)**: `/home/admin/dev/lx-annotate/data/anonym_videos`
- **Keine Videos verbleiben in**: `/home/admin/dev/lx-annotate/data/raw_videos`

## Implementierte Änderungen

### 1. Neue `_move_to_final_storage()` Methode
- Verschiebt Videos direkt von `raw_videos` nach `data/videos`
- Verwendet UUID-basierte Dateinamen für Eindeutigkeit
- Aktualisiert Datenbankpfade automatisch
- Verwendet relative Pfade zur Storage-Root

### 2. Überarbeitete `_create_or_retrieve_video_instance()` Methode
- Entfernt komplexe mehrfache Dateibewegungen
- Ruft `_move_to_final_storage()` direkt nach Video-Erstellung auf
- Vereinfachter, atomischer Ansatz

### 3. Vereinfachte `_setup_processing_environment()` Methode
- Entfernt `_create_sensitive_file()` Aufruf
- Video ist bereits an finaler Position
- Fokussiert auf Frame-Extraktion und Metadaten

### 4. Neue `_cleanup_and_archive()` Methode
- Verschiebt verarbeitete Videos nach `data/anonym_videos`
- Behandelt sowohl gereinigte als auch nicht-gereinigte Videos
- Aktualisiert `file` Feld in Datenbank für verarbeitete Videos
- Bereinigt temporäre Verzeichnisse

### 5. Aktualisierte `_perform_frame_cleaning()` Methode
- Verwendet rohe Video-Pfade aus Kontext
- Speichert gereinigtes Video temporär
- Übergibt Pfad an `_cleanup_and_archive()` für finale Bewegung

## Verarbeitungsablauf

```
1. Video in raw_videos erkannt
2. _create_or_retrieve_video_instance():
   - Video-Instanz erstellen
   - _move_to_final_storage(): raw_videos → data/videos
   - raw_file_path in DB aktualisieren
3. _setup_processing_environment():
   - Frame-Extraktion
   - Metadaten-Initialisierung
4. _process_frames_and_metadata():
   - _perform_frame_cleaning() (falls verfügbar)
   - Gereinigtes Video temporär speichern
5. _cleanup_and_archive():
   - Verarbeitetes Video: temp → data/anonym_videos
   - file_path in DB aktualisieren
   - Temporäre Dateien bereinigen
6. Endergebnis:
   - Rohvideo: data/videos (raw_file_path)
   - Verarbeitetes Video: data/anonym_videos (file_path)
   - Keine Videos in raw_videos
```

## Verbesserungen

### Vorher (Probleme):
- Mehrfache Dateibewegungen (3x)
- Inkonsistente Pfad-Updates
- Komplexe fehleranfällige Logik
- Race Conditions möglich

### Nachher (Vorteile):
- Atomische Single-Move-Operationen
- Konsistente Datenbankaktualisierungen
- Vereinfachte, wartbare Logik  
- Robuste Fehlerbehandlung
- Klare Trennung von Roh- und verarbeiteten Videos

## Datenbankfelder

- **`raw_file`**: Zeigt auf unverarbeitetes Video in `/data/videos`
- **`file`**: Zeigt auf verarbeitetes Video in `/data/anonym_videos`
- Beide verwenden relative Pfade zur Storage-Root

## Testing

Die Implementierung wurde erfolgreich getestet:
- ✅ VideoImportService initialisiert korrekt
- ✅ Alle neuen Methoden sind verfügbar
- ✅ Django-Integration funktioniert
- ✅ Pfadkonfiguration korrekt

## Nächste Schritte

1. **Produktionstest**: Test mit echten Video-Dateien
2. **File Watcher Integration**: Aktualisierung des File Watchers
3. **Monitoring**: Überwachung der Verzeichnisse
4. **Cleanup**: Entfernung alter nicht genutzter Methoden
