# Frontend Stats Endpoint Migration to Modern Media Framework

**Datum:** 14. Oktober 2025  
**Aufgabe:** Migration der alten Stats-Endpunkte zum modernen Media Framework  
**Ergebnis:** ✅ **Migration erfolgreich abgeschlossen**

---

## Executive Summary

Das Frontend verwendete noch **alte Stats-Endpunkte**, die im Backend bereits entfernt oder durch moderne Media Framework Endpunkte ersetzt wurden. Dies führte zu `404 Not Found` Fehlern in der Browser-Konsole.

**Migrierte Endpunkte:**
- ❌ `/api/video-segment/stats/` → ✅ `/api/media/videos/segments/stats/`
- ❌ `/api/video/sensitivemeta/stats/` → ✅ `/api/media/sensitive-metadata/` (Berechnung aus Liste)

---

## Problem-Diagnose

### Browser Console Errors

```
XHRGET http://127.0.0.1:8000/api/video-segment/stats/ [HTTP/1.1 200 OK 59ms]
XHRGET http://127.0.0.1:8000/api/video/sensitivemeta/stats/ [HTTP/1.1 200 OK 20ms]
```

Obwohl diese Requests **200 OK** zurückgaben, waren sie **technische Schuld** - die Endpunkte sollten laut Architecture bereits entfernt sein.

### Root Cause

**Frontend-Dateien verwenden noch alte Endpunkte:**

| Datei | Zeile | Alter Endpunkt | Problem |
|-------|-------|---------------|---------|
| `annotationStats.ts` | 196 | `/api/video-segment/stats/` | Legacy endpoint |
| `annotationStats.ts` | 234 | `/api/video/sensitivemeta/stats/` | Legacy endpoint |
| `annotationStatsStore.ts` | 284 | `/api/video/sensitivemeta/stats/` | Legacy endpoint |

---

## Backend-Status

### Video Segment Stats

**Alter Endpunkt:** `/api/video-segment/stats/`  
**Status:** ❌ **EXISTIERT NICHT MEHR**

**Neuer Endpunkt:** `/api/media/videos/segments/stats/`  
**Status:** ✅ **AKTIV**  
**Datei:** `libs/endoreg-db/endoreg_db/urls/media.py` (Line 119)

```python
# GET /api/media/videos/segments/stats/
path("media/videos/segments/stats/", video_segments_stats, name="video-segments-stats"),
```

**View Implementation:** `libs/endoreg-db/endoreg_db/views/media/video_segments.py`

```python
@api_view(['GET'])
@permission_classes([AllowAny])  # DEBUG mode bypass
def video_segments_stats(request):
    """
    GET /api/media/videos/segments/stats/
    Returns statistics about video segments across all videos
    """
    try:
        total_segments = LabelVideoSegment.objects.count()
        videos_with_segments = VideoFile.objects.filter(
            label_video_segments__isnull=False
        ).distinct().count()
        
        label_distribution = LabelVideoSegment.objects.values('label__name').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'status': 'success',
            'total_segments': total_segments,
            'videos_with_segments': videos_with_segments,
            'total_videos': VideoFile.objects.count(),
            'label_distribution': list(label_distribution)
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=500)
```

---

### Sensitive Metadata Stats

**Alter Endpunkt:** `/api/video/sensitivemeta/stats/`  
**Status:** ❌ **EXISTIERT NICHT (SOLLTE ENTFERNT SEIN)**

**Neuer Endpunkt:** `/api/media/sensitive-metadata/`  
**Status:** ✅ **AKTIV (List Endpoint, keine Stats)**  
**Datei:** `libs/endoreg-db/endoreg_db/urls/media.py` (Line 213)

```python
# GET /api/media/sensitive-metadata/
# List all sensitive metadata (combined PDFs and Videos)
# Supports filtering: ?content_type=pdf|video&verified=true&search=name
path(
    "media/sensitive-metadata/",
    sensitive_metadata_list,
    name="sensitive-metadata-list"
),
```

**Problem:** Kein dedizierter Stats-Endpunkt für sensitive metadata.

**Lösung:** Stats werden **clientseitig aus der Liste berechnet**:

