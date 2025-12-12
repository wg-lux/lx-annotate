# Videosegment-Validierung API

## Übersicht

Die Videosegment-Validierung ermöglicht es, vom Benutzer überprüfte Segment-Annotationen zu bestätigen. Es gibt drei Endpunkte für verschiedene Validierungsszenarien.

## API-Endpunkte

### 1. Einzelne Segment-Validierung

**Endpunkt:** `POST /api/label-video-segment/<segment_id>/validate/`

**Beschreibung:** Validiert ein einzelnes LabelVideoSegment.

**Request Body (optional):**
```json
{
  "is_validated": true,  // optional, default: true
  "notes": "Segment überprüft und korrekt"  // optional
}
```

**Response (Success - 200 OK):**
```json
{
  "message": "Segment 123 validation status updated.",
  "segment_id": 123,
  "is_validated": true,
  "label": "polyp",
  "video_id": 49,
  "start_frame": 100,
  "end_frame": 250
}
```

**Verwendung:**
```bash
curl -X POST http://localhost:8000/api/label-video-segment/123/validate/ \
  -H "Content-Type: application/json" \
  -d '{"is_validated": true, "notes": "Geprüft und korrekt"}'
```

---

### 2. Bulk-Validierung

**Endpunkt:** `POST /api/label-video-segments/validate-bulk/`

**Beschreibung:** Validiert mehrere Segmente gleichzeitig.

**Request Body:**
```json
{
  "segment_ids": [123, 124, 125, 126],
  "is_validated": true,  // optional, default: true
  "notes": "Batch-Review abgeschlossen"  // optional, gilt für alle Segmente
}
```

**Response (Success - 200 OK):**
```json
{
  "message": "Bulk validation completed. 4 segments updated.",
  "updated_count": 4,
  "requested_count": 4,
  "is_validated": true
}
```

**Response (Partial Success - 200 OK):**
```json
{
  "message": "Bulk validation completed. 3 segments updated.",
  "updated_count": 3,
  "requested_count": 4,
  "is_validated": true,
  "failed_ids": [126],
  "warning": "1 segments could not be validated"
}
```

**Verwendung:**
```bash
curl -X POST http://localhost:8000/api/label-video-segments/validate-bulk/ \
  -H "Content-Type: application/json" \
  -d '{
    "segment_ids": [123, 124, 125],
    "is_validated": true,
    "notes": "Alle überprüft"
  }'
```

---

### 3. Video-Complete-Validierung

**Endpunkt:** `POST /api/videos/<video_id>/segments/validate-complete/`

**Beschreibung:** Markiert alle Segmente eines Videos als validiert. Nützlich nach vollständiger Review.

**Request Body (optional):**
```json
{
  "label_name": "polyp",  // optional, nur Segmente mit diesem Label
  "notes": "Komplette Video-Review abgeschlossen"  // optional
}
```

**Response (Success - 200 OK):**
```json
{
  "message": "Video segment validation completed for video 49",
  "video_id": 49,
  "total_segments": 15,
  "updated_count": 15,
  "failed_count": 0,
  "label_filter": "polyp"  // oder null, wenn kein Filter
}
```

**Verwendung (alle Segmente):**
```bash
curl -X POST http://localhost:8000/api/videos/49/segments/validate-complete/ \
  -H "Content-Type: application/json" \
  -d '{"notes": "Video komplett überprüft"}'
```

**Verwendung (nur spezifisches Label):**
```bash
curl -X POST http://localhost:8000/api/videos/49/segments/validate-complete/ \
  -H "Content-Type: application/json" \
  -d '{
    "label_name": "polyp",
    "notes": "Alle Polyp-Segmente überprüft"
  }'
```

---

## Workflow-Beispiele

### Szenario 1: Einzelne Segment-Review
```bash
# 1. Benutzer überprüft Segment visuell im Frontend
# 2. Frontend sendet Validierung:
POST /api/label-video-segment/123/validate/
Body: {"is_validated": true, "notes": "Korrekt annotiert"}
```

