# Video Correction API - Available Functions Analysis

# Video Correc---

## Übersicht

### Schnellreferenz: Funktion → Endpoint Mapping

| Backend Endpoint | Benötigte Funktion | Datei | Status |
|------------------|-------------------|-------|--------|
| POST /api/video-analyze/{id}/ | `FrameCleaner.analyze_video_sensitivity()` | frame_cleaner.py:1996 | ✅ Vorhanden |
| GET /api/video-metadata/{id}/ | `VideoMetadata` Model queries | **NEU** | ❌ Erstellen |
| POST /api/video-apply-mask/{id}/ (device) | `FrameCleaner._load_mask()` + `._mask_video()` | frame_cleaner.py:1418, 1450 | ✅ Vorhanden |
| POST /api/video-apply-mask/{id}/ (custom) | `FrameCleaner._create_mask_config_from_roi()` | frame_cleaner.py:1583 | ✅ Vorhanden |
| POST /api/video-remove-frames/{id}/ | `FrameCleaner.remove_frames_from_video()` | frame_cleaner.py:1333 | ✅ Vorhanden |
| GET /api/video-processing-history/{id}/ | `VideoProcessingHistory` Model queries | **NEU** | ❌ Erstellen |
| GET /api/task-status/{task_id}/ | Celery result backend queries | Celery | ⚠️ Setup nötig |

**Legende:**
- ✅ Vorhanden = Funktion ist implementiert und kann direkt genutzt werden
- ❌ Erstellen = Neues Django Model oder View muss erstellt werden
- ⚠️ Setup nötig = Infrastruktur (Celery, Redis) muss konfiguriert werden

---

Diese Dokumentation analysiert die vorhandenen Funktionen in `frame_cleaner.py` und `video_import.py`, um die verfügbaren Funktionen für die Implementierung des **AnonymizationCorrectionComponent** Backend zu identifizieren.

---I - Available Functions Analysis

## Executive Summary

Diese Dokumentation analysiert vorhandene Funktionen in `lx_anonymizer/frame_cleaner.py` und `endoreg_db/services/video_import.py` für die Implementierung des **AnonymizationCorrectionComponent** Backends.

### 🎯 Haupterkenntnisse

**✅ Gute Nachricht:** Die meisten benötigten Video-Processing-Funktionen sind **bereits implementiert** in der `lx_anonymizer` Library:

| Feature | Status | Funktion |
|---------|--------|----------|
| Video Masking (FFmpeg) | ✅ Fertig | `FrameCleaner._mask_video()` |
| Frame Removal (FFmpeg) | ✅ Fertig | `FrameCleaner.remove_frames_from_video()` |
| Sensitive Frame Detection | ✅ Fertig | `FrameCleaner.analyze_video_sensitivity()` |
| Device Masks (Olympus, etc.) | ✅ Fertig | `FrameCleaner._load_mask()` |
| Custom ROI Masking | ✅ Fertig | `FrameCleaner._create_mask_config_from_roi()` |
| MiniCPM-o 2.6 OCR | ✅ Fertig | Automatisch in `FrameCleaner.__init__()` |
| NVENC Hardware Accel | ✅ Fertig | `FrameCleaner._detect_nvenc_support()` |
| Processor ROI Extraction | ✅ Fertig | `VideoImportService._get_processor_roi_info()` |

**❌ Fehlende Komponenten (zu erstellen):**
- Django Models: `VideoMetadata`, `VideoProcessingHistory`
- API Views: 6 Endpoints (`VideoAnalyzeView`, `VideoApplyMaskView`, etc.)
- Celery Tasks: 4 Background Tasks für long-running Operations
- Utility Functions: `parse_frame_ranges()`, `update_segments_after_frame_removal()`

### 📊 Aufwandsschätzung