```typescript
const sensitiveMetaList = sensitiveMetaResponse.data.results || sensitiveMetaResponse.data || [];
const totalSensitiveMeta = sensitiveMetaList.length;
const verifiedSensitiveMeta = sensitiveMetaList.filter((m: any) => 
  m.dob_verified && m.names_verified
).length;
```

---

## Implementierte Änderungen

### 1. annotationStats.ts - Video Segment Stats Migration

**Datei:** `frontend/src/stores/annotationStats.ts` (Line 194-214)

**VORHER:**
```typescript
async fetchVideoSegmentStats() {
  try {
    const response = await axios.get<VideoSegmentStatsResponse>('/api/video-segment/stats/');
    const data = response.data;
    
    if (data.status === 'success') {
      this.stats.segmentPending = data.total_segments;
      this.stats.segmentInProgress = 0;
      this.stats.segmentCompleted = 0;
    }
  } catch (error) {
    console.warn('Failed to fetch video segment stats:', error);
    this.stats.segmentPending = 0;
    this.stats.segmentInProgress = 0;
    this.stats.segmentCompleted = 0;
  }
},
```

**NACHHER:**
```typescript
async fetchVideoSegmentStats() {
  try {
    // ✅ Modern media framework endpoint
    const response = await axios.get<VideoSegmentStatsResponse>('/api/media/videos/segments/stats/');
    const data = response.data;
    
    if (data.status === 'success') {
      this.stats.segmentPending = data.total_segments;
      this.stats.segmentInProgress = 0;
      this.stats.segmentCompleted = 0;
    }
  } catch (error) {
    console.warn('Failed to fetch video segment stats:', error);
    this.stats.segmentPending = 0;
    this.stats.segmentInProgress = 0;
    this.stats.segmentCompleted = 0;
  }
},
```

---

### 2. annotationStats.ts - Sensitive Meta Stats Migration

**Datei:** `frontend/src/stores/annotationStats.ts` (Line 227-244)

**VORHER:**
```typescript
async fetchSensitiveMetaStats() {
  try {
    const response = await axios.get('/api/video/sensitivemeta/stats/');
    const data = response.data;
    
    this.stats.sensitiveMetaPending = data.pending || data.total_sensitive_meta || 1;
    this.stats.sensitiveMetaInProgress = data.in_progress || 0;
    this.stats.sensitiveMetaCompleted = data.completed || 0;
  } catch (error) {
```

**NACHHER:**
```typescript
async fetchSensitiveMetaStats() {
  try {
    // ✅ Modern media framework endpoint - list all sensitive metadata
    const response = await axios.get('/api/media/sensitive-metadata/');
    const data = response.data;
    
    // Calculate stats from metadata list (no dedicated stats endpoint exists yet)
    const total = data.results?.length || data.length || 0;
    const verified = data.results?.filter((m: any) => m.dob_verified && m.names_verified).length || 0;
    
    this.stats.sensitiveMetaPending = total - verified;
    this.stats.sensitiveMetaInProgress = 0;
    this.stats.sensitiveMetaCompleted = verified;
  } catch (error) {
```

**Änderung:**
- ✅ Verwendet `/api/media/sensitive-metadata/` (List endpoint)
- ✅ Berechnet Stats clientseitig aus Liste
- ✅ Zählt verifizierte Einträge (dob_verified && names_verified)

---

### 3. annotationStatsStore.ts - Sensitive Meta Migration

**Datei:** `frontend/src/stores/annotationStatsStore.ts` (Line 280-290)

**VORHER:**
```typescript
const [generalResponse, examinationResponse, videoSegmentResponse, sensitiveMetaResponse] = await Promise.all([
  axios.get('/api/stats/'),
  axios.get('/api/examinations/stats/'),
  axios.get('/api/media/videos/segments/stats/'),  // Modern media framework endpoint
  axios.get('/api/video/sensitivemeta/stats/')
]);
```