### Szenario 2: Batch-Review mehrerer Segmente
```bash
# 1. Benutzer markiert mehrere Segmente im Frontend
# 2. Frontend sammelt IDs: [101, 102, 103, 104, 105]
# 3. Frontend sendet Bulk-Validierung:
POST /api/label-video-segments/validate-bulk/
Body: {
  "segment_ids": [101, 102, 103, 104, 105],
  "is_validated": true,
  "notes": "Batch überprüft am 2025-10-08"
}
```

### Szenario 3: Komplettes Video als reviewt markieren
```bash
# 1. Benutzer schließt Review des gesamten Videos ab
# 2. Frontend sendet Complete-Request:
POST /api/videos/49/segments/validate-complete/
Body: {"notes": "Video #49 vollständig überprüft"}

# Oder nur für ein bestimmtes Label:
POST /api/videos/49/segments/validate-complete/
Body: {
  "label_name": "polyp",
  "notes": "Alle Polyp-Annotationen überprüft"
}
```

---

## Frontend-Integration

### JavaScript-Beispiel (Einzelvalidierung)
```javascript
async function validateSegment(segmentId, isValid = true, notes = '') {
  const response = await fetch(
    `/api/label-video-segment/${segmentId}/validate/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_validated: isValid,
        notes: notes
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Validation failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Verwendung:
try {
  const result = await validateSegment(123, true, 'Geprüft');
  console.log('Validierung erfolgreich:', result);
} catch (error) {
  console.error('Validierung fehlgeschlagen:', error);
}
```

### JavaScript-Beispiel (Bulk-Validierung)
```javascript
async function validateBulkSegments(segmentIds, notes = '') {
  const response = await fetch(
    '/api/label-video-segments/validate-bulk/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        segment_ids: segmentIds,
        is_validated: true,
        notes: notes
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Bulk validation failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Verwendung:
const selectedSegments = [101, 102, 103];
const result = await validateBulkSegments(
  selectedSegments,
  'Batch-Review abgeschlossen'
);
console.log(`${result.updated_count} Segmente validiert`);
```

---

## Fehlerbehandlung

### 404 Not Found
```json
{
  "error": "Segment 999 not found."
}
```

### 400 Bad Request
```json
{
  "error": "segment_ids is required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Validation failed: <error details>"
}
```

---

## Datenbankmodell

Die Validierung setzt das `is_validated`-Feld im `LabelVideoSegmentState`-Model:

```python
# Vereinfachtes Schema
LabelVideoSegment
  ├── id
  ├── video_file (FK)
  ├── label (FK)
  ├── start_frame_number
  ├── end_frame_number
  └── state (OneToOne)
      ├── is_validated  # Boolean - wird durch diese API gesetzt
      └── validation_notes  # Text - optionale Notizen (falls Feld existiert)
```

---

## Permissions

Alle Endpunkte verwenden `DEBUG_PERMISSIONS`:
- In **DEBUG-Mode**: Zugriff erlaubt
- In **Production**: Authentifizierung erforderlich

---

## Testing

```bash
# Django-Konsole
python manage.py shell

from endoreg_db.models import LabelVideoSegment

# Segment abrufen
segment = LabelVideoSegment.objects.get(id=123)

# Status prüfen
print(f"Validiert: {segment.state.is_validated}")

# Manuell setzen (für Tests)
segment.state.is_validated = True
segment.state.save()
```

---

## Zusammenfassung

| Endpunkt | Verwendung | Typischer Use Case |
|----------|------------|-------------------|
| `/label-video-segment/<id>/validate/` | Einzelvalidierung | Benutzer klickt "Segment bestätigen" |
| `/label-video-segments/validate-bulk/` | Mehrere Segmente | Benutzer wählt mehrere aus → "Alle bestätigen" |
| `/videos/<id>/segments/validate-complete/` | Ganzes Video | "Video-Review abgeschlossen" Button |

**Nächste Schritte:**
1. Server neu starten: `python manage.py runserver`
2. Endpunkte testen (siehe cURL-Beispiele oben)
3. Frontend-Integration durchführen