| Phase | Aufwand | Beschreibung |
|-------|---------|--------------|
| Models + Migrations | 1 Tag | VideoMetadata, VideoProcessingHistory |
| Celery Tasks | 3 Tage | analyze_video_task, apply_mask_task, remove_frames_task |
| API Endpoints | 2 Tage | 6 Views + Serializers |
| Utility Functions | 1 Tag | Frame parsing, Segment updates |
| **GESAMT** | **~7 Tage** | (reduziert von 15-20 Tagen dank vorhandener Funktionen) |

### 🔧 Verwendung der vorhandenen Funktionen

**Beispiel: Video Masking mit Device-Default**
```python
from lx_anonymizer import FrameCleaner

frame_cleaner = FrameCleaner()
mask_config = frame_cleaner._load_mask("olympus_cv_1500")

success = frame_cleaner._mask_video(
    input_video=Path("/data/videos/raw_video.mp4"),
    mask_config=mask_config,
    output_video=Path("/data/anonym_videos/masked_video.mp4")
)
# → Nutzt FFmpeg mit NVENC (falls verfügbar), sonst CPU
```

**Beispiel: Automatische Sensitive Frame Detection**
```python
frame_cleaner = FrameCleaner(use_minicpm=True)  # MiniCPM-o 2.6 aktivieren

analysis = frame_cleaner.analyze_video_sensitivity()
# → Returns: {
#   'sensitive_frame_count': 120,
#   'sensitive_ratio': 0.08,
#   'sensitive_frame_ids': [10, 15, 20, ...],
#   'metadata_extracted': {...}
# }
```

---

## Übersicht

Diese Dokumentation analysiert die vorhandenen Funktionen in `frame_cleaner.py` und `video_import.py`, die für die Implementierung des **AnonymizationCorrectionComponent** Backend verwendet werden können.

---

## 1. FrameCleaner Klasse (`lx_anonymizer/frame_cleaner.py`)

### 1.1 Haupt-Anonymisierungs-Funktion

#### `clean_video()` - Zentrale Video-Bearbeitung
**Zeilen:** 1009-1167  
**Verwendung:** ✅ **KANN DIREKT GENUTZT WERDEN**

```python
def clean_video(
    self,
    video_path: Path,
    video_file_obj=None,  # VideoFile Datenbank-Objekt
    tmp_dir: Optional[Path] = None,
    device_name: Optional[str] = None,  # z.B. "olympus_cv_1500"
    endoscope_roi: Optional[Dict[str, Any]] = None,
    processor_rois: Optional[Dict[str, Dict[str, Any]]] = None,
    output_path: Optional[Path] = None,
    technique: str = "mask_overlay",
) -> tuple[Path, Dict[str, Any]]:
```

**Rückgabe:**
- `Path`: Pfad zum bereinigten Video
- `Dict[str, Any]`: Extrahierte Metadaten (patient_first_name, patient_last_name, DOB, etc.)

**Funktionen:**
1. **Adaptive Frame-Sampling** (max 500 frames bei langen Videos)
2. **Sensitive Frame Detection** via:
   - MiniCPM-o 2.6 (wenn verfügbar)
   - FrameOCR + LLM (Fallback)
3. **Metadata Extraction** aus erkannten Frames
4. **Video Masking** mit Geräte-spezifischen Masken
5. **Hardware Acceleration** (NVENC wenn verfügbar)

**Integration für Correction API:**
```python
# POST /api/video-apply-mask/{id}/
frame_cleaner = FrameCleaner(use_minicpm=True)
cleaned_path, metadata = frame_cleaner.clean_video(
    video_path=video.raw_file.path,
    video_file_obj=video,
    device_name="olympus_cv_1500",  # oder aus Frontend
    endoscope_roi=processor.get_roi_endoscope_image(),
    technique="mask_overlay"
)
# Speichere cleaned_path als video.anonymized_file
```

---

### 1.2 Frame-Entfernungs-Funktionen

#### `remove_frames_from_video()` - Frame-basierte Re-Encodierung
**Zeilen:** 1333-1417  
**Verwendung:** ✅ **KANN DIREKT GENUTZT WERDEN**

