# File Watcher Service

Automatischer Service zur Überwachung und Verarbeitung von Video- und PDF-Dateien.

## Übersicht

Der File Watcher Service überwacht automatisch folgende Verzeichnisse:
- `./data/raw_videos/` - Für Video-Dateien (.mp4, .avi, .mov, .mkv, .webm, .m4v)
- `./data/raw_pdfs/` - Für PDF-Dateien (.pdf)

Bei neuen Dateien werden automatisch folgende Prozesse gestartet:
- **Videos**: Import, Anonymisierung und Segmentierung
- **PDFs**: Import und Anonymisierung

## Quick Start

### 1. Setup und Installation
```bash
# Vollständige Einrichtung
./scripts/start_filewatcher.sh setup
```

### 2. Service starten
```bash
# Als System Service (empfohlen)
sudo ./scripts/start_filewatcher.sh start

# Oder im Development-Modus (Vordergrund)
./scripts/start_filewatcher.sh dev
```

### 3. Status prüfen
```bash
./scripts/start_filewatcher.sh status
```

### 4. Logs anzeigen
```bash
./scripts/start_filewatcher.sh logs
```

## Verwendung

### Dateien hinzufügen
Einfach Dateien in die überwachten Verzeichnisse kopieren oder verschieben:

```bash
# Videos
cp mein_video.mp4 ./data/raw_videos/

# PDFs  
cp mein_dokument.pdf ./data/raw_pdfs/
```

Die Dateien werden automatisch verarbeitet, sobald sie vollständig geschrieben sind.

### Django Management Command
Alternativ kann der Service über Django gestartet werden:

```bash
# Service starten
python manage.py start_filewatcher

# Nur Test der Konfiguration
python manage.py start_filewatcher --test

# Bestehende Dateien verarbeiten
python manage.py start_filewatcher --existing

# Mit Debug-Logging
python manage.py start_filewatcher --log-level DEBUG
```

## Verfügbare Kommandos

| Kommando | Beschreibung |
|----------|-------------|
| `setup` | Vollständige Einrichtung (Dependencies, Verzeichnisse, Test, Service-Installation) |
| `start` | Service starten |
| `stop` | Service stoppen |
| `restart` | Service neu starten |
| `status` | Status anzeigen |
| `logs` | Logs anzeigen (Follow-Modus) |
| `dev` | Im Development-Modus starten (Vordergrund) |
| `test` | Konfiguration testen |

## Konfiguration

### Umgebungsvariablen
- `DJANGO_SETTINGS_MODULE`: Django Settings (Standard: `lx_annotate.settings.dev`)
- `WATCHER_LOG_LEVEL`: Log-Level (Standard: `INFO`)

### Standard-Einstellungen
- **Center**: `university_hospital_wuerzburg`
- **Processor**: `olympus_cv_1500`  
- **AI Model**: `image_multilabel_classification_colonoscopy_default`

### Verzeichnisstruktur
```
./data/
├── raw_videos/          # Überwacht für Video-Dateien
├── raw_pdfs/           # Überwacht für PDF-Dateien
└── ...

./logs/
└── file_watcher.log    # Log-Datei
```

## Systemd Service

### Installation
```bash
# Service installieren (benötigt root)
sudo ./scripts/start_filewatcher.sh install-service
```

### Systemd Kommandos
```bash
# Service starten
sudo systemctl start lx-filewatcher

# Service stoppen
sudo systemctl stop lx-filewatcher

# Status prüfen
sudo systemctl status lx-filewatcher

# Logs anzeigen
sudo journalctl -u lx-filewatcher -f

# Service aktivieren (Auto-Start)
sudo systemctl enable lx-filewatcher
```

## Verarbeitung

### Videos
1. **Import**: Datei wird in das System importiert
2. **Anonymisierung**: OCR-basierte Extraktion und Anonymisierung von Patientendaten
3. **Segmentierung**: AI-basierte Analyse und Klassifikation der Video-Inhalte
4. **Standard-Patientendaten**: Bei OCR-Fehlern werden Standard-Werte gesetzt

### PDFs
1. **Import**: Datei wird in das System importiert
2. **Anonymisierung**: Text-Extraktion und Anonymisierung von sensiblen Daten

## Fehlerbehandlung

### Logs prüfen
```bash
# Service-Logs
./scripts/start_filewatcher.sh logs

# Oder direkt die Log-Datei
tail -f ./logs/file_watcher.log
```

### Häufige Probleme

| Problem | Lösung |
|---------|--------|
| Service startet nicht | `./scripts/start_filewatcher.sh test` ausführen |
| Dateien werden nicht verarbeitet | Logs prüfen, Berechtigungen überprüfen |
| Django-Fehler | `DJANGO_SETTINGS_MODULE` korrekt setzen |
| Import-Fehler | Dependencies mit `./scripts/start_filewatcher.sh setup` installieren |

### Datei-Stabilität
Der Service wartet auf vollständig geschriebene Dateien:
- **Timeout**: 30 Sekunden
- **Stable Checks**: 3 aufeinanderfolgende Größenprüfungen
- **Temporäre Dateien**: Werden ignoriert (`.` oder `~` Präfix)

## Monitoring

### Status-Überwachung
```bash
# Systemd Status
sudo systemctl is-active lx-filewatcher

# Detaillierter Status
./scripts/start_filewatcher.sh status
```

### Performance
- **Memory Limit**: 2GB (systemd)
- **File Descriptors**: 65536 (systemd)
- **Health Check**: Alle 10 Sekunden
- **Restart Policy**: Automatisch bei Fehlern (10s Verzögerung)

## Sicherheit

### Systemd-Sicherheitseinstellungen
- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `ProtectSystem=strict`
- Beschränkte Schreibberechtigungen nur für notwendige Verzeichnisse

### Berechtigungen
- Service läuft unter `admin` Benutzer
- Nur Lese-/Schreibzugriff auf notwendige Verzeichnisse
- Keine erhöhten Privilegien erforderlich

## Entwicklung

### Development-Modus
```bash
# Im Vordergrund starten mit Debug-Logging
./scripts/start_filewatcher.sh dev
```

### Debugging
```bash
# Konfiguration testen
python manage.py start_filewatcher --test

# Mit hohem Verbosity-Level
python manage.py start_filewatcher --verbosity 2
```

### Anpassungen
- **File Extensions**: In `AutoProcessingHandler.__init__()` anpassen
- **Processing Logic**: `_process_video()` und `_process_pdf()` Methoden erweitern
- **Default Settings**: Klassenvariablen in `AutoProcessingHandler` ändern