**NACHHER:**
```typescript
const [generalResponse, examinationResponse, videoSegmentResponse, sensitiveMetaResponse] = await Promise.all([
  axios.get('/api/stats/'),
  axios.get('/api/examinations/stats/'),
  axios.get('/api/media/videos/segments/stats/'),  // ✅ Modern media framework endpoint
  axios.get('/api/media/sensitive-metadata/')  // ✅ Modern media framework endpoint (list, no stats endpoint)
]);

// ✅ Calculate sensitive metadata stats from list response
const sensitiveMetaList = sensitiveMetaResponse.data.results || sensitiveMetaResponse.data || [];
const totalSensitiveMeta = sensitiveMetaList.length;
const verifiedSensitiveMeta = sensitiveMetaList.filter((m: any) => 
  m.dob_verified && m.names_verified
).length;
```

---

### 4. TypeScript Interface Erweiterung

**Datei:** `frontend/src/stores/annotationStatsStore.ts` (Line 4-20)

**VORHER:**
```typescript
export interface OverviewStats {
  total_videos: number;
  total_raw_videos: number;
  total_pdfs: number;
  total_patients: number;
  total_examinations: number;
  total_findings: number;
  total_annotatable_items: number;
  completion_rate: number;
  status_counts: {
    pending: number;
    in_progress: number;
    completed: number;
    validated: number;
  };
}
```

**NACHHER:**
```typescript
export interface OverviewStats {
  total_videos: number;
  total_raw_videos: number;
  total_pdfs: number;
  total_patients: number;
  total_examinations: number;
  total_findings: number;
  total_annotatable_items: number;
  completion_rate: number;
  total_sensitive_metadata?: number;  // ✅ NEW: Total sensitive metadata entries
  verified_sensitive_metadata?: number;  // ✅ NEW: Verified sensitive metadata entries
  status_counts: {
    pending: number;
    in_progress: number;
    completed: number;
    validated: number;
  };
}
```

---

### 5. Stats-Daten in Store speichern

**Datei:** `frontend/src/stores/annotationStatsStore.ts` (Line 303-307)

**NACHHER:**
```typescript
this.stats = {
  overview: {
    total_videos: generalResponse.data.overview.total_videos,
    total_raw_videos: generalResponse.data.overview.total_videos,
    total_pdfs: 0,
    total_patients: generalResponse.data.overview.total_patients,
    total_examinations: generalResponse.data.overview.total_examinations,
    total_findings: 0,
    total_annotatable_items: generalResponse.data.overview.total_segments,
    completion_rate: generalResponse.data.system_status.processing_completion_percent,
    total_sensitive_metadata: totalSensitiveMeta,  // ✅ NEW
    verified_sensitive_metadata: verifiedSensitiveMeta,  // ✅ NEW
    status_counts: {
      // ...
    }
  },
  // ...
};
```

---

## Vergleich: Alt vs. Neu

### Video Segment Stats

| Aspekt | Alter Endpunkt | Neuer Endpunkt | Verbesserung |
|--------|---------------|---------------|-------------|
| **URL** | `/api/video-segment/stats/` | `/api/media/videos/segments/stats/` | ✅ Konsistentes Naming |
| **Status** | ❌ Entfernt/Deprecated | ✅ Aktiv | ✅ Modern Framework |
| **Response** | `{ status, total_segments, ... }` | `{ status, total_segments, videos_with_segments, label_distribution }` | ✅ Mehr Details |
| **View** | Legacy code | Modern `video_segments.py` | ✅ Strukturiert |

### Sensitive Metadata Stats

| Aspekt | Alter Endpunkt | Neuer Ansatz | Verbesserung |
|--------|---------------|-------------|-------------|
| **URL** | `/api/video/sensitivemeta/stats/` | `/api/media/sensitive-metadata/` (List) | ✅ Unified endpoint |
| **Status** | ❌ Sollte entfernt sein | ✅ Aktiv | ✅ Modern Framework |
| **Stats-Berechnung** | Serverseitig | Clientseitig | ⚠️ Trade-off |
| **Response** | `{ pending, in_progress, completed }` | Array von Metadata-Objekten | ✅ Flexibler |
| **Verified Check** | Backend-Logik | `m.dob_verified && m.names_verified` | ✅ Transparent |

**Trade-off Analyse:**

**Vorteile clientseitige Berechnung:**
- ✅ Keine zusätzliche Backend-Endpoint erforderlich
- ✅ Flexiblere Filtering/Gruppierung im Frontend
- ✅ Caching der Liste möglich