```python
def remove_frames_from_video(
    self,
    original_video: Path, 
    frames_to_remove: List[int],  # 0-basierte Frame-Nummern
    output_video: Path,
    total_frames: Optional[int] = None
) -> bool:
```

**Features:**
- FFmpeg `select` Filter für präzise Frame-Entfernung
- Automatische Audio-Synchronisation
- NVENC Hardware-Beschleunigung
- CPU-Fallback bei Fehlern

**Integration für Correction API:**
```python
# POST /api/video-remove-frames/{id}/
frame_cleaner = FrameCleaner()

# Parse manuell eingegebene Frame-Liste (Frontend: "10-20,30,45-50")
frames_to_remove = parse_frame_ranges(request.data['frame_ranges'])

success = frame_cleaner.remove_frames_from_video(
    original_video=video.raw_file.path,
    frames_to_remove=frames_to_remove,
    output_video=output_path,
    total_frames=video.total_frames
)

if success:
    # Update video.anonymized_file
    # Update LabelVideoSegments (shift frame numbers)
```

**Frame Parser Beispiel:**
```python
def parse_frame_ranges(ranges_str: str) -> List[int]:
    """Konvertiert '10-20,30,45-50' zu [10,11,...,20,30,45,...,50]"""
    frames = []
    for part in ranges_str.split(','):
        if '-' in part:
            start, end = map(int, part.split('-'))
            frames.extend(range(start, end + 1))
        else:
            frames.append(int(part))
    return sorted(set(frames))  # Duplikate entfernen
```

---

#### `remove_frames_from_video_streaming()` - Streaming-basierte Variante
**Zeilen:** 683-780  
**Verwendung:** ⚠️ **FÜR GROßE VIDEOS** (optional)

Identisch zu `remove_frames_from_video()`, aber nutzt Named Pipes (FIFO) für In-Memory-Streaming. Reduziert Disk I/O bei großen Videos.

---

### 1.3 Masking-Funktionen

#### `_mask_video()` - Video-Maskierung mit FFmpeg
**Zeilen:** 1450-1541  
**Verwendung:** ✅ **INTERN VON `clean_video()` GENUTZT**

```python
def _mask_video(
    self, 
    input_video: Path, 
    mask_config: Dict[str, Any], 
    output_video: Path
) -> bool:
```

**Mask Config Format:**
```json
{
  "image_width": 1920,
  "image_height": 1080,
  "endoscope_image_x": 550,
  "endoscope_image_y": 0,
  "endoscope_image_width": 1350,
  "endoscope_image_height": 1080,
  "description": "Olympus CV-1500 mask"
}
```

**Zwei Masking-Modi:**
1. **Simple Crop** (bei vertikalen Streifen):
   ```bash
   ffmpeg -vf "crop=in_w-550:in_h:550:0"
   ```

2. **Complex Drawbox** (bei komplexen ROIs):
   ```bash
   ffmpeg -vf "drawbox=0:0:550:1080:color=black@1:t=fill,..."
   ```

**Integration für Custom ROI Masking:**
```python
# POST /api/video-apply-mask/{id}/ (Custom ROI)
custom_roi = {
    "x": request.data['roi_x'],
    "y": request.data['roi_y'],
    "width": request.data['roi_width'],
    "height": request.data['roi_height']
}

mask_config = frame_cleaner._create_mask_config_from_roi(
    endoscope_roi=custom_roi,
    processor_rois=None
)

success = frame_cleaner._mask_video(
    input_video=video.raw_file.path,
    mask_config=mask_config,
    output_video=output_path
)
```

---

#### `_load_mask()` - Geräte-spezifische Masken laden
**Zeilen:** 1418-1449  
**Verwendung:** ✅ **FÜR DEVICE-DEFAULT MASKING**

```python
def _load_mask(self, device_name: str) -> Dict[str, Any]:
    """
    Lädt Mask-Konfiguration aus libs/lx-anonymizer/lx_anonymizer/masks/{device_name}_mask.json
    Erstellt Fallback-Konfiguration wenn nicht vorhanden
    """
```

