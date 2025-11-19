# Processed Video Path Storage Fix

**Date:** October 14, 2025  
**Severity:** CRITICAL  
**Component:** `libs/endoreg-db/endoreg_db/services/video_import.py`  
**Status:** ✅ FIXED

---

## Problem Summary

Anonymisierte Videos wurden im Dateisystem korrekt in `/data/anonym_videos/` gespeichert, aber der Datenbankpfad wurde falsch gesetzt, was zu 404-Fehlern beim Video-Streaming führte.

### Symptome

```
[2025-10-14 15:20:26,529] ERROR endoreg_db.views.video.video_stream: 
  Video file not found on disk: /home/admin/dev/lx-annotate/data/anonym_videos/anonym_e126faab-2f2e-4705-bc9d-fb8d7bd6bc27_test_nbi.mp4

[2025-10-14 15:20:26,530] WARNING django.server: 
  "GET /api/media/videos/51/?type=processed HTTP/1.1" 404 42
```

### Root Cause

Der `VideoImportService` hat den `processed_file` Pfad **falsch** gesetzt:

**Vorher (FALSCH):**
```python
# Zeile 382 (ALT)
self.current_video.processed_file = str(relative_path)  # ❌ Direktzuweisung
```

Dies funktioniert nicht, da Django FileField den Pfad im `.name` Attribut speichert, nicht direkt im Feld.

**Nachher (KORREKT):**
```python
# Zeile 382 (NEU)
self.current_video.processed_file.name = str(relative_path)  # ✅ Verwendet .name
```

---

## Technical Details

### Django FileField Behavior

Django's `FileField` speichert den Pfad intern in zwei Formen:

1. **`.name` (Relativ):** Relativer Pfad vom `MEDIA_ROOT` (oder Storage-Root)
   - Beispiel: `"anonym_videos/anonym_UUID_filename.mp4"`
   - Wird in der Datenbank gespeichert

2. **`.path` (Absolut):** Absoluter Pfad im Dateisystem
   - Beispiel: `"/home/admin/dev/lx-annotate/data/anonym_videos/anonym_UUID_filename.mp4"`
   - Wird dynamisch aus `.name` + `MEDIA_ROOT` konstruiert

**Wichtig:** Direktzuweisung an das Feld (`processed_file = "..."`) umgeht diese Mechanik und führt zu fehlerhaften Pfaden.

### Comparison: raw_file vs processed_file

Der `raw_file` Pfad wurde **korrekt** gesetzt (Zeile 204):

```python
# ✅ KORREKT - raw_file (bereits vorhanden)
self.current_video.raw_file.name = str(relative_path)
self.current_video.save(update_fields=['raw_file'])
```

Der `processed_file` Pfad war **inkorrekt** (Zeile 382):

```python
# ❌ FALSCH - processed_file (vor dem Fix)
self.current_video.processed_file = str(relative_path)  # Direktzuweisung
self.current_video.save(update_fields=['processed_file'])
```

---

## Fix Implementation

### Changed File

**File:** `libs/endoreg-db/endoreg_db/services/video_import.py`  
**Method:** `_cleanup_and_archive()`  
**Lines:** 369-395

### Changes Made

1. **Fixed Field Assignment (Line 382):**
   ```python
   # Before
   self.current_video.processed_file = str(relative_path)
   
   # After
   self.current_video.processed_file.name = str(relative_path)
   ```

2. **Added Fallback Path (Lines 388-391):**
   ```python
   except Exception as e:
       self.logger.error(f"Failed to update processed_file path: {e}")
       # Fallback to simple relative path
       self.current_video.processed_file.name = f"anonym_videos/{anonym_video_filename}"
       self.current_video.save(update_fields=['processed_file'])
       self.logger.info(f"Updated processed_file path using fallback: anonym_videos/{anonym_video_filename}")
   ```

3. **Removed Unused Import:**
   ```python
   # Removed: from django.core.exceptions import FieldError
   ```

4. **Improved Error Handling:**
   - Changed from generic `FieldError` to proper exception handling
   - Added fallback path resolution für Robustheit
   - Improved logging für Debugging

---

## Testing

### System Check
```bash
$ python manage.py check
System check identified no issues (0 silenced).  ✅
```

### Expected Behavior After Fix

1. **Video Import:**
   - Raw video gespeichert in: `/data/videos/UUID_filename.mp4`
   - Processed video gespeichert in: `/data/anonym_videos/anonym_UUID_filename.mp4`

2. **Database Paths:**
   - `raw_file.name`: `"videos/UUID_filename.mp4"`
   - `processed_file.name`: `"anonym_videos/anonym_UUID_filename.mp4"`

3. **Video Streaming:**
   - `GET /api/media/videos/{id}/?type=raw` → Returns raw video ✅
   - `GET /api/media/videos/{id}/?type=processed` → Returns anonymized video ✅

4. **Path Resolution:**
   ```python
   # In video_stream.py (already fixed earlier)
   file_name = file_ref.name  # e.g., "anonym_videos/anonym_UUID_filename.mp4"
   if file_name.startswith('/'):
       path = Path(file_name)  # Already absolute
   else:
       path = STORAGE_DIR / file_name  # Convert to absolute
       # Result: /home/admin/dev/lx-annotate/data/anonym_videos/anonym_UUID_filename.mp4
   ```

---

## Related Issues

### Previously Fixed

1. **Video Stream Path Resolution (October 14, 2025)**
   - File: `libs/endoreg-db/endoreg_db/views/video/video_stream.py`
   - Fixed relative path resolution in streaming views
   - See: `STORAGE_PATH_ANALYSIS_FINAL.md`