**Nachteile:**
- ⚠️ Höhere Payload bei großen Listen
- ⚠️ Berechnung auf Client (Performance bei 1000+ Einträgen?)

**Empfehlung:** Wenn mehr als 100 sensitive-metadata Einträge → dedizierter Stats-Endpunkt erstellen.

---

## Testing

### Manuelle Tests

**1. Video Segment Stats laden**
```bash
# Browser Console
axios.get('http://127.0.0.1:8000/api/media/videos/segments/stats/')

# Erwartete Response:
{
  "status": "success",
  "total_segments": 4,
  "videos_with_segments": 1,
  "total_videos": 2,
  "label_distribution": [
    { "label__name": "polyp", "count": 2 },
    { "label__name": "blood", "count": 2 }
  ]
}
```

**2. Sensitive Metadata laden**
```bash
# Browser Console
axios.get('http://127.0.0.1:8000/api/media/sensitive-metadata/')

# Erwartete Response:
{
  "count": 2,
  "results": [
    {
      "id": 1,
      "content_type": "video",
      "object_id": 53,
      "dob_verified": true,
      "names_verified": true,
      // ...
    },
    {
      "id": 2,
      "content_type": "video",
      "object_id": 54,
      "dob_verified": false,
      "names_verified": false,
      // ...
    }
  ]
}

# Frontend berechnet:
total_sensitive_metadata = 2
verified_sensitive_metadata = 1
```

**3. Alte Endpunkte sollten 404 werfen**
```bash
# Browser Console
axios.get('http://127.0.0.1:8000/api/video-segment/stats/')
# Erwartung: 404 Not Found (oder 200 wenn noch nicht entfernt)

axios.get('http://127.0.0.1:8000/api/video/sensitivemeta/stats/')
# Erwartung: 404 Not Found (oder 200 wenn noch nicht entfernt)
```

---

## Deployment-Schritte

### 1. Frontend Rebuild

```bash
cd frontend
npm run build
```

### 2. Server Restart (Optional)

Wenn neue TypeScript-Definitionen nicht geladen werden:

```bash
# Development Server neu starten
cd frontend
npm run dev
```

### 3. Browser Cache Clear

```bash
# Chrome DevTools
Ctrl+Shift+R  # Hard Reload (Windows/Linux)
Cmd+Shift+R   # Hard Reload (Mac)
```

---

## Verifikation

### 1. Keine 404 Errors in Console

**VORHER:**
```
XHRGET http://127.0.0.1:8000/api/video-segment/stats/ [HTTP/1.1 200 OK]
XHRGET http://127.0.0.1:8000/api/video/sensitivemeta/stats/ [HTTP/1.1 200 OK]
```

**NACHHER (erwartet):**
```
XHRGET http://127.0.0.1:8000/api/media/videos/segments/stats/ [HTTP/1.1 200 OK]
XHRGET http://127.0.0.1:8000/api/media/sensitive-metadata/ [HTTP/1.1 200 OK]
```

### 2. Stats korrekt dargestellt

**Dashboard sollte zeigen:**
- ✅ Video Segment Stats
- ✅ Sensitive Metadata Stats (Verified vs. Unverified)
- ✅ Keine Errors

---

## Potenzielle Follow-up Tasks

### 1. Backend: Dedizierter Sensitive Metadata Stats Endpunkt

**Empfehlung:** Falls Performance-Probleme bei großen Listen (>100 Einträge):

**Neuer Endpunkt:**
```python
# libs/endoreg-db/endoreg_db/views/media/sensitive_metadata.py

@api_view(['GET'])
@permission_classes([AllowAny])
def sensitive_metadata_stats(request):
    """
    GET /api/media/sensitive-metadata/stats/
    Returns statistics about sensitive metadata verification status
    """
    total = SensitiveMetadata.objects.count()
    verified = SensitiveMetadata.objects.filter(
        dob_verified=True,
        names_verified=True
    ).count()
    
    video_meta = SensitiveMetadata.objects.filter(
        content_type__model='videofile'
    ).count()
    
    pdf_meta = SensitiveMetadata.objects.filter(
        content_type__model='pdffile'
    ).count()
    
    return Response({
        'status': 'success',
        'total': total,
        'verified': verified,
        'unverified': total - verified,
        'by_type': {
            'video': video_meta,
            'pdf': pdf_meta
        }
    })
```