**Verfügbare Geräte-Masken:**
```bash
libs/lx-anonymizer/lx_anonymizer/masks/
├── olympus_cv_1500_mask.json
├── pentax_ept_7000_mask.json
└── fujifilm_4450hd_mask.json
```

**Integration für Device Selection:**
```python
# POST /api/video-apply-mask/{id}/ (Device-default)
device_name = request.data['device_name']  # z.B. "olympus_cv_1500"

mask_config = frame_cleaner._load_mask(device_name)

success = frame_cleaner._mask_video(
    input_video=video.raw_file.path,
    mask_config=mask_config,
    output_video=output_path
)
```

---

#### `_create_mask_config_from_roi()` - ROI zu Mask Config Konverter
**Zeilen:** 1583-1640  
**Verwendung:** ✅ **FÜR CUSTOM ROI MASKING**

```python
def _create_mask_config_from_roi(
    self, 
    endoscope_roi: Dict[str, Any],  # {'x': 550, 'y': 0, 'width': 1350, 'height': 1080}
    processor_rois: Optional[Dict[str, Dict[str, Any]]] = None
) -> Dict[str, Any]:
```

**Intelligente Features:**
- Auto-Detection von Videogröße (1920x1080 default)
- Margin-Berechnung falls ROI größer als erwartete Video-Dimensionen
- Konvertiert Processor ROI Format zu Mask Config Format

---

### 1.4 Sensitive Frame Detection

#### `detect_sensitive_on_frame()` - Einzelframe-Analyse
**Zeilen:** 1216-1275  
**Verwendung:** ⚠️ **VERALTET** (nutze `_process_frame()` stattdessen)

#### `_process_frame()` - Moderne Frame-Analyse
**Zeilen:** 699-800 (geschätzt, basierend auf `clean_video()` Aufruf)  
**Verwendung:** ✅ **INTERN VON `clean_video()` GENUTZT**

```python
def _process_frame(
    self,
    gray_frame: np.ndarray,
    endoscope_roi: dict | None,
    frame_id: int | None = None,
) -> tuple[bool, dict, str, float]:
    """
    Returns: (is_sensitive, metadata_dict, ocr_text, confidence)
    """
```

**Erkennungs-Pipeline:**
1. MiniCPM-o 2.6 (wenn verfügbar) → Bounding Boxes für sensitive Bereiche
2. Fallback: FrameOCR (Tesseract) + ROI-basierte Filterung
3. LLM-Metadaten-Extraktion (bei sensitiven Frames)
4. TrOCR (höhere Qualität) für Stichproben

---

#### `analyze_video_sensitivity()` - Video-weite Statistiken
**Zeilen:** 1996+ (vermutlich)  
**Verwendung:** ✅ **FÜR `/api/video-analyze/{id}/`**

```python
def analyze_video_sensitivity(self) -> Dict[str, Any]:
    """
    Analysiert Video und gibt sensitive Frame-Statistiken zurück
    """
```

**Erwartete Rückgabe:**
```json
{
  "sensitive_frame_count": 120,
  "total_frames": 1500,
  "sensitive_ratio": 0.08,
  "sensitive_frame_ids": [10, 15, 20, ...],
  "metadata_extracted": {
    "patient_first_name": "Max",
    "patient_dob": "1985-03-15",
    ...
  }
}
```

**Integration für Analyze Endpoint:**
```python
# POST /api/video-analyze/{id}/
frame_cleaner = FrameCleaner(use_minicpm=True)

# Führe Analyse durch (dauert 30s - 2min bei 1080p Videos)
analysis_result = frame_cleaner.analyze_video_sensitivity()

# Speichere Ergebnis in VideoMetadata Modell
VideoMetadata.objects.create(
    video=video,
    sensitive_frame_count=analysis_result['sensitive_frame_count'],
    sensitive_ratio=analysis_result['sensitive_ratio'],
    sensitive_frame_ids=json.dumps(analysis_result['sensitive_frame_ids'])
)
```

---

### 1.5 Hardware Acceleration