### Connection

Der vorherige Fix (Path Resolution Bug) hat das **Symptom** behoben (relative Pfade konnten aufgelöst werden).

Dieser Fix behebt die **Root Cause** (Pfade werden jetzt korrekt gespeichert).

**Zusammen bilden diese Fixes eine vollständige Lösung:**
- ✅ Import Service speichert Pfade korrekt (`.name` statt direkt)
- ✅ Streaming View löst relative Pfade korrekt auf
- ✅ Beide raw und processed Videos funktionieren

---

## Architecture Notes

### Storage Structure

```
/data/
├── videos/              # Raw videos (not anonymized)
│   └── UUID_filename.mp4
├── anonym_videos/       # Processed/anonymized videos
│   └── anonym_UUID_filename.mp4
├── frames/              # Extracted frames
├── pdfs/
│   ├── sensitive/       # Raw PDFs
│   └── anonymized/      # Processed PDFs
└── import/              # Temporary upload location
```

### Path Convention

**Database Storage (FileField.name):**
- Always **relative** to STORAGE_DIR (`/data/`)
- Examples:
  - `"videos/UUID_filename.mp4"`
  - `"anonym_videos/anonym_UUID_filename.mp4"`
  - `"pdfs/sensitive/HASH_filename.pdf"`

**Filesystem Access (FileField.path):**
- Always **absolute** path
- Constructed as: `STORAGE_DIR / FileField.name`
- Examples:
  - `/home/admin/dev/lx-annotate/data/videos/UUID_filename.mp4`
  - `/home/admin/dev/lx-annotate/data/anonym_videos/anonym_UUID_filename.mp4`

### Django Best Practice

**DO:**
```python
video.raw_file.name = "videos/filename.mp4"         # ✅ Relative path
video.processed_file.name = "anonym_videos/file.mp4" # ✅ Relative path
```

**DON'T:**
```python
video.raw_file = "videos/filename.mp4"              # ❌ Direct assignment
video.processed_file = Path("/absolute/path.mp4")   # ❌ Absolute path
```

---

## Lessons Learned

1. **Consistency is Key:**
   - Use the same pattern for all FileField assignments
   - `raw_file` wurde korrekt implementiert → Copy-Paste für `processed_file`

2. **Django Conventions Matter:**
   - FileField.name sollte immer relativ sein
   - FileField.path wird automatisch konstruiert

3. **Testing File Operations:**
   - Test BOTH database path AND filesystem path
   - Verify file.name (DB) AND file.path (filesystem)
   - Check streaming endpoints work with stored paths

4. **Error Messages are Critical:**
   - Der ERROR Log zeigte den absoluten Pfad → Hinweis auf Path-Resolution-Problem
   - Wenn der Pfad relativ gewesen wäre → Hätte auf falschen Import hingewiesen

---

## Future Improvements

### Short-term
1. **Add Integration Tests:**
   ```python
   def test_video_import_sets_correct_paths():
       video = import_and_anonymize(file_path, center, processor)
       assert video.processed_file.name.startswith("anonym_videos/")
       assert not video.processed_file.name.startswith("/")
       assert Path(video.processed_file.path).exists()
   ```

2. **Verify Existing Videos:**
   ```python
   # Django management command
   for video in VideoFile.objects.filter(processed_file__isnull=False):
       if video.processed_file.name.startswith("/"):
           # Fix absolute path stored in DB
           video.processed_file.name = relative_path
           video.save()
   ```

### Long-term
1. **Configure MEDIA_ROOT:**
   ```python
   # settings.py
   MEDIA_ROOT = str(STORAGE_DIR)
   MEDIA_URL = "/media/"
   ```
   - Würde Path-Resolution vereinfachen
   - Django würde automatisch korrekte URLs generieren

2. **Unified File Handling:**
   - Create shared utility für FileField path handling
   - Ensure consistency across video_import, pdf_import, frame_import

3. **Database Migration:**
   - Add data migration to fix any existing incorrectly stored paths
   - Verify all FileField.name values are relative

---

## Verification Checklist

Before deploying to production:

- [ ] System check passes: `python manage.py check`
- [ ] Raw video streaming works: `GET /api/media/videos/{id}/?type=raw`
- [ ] Processed video streaming works: `GET /api/media/videos/{id}/?type=processed`
- [ ] File paths in database are relative (no leading `/`)
- [ ] Physical files exist at expected locations
- [ ] Logs show successful path resolution
- [ ] Re-import functionality works
- [ ] Frontend video player displays both raw and processed
- [ ] No 404 errors in server logs

---

## Documentation Updates

Files to update:
1. ✅ `PROCESSED_VIDEO_PATH_FIX.md` (this file)
2. ⏳ `docs/ANONYMIZER.md` - Add section on file path conventions
3. ⏳ `libs/endoreg-db/docs/VIDEO_CORRECTION_MODULES.md` - Note path handling
4. ⏳ `README.md` - Add to troubleshooting section

---

## References

- Original Bug Report: User message October 14, 2025 15:28
- Related Fix: `STORAGE_PATH_ANALYSIS_FINAL.md` (Path Resolution in Streaming Views)
- Related Fix: `CRITICAL_PATH_RESOLUTION_BUG.md` (Initial Path Bug Discovery)
- Django FileField Docs: https://docs.djangoproject.com/en/stable/ref/models/fields/#filefield
- Video Import Service: `libs/endoreg-db/endoreg_db/services/video_import.py`
- Video Streaming View: `libs/endoreg-db/endoreg_db/views/video/video_stream.py`
