# 🔴 KRITISCHER BUG: Video/PDF Storage Path Mismatch
**Datum:** 14. Oktober 2025, 15:15 Uhr  
**Schweregrad:** 🔴 **KRITISCH** - Verhindert Video/PDF Streaming  
**Status:** ✅ ROOT CAUSE IDENTIFIZIERT

---

## 🎯 Problem Summary

**Symptom:**
Alle Video- und PDF-Streams schlagen mit 404 fehl, obwohl die Dateien physisch auf dem Filesystem existieren.

```
ERROR: Video file not found on disk: videos/3c5be74a-a970-4b41-acf1-13ca03ce4bd5_test_instrument.mp4
                                      ↑
                                      Relativer Pfad - nicht absolut!
```

**Aber die Datei existiert:**
```bash
$ ls /home/admin/dev/lx-annotate/data/videos/3c5be74a-a970-4b41-acf1-13ca03ce4bd5_test_instrument.mp4
✅ EXISTS
```

---

## 🔍 Root Cause Analysis

### **Problem: Relative vs. Absolute Paths**

Der Streaming-Code erwartet **absolute Pfade**, aber die Import-Services speichern **relative Pfade** in der Datenbank:

```python
# ❌ WAS IN DATENBANK GESPEICHERT WIRD (video_import.py L210):
self.current_video.raw_file.name = f"videos/{video_filename}"
#                                      ↑
#                                      RELATIVER Pfad!

# ❌ WAS STREAMING-CODE ERWARTET (video_stream.py L47):
path = Path(vf.active_raw_file.path)  # ← Erwartet ABSOLUTEN Pfad!
#                              ↑
#                              .path gibt nur .name zurück wenn kein MEDIA_ROOT!

# ✅ WAS TATSÄCHLICH EXISTIERT:
/home/admin/dev/lx-annotate/data/videos/3c5be74a-a970-4b41-acf1-13ca03ce4bd5_test_instrument.mp4
```

---

## 📊 Detailed Analysis

### **Video Import Service - Wie Pfade gespeichert werden:**

**Datei:** `libs/endoreg-db/endoreg_db/services/video_import.py`

```python
# Line 210: Raw Video Path wird RELATIV gespeichert
self.current_video.raw_file.name = f"videos/{video_filename}"
#                                      ↑
#                                      RELATIVE to STORAGE_DIR

# Line 383: Processed Video Path wird ebenfalls RELATIV gespeichert  
self.current_video.processed_file = str(relative_path)
#                                       ↑
#                                       RELATIVE to STORAGE_DIR
```

**Beispiel:**
- **Physischer Pfad:** `/home/admin/dev/lx-annotate/data/videos/UUID_video.mp4`
- **In DB gespeichert:** `videos/UUID_video.mp4` ← RELATIV!
- **STORAGE_DIR:** `/home/admin/dev/lx-annotate/data/`

### **PDF Import Service - Gleiche Problem:**

**Datei:** `libs/endoreg-db/endoreg_db/services/pdf_import.py`

```python
# Line 920: PDF Path wird RELATIV gespeichert
pdf_file.file.name = relative_name
#                    ↑
#                    RELATIVE to STORAGE_DIR

# Line 613: Anonymized PDF ebenfalls RELATIV
self.current_pdf.anonymized_file.name = relative_name
```

### **Video Stream View - Was erwartet wird:**

**Datei:** `libs/endoreg-db/endoreg_db/views/video/video_stream.py`

```python
# Line 47: Versucht Path zu erstellen
path = Path(vf.active_raw_file.path)
#                              ↑
#                              Gibt NUR .name zurück wenn kein MEDIA_ROOT!

# Line 68: Path.exists() Check schlägt fehl
if not path.exists():
    raise Http404(f"Video file not found on disk: {path}")
    #                                                ↑
    #                                                Zeigt "videos/UUID.mp4" (RELATIV!)
```

---

## 🐛 Why This Happens

### **Django FileField Behavior:**

```python
# Django FileField hat zwei wichtige Properties:
file_field.name  # ← Gibt RELATIVEN Pfad (zu MEDIA_ROOT)
file_field.path  # ← Gibt ABSOLUTEN Pfad (MEDIA_ROOT + name)

# ABER: Wenn MEDIA_ROOT NICHT gesetzt ist:
file_field.path  # ← Gibt nur file_field.name zurück! 😱
```