#### `_detect_nvenc_support()` - NVENC Availability Check
**Zeilen:** 134-154  
**Verwendung:** ✅ **AUTOMATISCH BEI INIT**

```python
def _detect_nvenc_support(self) -> bool:
    """Testet ob NVIDIA NVENC verfügbar ist"""
```

**Integration:**
```python
frame_cleaner = FrameCleaner()
if frame_cleaner.nvenc_available:
    logger.info("Using GPU acceleration for video processing")
else:
    logger.info("Using CPU encoding (slower)")
```

---

#### `_build_encoder_cmd()` - Encoder Config Generator
**Zeilen:** 178-220 (geschätzt)  
**Verwendung:** ✅ **INTERN GENUTZT**

```python
def _build_encoder_cmd(
    self, 
    quality_mode: str = 'balanced',  # 'fast', 'balanced', 'quality'
    fallback: bool = False
) -> List[str]:
```

**Encoder-Modi:**
- **NVENC (GPU):** `h264_nvenc -preset p4 -cq 28`
- **CPU Fallback:** `libx264 -preset medium -crf 23`

---

## 2. VideoImportService Klasse (`endoreg_db/services/video_import.py`)

### 2.1 ROI Management

#### `_get_processor_roi_info()` - Processor ROI abrufen
**Zeilen:** 682-715  
**Verwendung:** ✅ **FÜR DEVICE-BASED MASKING**

```python
def _get_processor_roi_info(self):
    """
    Holt alle ROIs vom Processor-Objekt des Videos
    """
    processor_roi, endoscope_roi = service._get_processor_roi_info()
```

**Rückgabe:**
```python
processor_roi = {
    'endoscope_image': {'x': 550, 'y': 0, 'width': 1350, 'height': 1080},
    'patient_first_name': {'x': 10, 'y': 10, 'width': 200, 'height': 30},
    'patient_last_name': {...},
    'patient_dob': {...},
    'examination_date': {...},
    'examination_time': {...},
    'endoscope_type': {...},
    'endoscopy_sn': {...}
}
endoscope_roi = {'x': 550, 'y': 0, 'width': 1350, 'height': 1080}
```

**Integration für Correction API:**
```python
# GET /api/video-metadata/{id}/
service = VideoImportService()
service.current_video = video

processor_roi, endoscope_roi = service._get_processor_roi_info()

return {
    'device_name': video.video_meta.processor.name,
    'available_rois': processor_roi,
    'endoscope_roi': endoscope_roi
}
```

---

#### `_perform_frame_cleaning()` - Komplette Cleaning Pipeline
**Zeilen:** 716-780  
**Verwendung:** ⚠️ **KOMPLETT-LÖSUNG** (für vollautomatische Anonymisierung)

```python
def _perform_frame_cleaning(self, FrameCleaner, processor_roi, endoscope_roi):
    """
    Führt clean_video() aus + Metadata-Enrichment + LLM-Extraktion
    """
```

**Features:**
1. Ruft `FrameCleaner.clean_video()` mit allen ROIs
2. Zusätzliche TrOCR + LLM Metadaten-Extraktion (random frame)
3. Merge von Frame-Level + LLM Metadaten
4. Update von `SensitiveMeta` Modell

**Hinweis:** Zu hochwertig für manuelle Correction (nutzt automatische Erkennung). Besser direkt `FrameCleaner.clean_video()` nutzen.

---

### 2.2 Metadata Update

#### `_update_sensitive_metadata()` - Sichere Metadata-Aktualisierung
**Zeilen:** 780-850 (geschätzt)  
**Verwendung:** ✅ **FÜR POST-PROCESSING**

```python
def _update_sensitive_metadata(self, extracted_metadata):
    """
    Aktualisiert nur LEERE Felder in SensitiveMeta (Safety Mechanism)
    Verhindert Überschreiben von manuell eingegebenen Daten
    """
```

**Safety Features:**
- Nur leere/default Werte werden überschrieben
- Manuelle Eingaben bleiben erhalten
- Logging aller Updates

---