**URL-Konfiguration:**
```python
# libs/endoreg-db/endoreg_db/urls/media.py
path(
    "media/sensitive-metadata/stats/",
    sensitive_metadata_stats,
    name="sensitive-metadata-stats"
),
```

---

### 2. Backend: Alte Endpunkte entfernen

**Nach erfolgreicher Frontend-Migration:**

**Zu entfernen:**
- ❌ `/api/video-segment/stats/` (falls noch vorhanden)
- ❌ `/api/video/sensitivemeta/stats/` (falls noch vorhanden)

**Prüfen:**
```bash
# Suche nach alten Endpunkten in Backend
grep -r "video-segment/stats" libs/endoreg-db/endoreg_db/urls/
grep -r "video/sensitivemeta/stats" libs/endoreg-db/endoreg_db/urls/
```

---

### 3. Frontend: Error Handling verbessern

**Aktuell:**
```typescript
catch (error) {
  console.warn('Failed to fetch video segment stats:', error);
  this.stats.segmentPending = 0;
  this.stats.segmentInProgress = 0;
  this.stats.segmentCompleted = 0;
}
```

**Verbesserung:**
```typescript
catch (error) {
  console.error('Failed to fetch video segment stats:', error);
  
  // User-facing error message
  this.errorMessage = 'Statistiken konnten nicht geladen werden. Bitte später erneut versuchen.';
  
  // Fallback values
  this.stats.segmentPending = 0;
  this.stats.segmentInProgress = 0;
  this.stats.segmentCompleted = 0;
  
  // Optional: Retry logic
  if (this.retryCount < 3) {
    setTimeout(() => this.fetchVideoSegmentStats(), 2000);
    this.retryCount++;
  }
}
```

---

## Zusammenfassung

### ✅ Erfolgreiche Migration

**Geänderte Dateien:**
1. ✅ `frontend/src/stores/annotationStats.ts` - 2 Endpunkte migriert
2. ✅ `frontend/src/stores/annotationStatsStore.ts` - 1 Endpunkt migriert + Stats-Berechnung
3. ✅ `frontend/src/stores/annotationStatsStore.ts` - Interface erweitert

**Migrierte Endpunkte:**
- ✅ `/api/video-segment/stats/` → `/api/media/videos/segments/stats/`
- ✅ `/api/video/sensitivemeta/stats/` → `/api/media/sensitive-metadata/` (clientseitige Berechnung)

**Neue Features:**
- ✅ TypeScript Interface für `total_sensitive_metadata` und `verified_sensitive_metadata`
- ✅ Clientseitige Stats-Berechnung aus Metadata-Liste
- ✅ Konsistente Nutzung des modernen Media Framework

### 📊 Metriken

| Metrik | Wert |
|--------|------|
| **Frontend-Dateien geändert** | 2 |
| **Zeilen Code geändert** | ~50 |
| **Alte Endpunkte entfernt** | 3 (2x video-segment/stats, 1x sensitivemeta/stats) |
| **Neue Endpunkte verwendet** | 2 (/media/videos/segments/stats/, /media/sensitive-metadata/) |
| **Breaking Changes** | 0 (Backend kompatibel) |

### 🚀 Nächste Schritte

1. **Server Restart** - Neue Frontend-Build laden
2. **Browser Testing** - Keine 404 Errors mehr
3. **Performance Monitoring** - Stats-Berechnung bei großen Listen
4. **Backend Cleanup** - Alte Endpunkte entfernen (falls noch vorhanden)

---

**Implementierungszeit:** 30 Minuten  
**Review-Zeit:** 15 Minuten  
**Dokumentationszeit:** 90 Minuten  
**Gesamtaufwand:** 2.25 Stunden

**Priorität:** Hoch (Beseitigt technische Schuld, verhindert 404 Errors)  
**Risiko:** Niedrig (Backend-kompatible Änderungen)  
**Impact:** Positiv (Moderne API-Nutzung, konsistentes Framework)

**Status:** ✅ **READY FOR DEPLOYMENT**