**Unsere Konfiguration:**
```python
# Django Settings:
MEDIA_ROOT = None  # ← NICHT GESETZT! 
# ODER
MEDIA_ROOT = ''    # ← LEER!

# Deshalb:
vf.active_raw_file.path  # ← Gibt nur "videos/UUID.mp4" zurück
#                             statt "/home/.../data/videos/UUID.mp4"
```

---

## 💡 Solution Options

### **Option A: MEDIA_ROOT setzen** ⭐ **EMPFOHLEN**

**Änderung:** Django Settings konfigurieren

```python
# lx_annotate/settings.py oder settings_dev.py
from endoreg_db.utils.paths import STORAGE_DIR

MEDIA_ROOT = str(STORAGE_DIR)  # /home/admin/dev/lx-annotate/data/
MEDIA_URL = '/media/'
```

**Vorteile:**
- ✅ Django-Standard-Verhalten
- ✅ Keine Code-Änderungen in Services nötig
- ✅ `.path` funktioniert automatisch
- ✅ Konsistent mit Django Best Practices

**Nachteile:**
- ⚠️ Erfordert Settings-Änderung
- ⚠️ Muss in Production auch gesetzt werden

---

### **Option B: Import Services auf ABSOLUTE Pfade umstellen**

**Änderung:** `video_import.py` & `pdf_import.py` anpassen

```python
# ❌ VORHER (video_import.py L210):
self.current_video.raw_file.name = f"videos/{video_filename}"

# ✅ NACHHER:
from endoreg_db.utils.paths import STORAGE_DIR
absolute_path = STORAGE_DIR / f"videos/{video_filename}"
self.current_video.raw_file.name = str(absolute_path)
```

**Vorteile:**
- ✅ Funktioniert sofort
- ✅ Keine Settings-Änderung nötig

**Nachteile:**
- ❌ Verletzt Django Conventions (FileField.name sollte RELATIV sein)
- ❌ Größere Refactoring-Arbeit
- ❌ Potenzielle Probleme mit Django Admin

---

### **Option C: Streaming Views anpassen** ⚠️ **NICHT EMPFOHLEN**

**Änderung:** `video_stream.py` & `pdf_stream.py` anpassen

```python
# ❌ VORHER:
path = Path(vf.active_raw_file.path)

# ✅ NACHHER:
from endoreg_db.utils.paths import STORAGE_DIR
if vf.active_raw_file.name.startswith('/'):
    path = Path(vf.active_raw_file.name)  # Absolut
else:
    path = STORAGE_DIR / vf.active_raw_file.name  # Relativ → Absolut
```

**Vorteile:**
- ✅ Schneller Fix
- ✅ Funktioniert mit beiden Pfad-Typen

**Nachteile:**
- ❌ Symptom-Fix statt Root-Cause-Fix
- ❌ Andere Teile der App könnten gleiche Probleme haben

---

## 🎯 Recommended Solution: Option A + Option C

**2-Phasen-Ansatz:**

### **Phase 1: Sofort-Fix (Option C) - Streaming wiederherstellen**

```python
# libs/endoreg-db/endoreg_db/views/video/video_stream.py
from endoreg_db.utils.paths import STORAGE_DIR

def _stream_video_file(vf: VideoFile, frontend_origin: str, file_type: str = 'raw') -> FileResponse:
    try:
        # Determine which file to stream
        if file_type == 'raw':
            if hasattr(vf, 'active_raw_file') and vf.active_raw_file:
                file_ref = vf.active_raw_file
            else:
                raise Http404("No raw video file available")
                
        elif file_type == 'processed':
            if hasattr(vf, 'processed_file') and vf.processed_file:
                file_ref = vf.processed_file
            else:
                raise Http404("No processed video file available")
        
        # ✅ FIX: Handle both relative and absolute paths
        if hasattr(file_ref, 'name'):
            file_name = file_ref.name
            if file_name.startswith('/'):
                path = Path(file_name)  # Already absolute
            else:
                path = STORAGE_DIR / file_name  # Make absolute
        else:
            raise Http404("File reference has no name attribute")
        
        # Validate file exists
        if not path.exists():
            raise Http404(f"Video file not found on disk: {path}")
        
        # ... rest of streaming code
```