## 3. Empfohlene API Endpoint Implementierungen

### 3.1 POST /api/video-analyze/{id}/

**Zweck:** Analyse sensitive Frames ohne Modifikation

```python
from lx_anonymizer import FrameCleaner
from endoreg_db.tasks import analyze_video_task  # Celery Task

class VideoAnalyzeView(APIView):
    def post(self, request, id):
        video = VideoFile.objects.get(pk=id)
        
        # Start Celery task (long-running)
        task = analyze_video_task.delay(video.id)
        
        return Response({
            'task_id': task.id,
            'status': 'started'
        })

# Celery Task
@shared_task
def analyze_video_task(video_id):
    video = VideoFile.objects.get(pk=video_id)
    
    frame_cleaner = FrameCleaner(use_minicpm=True)
    analysis = frame_cleaner.analyze_video_sensitivity()
    
    # Speichere in VideoMetadata
    VideoMetadata.objects.update_or_create(
        video=video,
        defaults={
            'sensitive_frame_count': analysis['sensitive_frame_count'],
            'sensitive_ratio': analysis['sensitive_ratio'],
            'sensitive_frame_ids': json.dumps(analysis['sensitive_frame_ids'])
        }
    )
    
    return analysis
```

---

### 3.2 POST /api/video-apply-mask/{id}/

**Zweck:** Masking mit Device-Default oder Custom ROI

```python
from lx_anonymizer import FrameCleaner

class VideoApplyMaskView(APIView):
    def post(self, request, id):
        video = VideoFile.objects.get(pk=id)
        
        mask_type = request.data.get('mask_type')  # 'device-default', 'custom-roi'
        
        # Start Celery task
        if mask_type == 'device-default':
            device_name = request.data['device_name']
            task = apply_device_mask_task.delay(video.id, device_name)
        else:
            roi = {
                'x': request.data['roi_x'],
                'y': request.data['roi_y'],
                'width': request.data['roi_width'],
                'height': request.data['roi_height']
            }
            task = apply_custom_mask_task.delay(video.id, roi)
        
        return Response({'task_id': task.id})

@shared_task
def apply_device_mask_task(video_id, device_name):
    video = VideoFile.objects.get(pk=video_id)
    frame_cleaner = FrameCleaner()
    
    mask_config = frame_cleaner._load_mask(device_name)
    
    output_path = Path(settings.MEDIA_ROOT) / 'anonym_videos' / f"{video.video_hash}_masked.mp4"
    
    success = frame_cleaner._mask_video(
        input_video=video.raw_file.path,
        mask_config=mask_config,
        output_video=output_path
    )
    
    if success:
        video.anonymized_file = f"anonym_videos/{video.video_hash}_masked.mp4"
        video.save()
        
        # Speichere in VideoProcessingHistory
        VideoProcessingHistory.objects.create(
            video=video,
            operation='mask_overlay',
            config={'device_name': device_name, 'mask_config': mask_config},
            output_file=str(output_path),
            status='completed'
        )
    
    return {'success': success, 'output_path': str(output_path)}
```

---

### 3.3 POST /api/video-remove-frames/{id}/

**Zweck:** Frame-Entfernung (manuell oder automatisch)

```python
from lx_anonymizer import FrameCleaner

class VideoRemoveFramesView(APIView):
    def post(self, request, id):
        video = VideoFile.objects.get(pk=id)
        
        mode = request.data.get('mode')  # 'manual', 'automatic'
        
        if mode == 'manual':
            # Parse "10-20,30,45-50"
            frames = parse_frame_ranges(request.data['frame_ranges'])
        else:
            # Lade aus vorheriger Analyse
            metadata = VideoMetadata.objects.get(video=video)
            frames = json.loads(metadata.sensitive_frame_ids)
        
        task = remove_frames_task.delay(video.id, frames)
        
        return Response({'task_id': task.id})

@shared_task
def remove_frames_task(video_id, frames_to_remove):
    video = VideoFile.objects.get(pk=video_id)
    frame_cleaner = FrameCleaner()
    
    output_path = Path(settings.MEDIA_ROOT) / 'anonym_videos' / f"{video.video_hash}_cleaned.mp4"
    
    success = frame_cleaner.remove_frames_from_video(
        original_video=video.raw_file.path,
        frames_to_remove=frames_to_remove,
        output_video=output_path,
        total_frames=video.total_frames
    )
    
    if success:
        video.anonymized_file = f"anonym_videos/{video.video_hash}_cleaned.mp4"
        
        # Update frame_dir falls gesetzt
        if video.frame_dir:
            new_total = video.total_frames - len(frames_to_remove)
            video.frame_dir = new_total  # Oder entfernen falls nicht mehr gültig
        
        video.save()
        
        # Update LabelVideoSegments (shift frame numbers)
        update_segments_after_frame_removal(video, frames_to_remove)
        
        # Speichere in History
        VideoProcessingHistory.objects.create(
            video=video,
            operation='frame_removal',
            config={'frames_removed': frames_to_remove, 'count': len(frames_to_remove)},
            output_file=str(output_path),
            status='completed'
        )
    
    return {'success': success, 'output_path': str(output_path)}

def update_segments_after_frame_removal(video, removed_frames):
    """Shift frame numbers in LabelVideoSegments"""
    segments = LabelVideoSegment.objects.filter(video=video).order_by('start_frame')
    
    for segment in segments:
        # Count wie viele frames VOR diesem Segment entfernt wurden
        shift = sum(1 for f in removed_frames if f < segment.start_frame)
        
        segment.start_frame -= shift
        segment.end_frame -= shift
        segment.save()
```

---

### 3.4 GET /api/video-metadata/{id}/

**Zweck:** Video Metadata für Correction UI

```python
class VideoMetadataView(APIView):
    def get(self, request, id):
        video = VideoFile.objects.get(pk=id)
        
        # Versuche VideoMetadata zu laden
        try:
            metadata = VideoMetadata.objects.get(video=video)
            sensitive_count = metadata.sensitive_frame_count
            sensitive_ratio = metadata.sensitive_ratio
        except VideoMetadata.DoesNotExist:
            sensitive_count = None
            sensitive_ratio = None
        
        return Response({
            'video_id': video.id,
            'filename': video.raw_file.name,
            'total_frames': video.total_frames,
            'duration': video.duration,  # Falls vorhanden
            'resolution': f"{video.width}x{video.height}",  # Falls vorhanden
            'sensitive_frame_count': sensitive_count,
            'sensitive_ratio': sensitive_ratio,
            'has_analysis': metadata is not None if 'metadata' in locals() else False
        })
```

---

### 3.5 GET /api/video-processing-history/{id}/

**Zweck:** Historie aller Processing Operations

```python
class VideoProcessingHistoryView(APIView):
    def get(self, request, id):
        video = VideoFile.objects.get(pk=id)
        
        history = VideoProcessingHistory.objects.filter(video=video).order_by('-created_at')
        
        serializer = VideoProcessingHistorySerializer(history, many=True)
        
        return Response(serializer.data)

# Serializer
class VideoProcessingHistorySerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = VideoProcessingHistory
        fields = ['id', 'operation', 'config', 'status', 'created_at', 'download_url']
    
    def get_download_url(self, obj):
        if obj.output_file and Path(obj.output_file).exists():
            return f"/media/{obj.output_file}"
        return None
```

---

## 4. Fehlende Komponenten

### 4.1 VideoMetadata Model (NEU ERSTELLEN)

```python
# libs/endoreg-db/endoreg_db/models/video_metadata.py

class VideoMetadata(models.Model):
    """
    Speichert Analyse-Ergebnisse für Videos (sensitive frames, etc.)
    """
    video = models.OneToOneField(VideoFile, on_delete=models.CASCADE, related_name='metadata')
    
    # Analyse-Ergebnisse
    sensitive_frame_count = models.IntegerField(null=True, blank=True)
    sensitive_ratio = models.FloatField(null=True, blank=True)
    sensitive_frame_ids = models.TextField(null=True, blank=True)  # JSON array
    
    # Timestamps
    analyzed_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'video_metadata'
```