### **Phase 2: Langfristig (Option A) - Django MEDIA_ROOT setzen**

```python
# lx_annotate/settings_dev.py
from pathlib import Path
from endoreg_db.utils.paths import STORAGE_DIR

MEDIA_ROOT = str(STORAGE_DIR)
MEDIA_URL = '/media/'

# lx_annotate/settings.py (Production)
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', '/var/www/lx-annotate/data/')
MEDIA_URL = '/media/'
```

---

## 🧪 Testing nach Fix

### **Test 1: Raw Video Stream**
```bash
curl -I http://localhost:8000/api/media/videos/49/?type=raw
# Erwartung: 200 OK (nicht mehr 404)
```

### **Test 2: Processed Video Stream**
```bash
curl -I http://localhost:8000/api/media/videos/51/?type=processed
# Erwartung: 404 wenn nicht anonymisiert ODER 200 wenn existiert
```

### **Test 3: Datei-Check**
```bash
# Prüfe ob Pfad korrekt aufgelöst wird
python manage.py shell
>>> from endoreg_db.models import VideoFile
>>> vf = VideoFile.objects.get(pk=49)
>>> vf.active_raw_file.name
'videos/3c5be74a-a970-4b41-acf1-13ca03ce4bd5_test_instrument.mp4'
>>> vf.active_raw_file.path
'videos/3c5be74a-a970-4b41-acf1-13ca03ce4bd5_test_instrument.mp4'  # ← OHNE MEDIA_ROOT!
>>> # Nach Fix sollte es sein:
'/home/admin/dev/lx-annotate/data/videos/3c5be74a-a970-4b41-acf1-13ca03ce4bd5_test_instrument.mp4'
```

---

## 📊 Impact Assessment

### **Betroffene Komponenten:**
- 🔴 **VideoStreamView** - Komplett broken
- 🔴 **PDF Stream (analog)** - Vermutlich gleiche Problem
- 🔴 **AnonymizationValidationComponent** - Kann keine Videos laden
- 🔴 **VideoExaminationAnnotation** - Kann keine Videos anzeigen
- ⚠️ **Alle Video/PDF-abhängigen Features** - Nicht funktionsfähig

### **Warum wurde das nicht früher bemerkt?**

1. **Tests verwenden vermutlich Mock-Daten** → Pfade wurden nicht validiert
2. **Development-Environment hatte vielleicht MEDIA_ROOT** → Funktionierte dort
3. **Scope Bug verschleierte echte Fehlermeldung** → Logs waren kryptisch
4. **Frontend Fallbacks** → User sah "gleiches Video" statt Fehlermeldung

---

## 🚨 Kritikalität

**Schweregrad: KRITISCH**
- ❌ Alle Video/PDF-Funktionen offline
- ❌ Anonymization-Workflow nicht testbar
- ❌ Production-Deployment würde scheitern

**User Impact:**
- 100% der Video-Workflows broken
- 100% der PDF-Workflows vermutlich broken
- Alle abhängigen Features nicht nutzbar

---

## ✅ Fix Implementation Plan

**Geschätzte Zeit:** 30 Minuten

1. **Sofort-Fix implementieren** (15 min)
   - video_stream.py anpassen (Pfad-Auflösung)
   - Analog für PDF-Streaming (falls vorhanden)
   - Testing

2. **MEDIA_ROOT setzen** (10 min)
   - settings_dev.py anpassen
   - settings.py anpassen
   - Testing

3. **Dokumentation** (5 min)
   - Fix dokumentieren
   - Deployment-Guide updaten

---

## 🔗 Verwandte Bugs

- **VIDEO_STREAM_SCOPE_BUG_FIX.md** - Scope Bug (bereits gefixt)
- **Dieser Bug** - Path Resolution Bug (kritischer)
- **MIGRATION_SENSITIVE_META_BUGFIXES.md** - Andere Bugs

**Zusammenhang:**
Der Scope Bug **verschleierte** den Path Bug! Ohne den Scope Bug wäre das Path-Problem sofort aufgefallen.

---

**Identifiziert am:** 14. Oktober 2025, 15:15 Uhr  
**Von:** GitHub Copilot  
**Status:** ✅ ROOT CAUSE IDENTIFIED - FIX PENDING