---

### 4.2 VideoProcessingHistory Model (NEU ERSTELLEN)

```python
# libs/endoreg-db/endoreg_db/models/video_processing.py

class VideoProcessingHistory(models.Model):
    """
    Historie aller Video Processing Operations (Masking, Frame Removal, etc.)
    """
    video = models.ForeignKey(VideoFile, on_delete=models.CASCADE, related_name='processing_history')
    
    # Operation Details
    operation = models.CharField(max_length=50)  # 'mask_overlay', 'frame_removal', 'reprocess'
    config = models.JSONField(default=dict)  # Mask config, frame list, etc.
    
    # Output
    output_file = models.CharField(max_length=500, null=True, blank=True)
    status = models.CharField(max_length=20, default='pending')  # 'pending', 'completed', 'failed'
    
    # Celery Task
    task_id = models.CharField(max_length=100, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'video_processing_history'
        ordering = ['-created_at']
```

---

## 5. Zusammenfassung

### ✅ Direkt nutzbare Funktionen

| Funktion | Verwendung | Endpoint |
|----------|-----------|----------|
| `FrameCleaner.clean_video()` | Vollständige Anonymisierung | POST /api/video-apply-mask/ |
| `FrameCleaner.remove_frames_from_video()` | Frame-Entfernung | POST /api/video-remove-frames/ |
| `FrameCleaner._mask_video()` | Nur Masking (ohne Analyse) | POST /api/video-apply-mask/ |
| `FrameCleaner._load_mask()` | Device Masks laden | GET /api/devices/masks/ |
| `FrameCleaner._create_mask_config_from_roi()` | Custom ROI → Mask Config | POST /api/video-apply-mask/ |
| `FrameCleaner.analyze_video_sensitivity()` | Sensitive Frame Detection | POST /api/video-analyze/ |
| `VideoImportService._get_processor_roi_info()` | ROI von Processor laden | GET /api/video-metadata/ |

---

### ⚠️ Zu erstellende Komponenten

1. **Models:**
   - `VideoMetadata` (Analyse-Ergebnisse)
   - `VideoProcessingHistory` (Operations-Historie)

2. **Celery Tasks:**
   - `analyze_video_task`
   - `apply_device_mask_task`
   - `apply_custom_mask_task`
   - `remove_frames_task`

3. **API Views:**
   - `VideoAnalyzeView`
   - `VideoApplyMaskView`
   - `VideoRemoveFramesView`
   - `VideoMetadataView`
   - `VideoProcessingHistoryView`
   - `TaskStatusView` (Celery progress tracking)

4. **Utilities:**
   - `parse_frame_ranges()` (String → List[int])
   - `update_segments_after_frame_removal()` (Segment frame shifts)

---

## 6. Implementierungs-Prioritäten

### Phase 1: Basis-Infrastruktur (3-5 Tage)
1. Erstelle Models (`VideoMetadata`, `VideoProcessingHistory`)
2. Migrationen erstellen und ausführen
3. Serializers erstellen

### Phase 2: Celery Tasks (5-7 Tage)
1. Setup Celery + Redis in Docker Compose
2. Implementiere `analyze_video_task`
3. Implementiere `apply_mask_task` (device + custom)
4. Implementiere `remove_frames_task`
5. Progress Reporting implementieren

### Phase 3: API Endpoints (4-6 Tage)
1. `VideoAnalyzeView`
2. `VideoApplyMaskView`
3. `VideoRemoveFramesView`
4. `VideoMetadataView`
5. `VideoProcessingHistoryView`
6. `TaskStatusView`

### Phase 4: Testing (3-4 Tage)
1. Unit Tests für alle Tasks
2. Integration Tests für API Endpoints
3. End-to-End Tests mit echten Videos

---

**Gesamtaufwand:** ~15-22 Tage (entspricht Phase 1 im Implementierungsplan)
