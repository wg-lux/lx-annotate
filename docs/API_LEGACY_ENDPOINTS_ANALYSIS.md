# Legacy API Endpoints Analysis
**Datum:** 14. Oktober 2025  
**Status:** Identifikation aller Endpoints außerhalb des Modern Media Framework

---

## 📊 **Übersicht**

Dieses Dokument analysiert alle Video- und PDF-bezogenen Endpoints, die **NICHT** im Modern Media Framework (`/api/media/`) liegen.

---

## 🎥 **VIDEO ENDPOINTS**

### ✅ **Bereits Migriert (Modern Media Framework)**

| Endpoint | Zweck | Status |
|----------|-------|--------|
| `GET /api/media/videos/` | Video-Liste | ✅ Modern |
| `GET /api/media/videos/<pk>/` | Video-Stream (mit type-Parameter) | ✅ Modern |
| `GET /api/media/videos/<pk>/details/` | Video-Metadaten (JSON) | ✅ Modern |
| `GET /api/media/videos/<pk>/stream/` | Video-Stream (Legacy-Kompatibilität) | ✅ Modern |
| `POST /api/media/videos/<pk>/reimport/` | Video-Reimport | ✅ Modern |
| `GET /api/media/videos/<pk>/metadata/` | Correction-Metadaten | ✅ Modern |
| `GET /api/media/videos/<pk>/processing-history/` | Verarbeitungsverlauf | ✅ Modern |
| `POST /api/media/videos/<pk>/analyze/` | Video-Analyse | ✅ Modern |
| `POST /api/media/videos/<pk>/apply-mask/` | Maskierung anwenden | ✅ Modern |
| `POST /api/media/videos/<pk>/remove-frames/` | Frames entfernen | ✅ Modern |
| `POST /api/media/videos/<pk>/reprocess/` | Neuverarbeitung | ✅ Modern |
| `GET /api/media/videos/segments/` | Alle Video-Segmente (Collection) | ✅ Modern (Oct 14, 2025) |
| `GET /api/media/videos/segments/stats/` | Video-Segment-Statistiken | ✅ Modern (Oct 14, 2025) |
| `GET /api/media/videos/<pk>/segments/` | Video-Segmente mit Label-Filter | ✅ Modern (Oct 14, 2025) |
| `POST /api/media/videos/<pk>/segments/` | Neues Video-Segment erstellen | ✅ Modern (Oct 14, 2025) |
| `GET /api/media/videos/<pk>/segments/<segment_id>/` | Segment-Details abrufen | ✅ Modern (Oct 14, 2025) |
| `PATCH /api/media/videos/<pk>/segments/<segment_id>/` | Segment aktualisieren | ✅ Modern (Oct 14, 2025) |
| `DELETE /api/media/videos/<pk>/segments/<segment_id>/` | Segment löschen | ✅ Modern (Oct 14, 2025) |

---

### ⚠️ **LEGACY - Noch nicht migriert**

#### **~~1. Video Streaming & Segmentation~~** ✅ **MIGRIERT - 14. Oktober 2025**

| Endpoint | View | Status | Migration |
|----------|------|--------|-----------|
| ~~`GET /api/videostream/<pk>/`~~ | `VideoStreamView` | ✅ **ENTFERNT** | → `/api/media/videos/<pk>/` |
| `GET /api/videos/<pk>/` | `VideoViewSet.retrieve` | 🟡 **NIEDRIG** - Alternativer Zugriff über DRF ViewSet | - |
| `GET /api/videos/<pk>/stream/` | `VideoViewSet.stream` | � **NIEDRIG** - Alternativer Zugriff über DRF ViewSet | - |

**Migration abgeschlossen:**
- ✅ Legacy-Endpoint `/api/videostream/<pk>/` aus `urls/video.py` entfernt
- ✅ Tests auf moderne URL `/api/media/videos/<pk>/` aktualisiert
- ✅ Frontend verwendet bereits moderne URLs (seit vorheriger Migration)
- ✅ Deprecation-Kommentare in `urls/video.py` hinzugefügt

**Verbleibende ViewSet-Endpoints:**
- `VideoViewSet` bietet alternativen Zugriff über DRF-Router
- Endpoints bleiben für DRF-Kompatibilität erhalten
- **Empfehlung:** Modern Framework bevorzugen (`/api/media/videos/`)

---

#### **~~2. Video Labels & Segments~~** ✅ **MIGRIERT - 14. Oktober 2025**

| Endpoint | View | Status | Migration |
|----------|------|--------|-----------|
| ~~`GET /api/video-segments/`~~ | `video_segments_view` | ✅ **MIGRIERT** | → `/api/media/videos/segments/` |
| ~~`POST /api/video-segments/`~~ | `video_segments_view` | ✅ **MIGRIERT** | → `/api/media/videos/<pk>/segments/` |
| ~~`GET /api/video-segments/<segment_id>/`~~ | `video_segment_detail_view` | ✅ **MIGRIERT** | → `/api/media/videos/<pk>/segments/<segment_id>/` |
| ~~`PATCH /api/video-segments/<segment_id>/`~~ | `video_segment_detail_view` | ✅ **MIGRIERT** | → `/api/media/videos/<pk>/segments/<segment_id>/` |
| ~~`DELETE /api/video-segments/<segment_id>/`~~ | `video_segment_detail_view` | ✅ **MIGRIERT** | → `/api/media/videos/<pk>/segments/<segment_id>/` |
| ~~`GET /api/video-segments/stats/`~~ | `VideoSegmentStatsView` | ✅ **MIGRIERT** | → `/api/media/videos/segments/stats/` |
| `GET /api/videos/<video_id>/labels/<label_name>/` | `VideoLabelView` | 🟢 **HOCH** - Aktiv genutzt | Noch nicht migriert |

**Migration abgeschlossen:**
- ✅ Neue moderne Views in `endoreg_db/views/media/video_segments.py` erstellt (4 Funktionen)
- ✅ URLs in `endoreg_db/urls/media.py` registriert (4 Endpoints)
- ✅ Frontend `videoStore.ts` aktualisiert (6 API-Aufrufe)
- ✅ Frontend `AnnotationDashboard.vue` aktualisiert (2 API-Aufrufe)
- ✅ Frontend `annotationStatsStore.ts` aktualisiert (1 API-Aufruf)
- ✅ Cypress Tests aktualisiert
- ✅ Unit Tests aktualisiert
- ✅ Stats-Endpoint hinzugefügt (`/api/media/videos/segments/stats/`)

**Verbleibend:**
- `VideoLabelView` für Label-spezifische Segmente (z.B. "outside", "polyp")

---

#### **~~3. Video Segment Validation~~** ✅ **MIGRIERT - 14. Oktober 2025**

| Legacy Endpoint | Modern Endpoint | Zweck | Status |
|-----------------|-----------------|-------|--------|
| ~~`POST /api/label-video-segment/<segment_id>/validate/`~~ | `POST /api/media/videos/<pk>/segments/<segment_id>/validate/` | Einzelnes Segment validieren | ✅ **MIGRIERT** |
| ~~`POST /api/label-video-segments/validate-bulk/`~~ | `POST /api/media/videos/<pk>/segments/validate-bulk/` | Mehrere Segmente validieren | ✅ **MIGRIERT** |
| ~~`GET /api/videos/<video_id>/segments/validate-complete/`~~ | `GET /api/media/videos/<pk>/segments/validation-status/` | Validierungsstatus prüfen | ✅ **MIGRIERT** |

**Migration abgeschlossen:**
- ✅ Neue moderne Views in `endoreg_db/views/media/video_segments.py` erstellt (3 Funktionen)
- ✅ URLs in `endoreg_db/urls/media.py` registriert (3 Endpoints)
- ✅ Backend: Alle Validation-Logik migriert mit video-scoped Pattern
- ✅ Moderne Endpoints folgen Modern Media Framework Pattern `/api/media/videos/<pk>/...`

**Moderne Validation Endpoints:**
```python
# Einzelvalidierung
POST /api/media/videos/<pk>/segments/<segment_id>/validate/
Body: { "is_validated": true, "notes": "..." }

# Bulk-Validierung  
POST /api/media/videos/<pk>/segments/validate-bulk/
Body: { "segment_ids": [1,2,3], "is_validated": true, "notes": "..." }

# Validierungsstatus (GET + POST)
GET /api/media/videos/<pk>/segments/validation-status/?label_name=polyp
POST /api/media/videos/<pk>/segments/validation-status/
Body: { "label_name": "polyp", "notes": "..." }
```

**Frontend-Integration:**
- ✅ `VideoExaminationAnnotation.vue` - Auf moderne Endpoints aktualisiert (`submitVideoSegments`)
- ✅ `Timeline.vue` - Keine direkten Validation-Calls (verwendet videoStore)
- ✅ `AnonymizationValidationComponent.vue` - Verwendet separaten Workflow (Segment-Annotation-Eignung)

**Status:** ✅ **KOMPLETT MIGRIERT** - Backend + Frontend + Dokumentation

---

#### **4. Video Segment Management**

| Endpoint | View | Zweck | Migrations-Priorität |
|----------|------|-------|---------------------|
| `POST /api/annotations/` | `create_video_segment_annotation` | Neue Annotation erstellen | 🟢 **HOCH** |
| `PATCH /api/annotations/<annotation_id>/` | `update_label_video_segment` | Annotation aktualisieren | 🟢 **HOCH** |
| `GET /api/lvs/by-label-name/<label_name>/by-video-id/<video_id>/` | `get_lvs_by_name_and_video_id` | Segmente nach Label+Video | 🟡 **MITTEL** |

**Analyse:**
- Annotation-Endpoints sind separate Zugriffspunkte für Segment-Erstellung
- **Empfehlung:** Zu `/api/media/videos/<pk>/segments/` (POST) migrieren

---

#### **5. Video Timeline**

| Endpoint | View | Zweck | Migrations-Priorität |
|----------|------|-------|---------------------|
| Nicht in show_urls gefunden | `video_timeline_view` | Timeline-Daten | ⚪ **UNKLAR** - Endpoint existiert nur im Code |

**Analyse:**
- `video_timeline_view` wird in `__init__.py` exportiert, aber keine URL gefunden
- **Empfehlung:** Prüfen, ob Endpoint überhaupt registriert ist

---

#### **6. Video Examination**

| Endpoint | View | Zweck | Migrations-Priorität |
|----------|------|-------|---------------------|
| `GET /api/video-examinations/` | `VideoExaminationViewSet.list` | Liste aller Video-Untersuchungen | 🟡 **NIEDRIG** - Spezielle Business-Logik |
| `GET /api/video-examinations/<pk>/` | `VideoExaminationViewSet.retrieve` | Video-Untersuchung Details | 🟡 **NIEDRIG** |

**Analyse:**
- Video-Examinations verknüpfen Videos mit Untersuchungsdaten
- **Empfehlung:** Im ViewSet belassen (Business-Logik-Layer, kein Media-Management)

---

#### **7. Video Sensitive Metadata**

| Endpoint | View | Zweck | Migrations-Priorität |
|----------|------|-------|---------------------|
| `GET/PATCH /api/video/sensitivemeta/<sensitive_meta_id>/` | `SensitiveMetaDetailView` | Sensitive Metadaten für Video | 🟢 **HOCH** |

**Analyse:**
- Zugriff auf sensible Patientendaten (Name, DOB, etc.)
- **Empfehlung:** Zu `/api/media/videos/<pk>/sensitive-metadata/` migrieren

---

## 📄 **PDF ENDPOINTS**

### ✅ **Bereits Migriert (Modern Media Framework)**

| Endpoint | Zweck | Status |
|----------|-------|--------|
| `GET /api/media/pdfs/` | PDF-Liste | ✅ Modern |
| `GET /api/media/pdfs/<pk>/` | PDF-Detail | ✅ Modern |
| `GET /api/media/pdfs/<pk>/stream/` | PDF-Stream | ✅ Modern |
| `POST /api/media/pdfs/<pk>/reimport/` | PDF-Reimport | ✅ Modern |

---

### ⚠️ **LEGACY - Noch nicht migriert**

#### **~~1. PDF & Video Sensitive Metadata~~** ✅ **MIGRIERT - 14. Oktober 2025**

| Legacy Endpoint | Modern Endpoint | HTTP | Zweck | Status |
|-----------------|-----------------|------|-------|--------|
| ~~`GET /api/pdf/sensitivemeta/`~~ | `GET /api/media/pdfs/<pk>/sensitive-metadata/` | GET | PDF Meta Detail | ✅ **MIGRIERT** |
| ~~`GET/PATCH /api/pdf/sensitivemeta/<sensitive_meta_id>/`~~ | `GET/PATCH /api/media/pdfs/<pk>/sensitive-metadata/` | GET, PATCH | PDF Meta Detail & Update | ✅ **MIGRIERT** |
| ~~`GET /api/pdf/sensitivemeta/list/`~~ | `GET /api/media/pdfs/sensitive-metadata/` | GET | PDF Liste mit Filtering | ✅ **MIGRIERT** |
| ~~`POST /api/pdf/sensitivemeta/verify/`~~ | `POST /api/media/pdfs/<pk>/sensitive-metadata/verify/` | POST | Verification State Update | ✅ **MIGRIERT** |
| ~~`GET/PATCH /api/video/sensitivemeta/<sensitive_meta_id>/`~~ | `GET/PATCH /api/media/videos/<pk>/sensitive-metadata/` | GET, PATCH | Video Meta Detail & Update | ✅ **MIGRIERT** |

**Migration abgeschlossen:**
- ✅ Neue moderne Views in `endoreg_db/views/media/sensitive_metadata.py` erstellt (6 Funktionen)
- ✅ URLs in `endoreg_db/urls/media.py` registriert (6 Endpoints)
- ✅ Frontend `anonymizationStore.ts` aktualisiert (3 Änderungen)
- ✅ Frontend `ReportViewer.vue` aktualisiert (2 Änderungen + Import)
- ✅ Frontend `reportListService.ts` aktualisiert (Modern Framework Endpoint mit Legacy Fallback)
- ✅ Frontend `AnnotationDashboard.vue` aktualisiert (1 Änderung + Import)
- ✅ Django checks erfolgreich (0 Fehler)
- ✅ URL verification erfolgreich (6/6 URLs registriert)
- ✅ Keine Legacy-Referenzen mehr in TypeScript-Quellen

**Entfernte nicht-existente Endpoints (Frontend-Fixes):**

| Non-Existierender Endpoint | Wurde verwendet in | Zeile | Modern Replacement |
|----------------------------|-------------------|-------|-------------------|
| ❌ `/api/pdf/update_sensitivemeta/` | `anonymizationStore.ts` | 256 | ✅ `media/pdfs/${id}/sensitive-metadata/` |
| ❌ `/api/pdf/update_anony_text/` | `anonymizationStore.ts` | 258 | ✅ `media/pdfs/${id}/sensitive-metadata/` |
| ❌ `/api/pdf/sensitivemeta/update/` | `ReportViewer.vue` | 413 | ✅ `media/pdfs/${id}/sensitive-metadata/` |
| ❌ `/api/pdf/update_anony_text/` | `ReportViewer.vue` | 422 | ✅ `media/pdfs/${id}/sensitive-metadata/` |
| ❌ `/api/pdf/anony_text/` | `reportListService.ts` | 111 | ✅ Entfernt (nicht benötigt) |

**Vorteile:**
- ✅ Einheitliches URL-Schema (`/api/media/{videos|pdfs}/<pk>/sensitive-metadata/`)
- ✅ Ressourcen-orientiert (verwendet media ID statt sensitive_meta_id)
- ✅ RESTful Design (GET/PATCH auf selber Endpoint)
- ✅ Keine 404-Fehler mehr bei Patientendaten-Updates
- ✅ Moderne List-Endpoints mit Pagination & Filtering
- **HÖCHSTE PRIORITÄT** für Migration

**Frontend-Nutzung (Vollständige Liste):**

| Datei | Zeile | Endpoint | Methode | Status | Zweck |
|-------|-------|----------|---------|--------|-------|
| `anonymizationStore.ts` | 187 | `sensitivemeta/?id=${id}` | GET | ✅ Existiert | PDF Meta laden |
| `anonymizationStore.ts` | 256 | `update_sensitivemeta/` | PATCH | 🔴 **404** | Meta Update |
| `anonymizationStore.ts` | 258 | `update_anony_text/` | PATCH | 🔴 **404** | Text Update |
| `anonymizationStore.ts` | 265 | `media/videos/` | PATCH | ⚠️ Falsch (braucht `<pk>`) | Video Update |
| `reportListService.ts` | 111 | `pdf/anony_text/` | GET | ⚠️ Unbekannt | Legacy Fallback |
| `reportListService.ts` | 112 | `pdf/sensitivemeta/` | GET | ✅ Existiert (List) | Report-Liste |
| `ReportViewer.vue` | 413 | `/api/pdf/sensitivemeta/update/` | PATCH | 🔴 **404** | Meta Update |
| `ReportViewer.vue` | 422 | `/api/pdf/update_anony_text/` | PATCH | 🔴 **404** | Text Update |
| `annotationStatsStore.ts` | 284 | `/api/video/sensitivemeta/stats/` | GET | ⚠️ Stats | Statistiken |
| `AnnotationDashboard.vue` | 384 | `/api/pdf/sensitivemeta/` | GET | ✅ Existiert (List) | Dashboard-Liste |
| `AnonymizationValidationComponent.vue` | - | Via `anonymizationStore` | - | Indirekt | Validierung |

**Migrations-Status:**
- 🟡 **In Planung** - Siehe `docs/MIGRATION_SENSITIVE_META_PLAN.md`
- 📋 Migrationsplan umfasst:
  - ✅ 4 Backend-Funktionen (Videos GET/PATCH, PDFs GET/PATCH, Verify)
  - ✅ 2 List-Endpoints (Combined + PDF-only)
  - ✅ 5 Frontend-Dateien mit konkreten Änderungen
  - ✅ URL-Registration im Modern Framework
  - ✅ Testing & Rollback-Strategien

---

## 📋 **REPORTS & ANONYMIZATION**

#### **1. Report Endpoints**

| Endpoint | View | Zweck | Migrations-Priorität |
|----------|------|-------|---------------------|
| `GET /api/reports/` | `ReportListView` | Alle Reports | 🟡 **NIEDRIG** |
| `GET /api/reports/<report_id>/file-metadata/` | `ReportFileMetadataView` | Report-Datei-Metadaten | 🟢 **MITTEL** |
| `GET /api/reports/<report_id>/secure-file/` | `SecureFileServingView` | Geschützter Dateizugriff | 🟡 **NIEDRIG** |
| `GET /api/reports/<report_id>/with-secure-url/` | `ReportWithSecureUrlView` | Report mit sicherer URL | 🟡 **NIEDRIG** |

**Analyse:**
- Reports sind Datei-Container (können PDF oder Video sein)
- **Empfehlung:** Prüfen, ob Reports vollständig durch Media Framework ersetzt werden können

---

#### **2. Anonymization Endpoints**

| Endpoint | View | Zweck | Status | Migrations-Priorität |
|----------|------|-------|--------|---------------------|
| `GET /api/anonymization/items/overview/` | `AnonymizationOverviewView` | Übersicht zu anonymisierender Dateien | ✅ **AKTIV** | ✅ **BEHALTEN** - Business-Logik |
| `POST /api/anonymization/<file_id>/validate/` | `AnonymizationValidateView` | Anonymisierung validieren | ✅ **AKTIV** | ✅ **BEHALTEN** - Business-Logik |
| `GET /api/anonymization/<file_id>/status/` | `anonymization_status` | Anonymisierungsstatus | ✅ **AKTIV** | ✅ **BEHALTEN** - Polling |
| `PUT /api/anonymization/<file_id>/current/` | `anonymization_current` | Aktuelles Element setzen | ✅ **AKTIV** | ✅ **BEHALTEN** - Workflow |
| `POST /api/anonymization/<file_id>/start/` | `start_anonymization` | Anonymisierung starten | ✅ **AKTIV** | ✅ **BEHALTEN** - Workflow |
| `GET /api/anonymization/<file_id>/has-raw/` | `has_raw_video_file` | Prüft ob Raw-Video existiert | ✅ **AKTIV** | ✅ **BEHALTEN** - Utility |
| `POST /api/anonymization/clear-locks/` | `clear_processing_locks` | Processing-Locks zurücksetzen | ✅ **AKTIV** | ✅ **BEHALTEN** - Wartung |
| `GET /api/anonymization/polling-info/` | `polling_coordinator_info` | Polling-Koordinator Status | ✅ **AKTIV** | ✅ **BEHALTEN** - Monitoring |

**Analyse:**
- Anonymization-Endpoints sind Business-Logik-Layer über Media-Dateien
- Alle Endpoints unter `endoreg_db.views.anonymization.overview` und `.validate`
- **Empfehlung:** Im separaten `/api/anonymization/` Namespace belassen (Business-Logik-Schicht)

---

#### **3. Media Management Endpoints**

| Endpoint | View | Zweck | Status | Migrations-Priorität |
|----------|------|-------|--------|---------------------|
| `GET /api/media-management/status/` | `MediaManagementView` | Media-Management Status abrufen | ✅ **AKTIV** | ✅ **BEHALTEN** - Admin-Funktion |
| `POST /api/media-management/cleanup/` | `MediaManagementView` | Cleanup-Operationen durchführen | ✅ **AKTIV** | ✅ **BEHALTEN** - Wartung |
| `POST /api/media-management/reset-status/<file_id>/` | `reset_processing_status` | Processing-Status zurücksetzen | ✅ **AKTIV** | ✅ **BEHALTEN** - Recovery |
| `POST /api/media-management/force-remove/<file_id>/` | `force_remove_media` | Erzwungenes Löschen von Media | ✅ **AKTIV** | ✅ **BEHALTEN** - Admin-Funktion |

**Analyse:**
- Media-Management-Endpoints unter `endoreg_db.views.anonymization.media_management`
- Administrative Funktionen für Media-Verwaltung und Fehlerbehandlung
- **Empfehlung:** Im separaten `/api/media-management/` Namespace belassen (Admin-Funktionen)

---

#### **4. Annotation Endpoints**

| Endpoint | View | Zweck | Status | Migrations-Priorität |
|----------|------|-------|--------|---------------------|
| `POST /api/save-anonymization-annotation-video/<annotation_id>/` | `SensitiveMetaDetailView` | Video-Annotation speichern | ✅ **AKTIV** | 🟡 **MITTEL** - Prüfung erforderlich |

**Analyse:**
- Endpoint existiert mit `<annotation_id>` Parameter
- Frontend verwendet möglicherweise andere Signatur
- **Empfehlung:** Frontend-Integration prüfen und bei Bedarf anpassen

---

## 🎯 **MIGRATIONS-PRIORITÄTEN**

### **🔴 HOCH (Sofort)**
1. **Sensitive Metadata Endpoints** (PDF & Video)
   - Zu `/api/media/{type}/<pk>/sensitive-metadata/` migrieren
   - Kritisch für Patientendaten-Management

2. **Video Segment Validation**
   - Zu `/api/media/videos/<pk>/segments/<segment_id>/validate/` migrieren
   - Kritisch für Annotation-Workflow

3. **Annotation Creation/Update**
   - Backend-Implementation für fehlende Endpoints
   - Migration zu `/api/media/{type}/<pk>/annotations/`

4. **VideoLabelView**
   - Zu `/api/media/videos/<pk>/labels/<label_name>/` migrieren
   - Aktiv genutzt für Label-basierte Segmentierung

### **🟡 MITTEL (Nächste Phase)**
1. ~~**Video Segment Legacy Endpoints**~~ ✅ **ERLEDIGT (14. Oktober 2025)**
   - ✅ `/api/video-segments/` → `/api/media/videos/segments/`
   - ✅ `/api/video-segments/<id>/` → `/api/media/videos/<pk>/segments/<id>/`
   - ✅ Stats-Endpoint hinzugefügt

2. **Report File Metadata**
   - `/api/reports/<id>/file-metadata/` → `/api/media/{type}/<pk>/file-metadata/`

3. **LVS by Label+Video**
   - `/api/lvs/by-label-name/<label>/by-video-id/<id>/` → Query-Parameter

### **🟢 NIEDRIG (Optional/Später)**
1. **Video ViewSet Streaming**
   - Duplikate wie `/api/videos/<pk>/stream/` entfernen

2. **VideoExamination ViewSet**
   - Im ViewSet belassen (Business-Logik)

3. **Report Endpoints**
   - Prüfen, ob durch Media Framework ersetzt

---

## 📊 **ZUSAMMENFASSUNG**

### **Video Endpoints:**
- ✅ **23 migriert** zum Modern Media Framework (inkl. Video Streaming, Segments & Validation)
- ⚠️ **7 verbleibend** (davon 3 kritisch für Migration)
- 🔴 **1 kritisch** - Sensitive Metadata (⚠️ Non-existent endpoints im Frontend!)

**Migrationen (Oktober 14, 2025):**
- ✅ Video Streaming Framework (1 Endpoint)
- ✅ Video Segments CRUD (7 Endpoints)
- ✅ Video Segment Validation (3 Endpoints)

### **PDF Endpoints:**
- ✅ **4 migriert** zum Modern Media Framework
- 🔴 **5 kritisch** - Sensitive Metadata (⚠️ Non-existent endpoints im Frontend!)
- ⚠️ **4 verbleibend** (davon 3 kritisch)

### **🚨 KRITISCHE BEFUNDE - HÖCHSTE PRIORITÄT:**

#### **Non-Existent Endpoints (Frontend verwendet nicht-existente URLs!):**

Frontend verwendet folgende Endpoints, die **NICHT im Backend existieren**:

| Non-Existenter Endpoint | Verwendet in | Zeile | HTTP | Beschreibung |
|-------------------------|--------------|-------|------|--------------|
| `/api/pdf/update_sensitivemeta/` | `anonymizationStore.ts` | 256 | PATCH | Sensitive Metadata Update |
| `/api/pdf/update_anony_text/` | `anonymizationStore.ts` | 258 | PATCH | Anonymtext Update |
| `/api/pdf/update_anony_text/` | `ReportViewer.vue` | 422 | PATCH | Anonymtext Update |
| `/api/pdf/sensitivemeta/update/` | `ReportViewer.vue` | 413 | PATCH | Sensitive Metadata Update |
| `/api/pdf/anony_text/` | `reportListService.ts` | 111 | GET | Legacy Fallback (Status unklar) |

**Auswirkungen:**
- ❌ Sensitive Metadata Updates funktionieren **NICHT** (404 Errors)
- ❌ `AnonymizationValidationComponent.vue` kann Daten nicht speichern
- ❌ `ReportViewer.vue` kann Änderungen nicht persistieren
- ❌ Patientendaten-Änderungen (Name, DOB, Examination Date) gehen verloren
- ⚠️ Frontend zeigt vermutlich Fehler oder stille Fehlschläge

**Betroffene Komponenten:**
- `AnonymizationValidationComponent.vue` (nutzt `anonymizationStore`)
- `ReportViewer.vue` (direkte API-Calls)
- `reportListService.ts` (Legacy-Fallback-Logik)
- `AnnotationDashboard.vue` (List-View)

**Lösung:**
📋 Vollständiger Migrationsplan erstellt: `docs/MIGRATION_SENSITIVE_META_PLAN.md`

**Migration umfasst:**
- ✅ **6 Backend-Funktionen** (4 Resource-Scoped + 2 List-Endpoints)
- ✅ **6 URL-Patterns** im Modern Framework
- ✅ **5 Frontend-Dateien** mit konkreten Änderungen (Zeilen-genau)
- ✅ Testing-Procedures & Rollback-Strategien
- ✅ List-Endpoints für Collection-Level Queries

**Neue Modern Framework Endpoints:**
- `GET/PATCH /api/media/videos/<pk>/sensitive-metadata/`
- `POST /api/media/videos/<pk>/sensitive-metadata/verify/`
- `GET/PATCH /api/media/pdfs/<pk>/sensitive-metadata/`
- `POST /api/media/pdfs/<pk>/sensitive-metadata/verify/`
- `GET /api/media/sensitive-metadata/` (Combined List)
- `GET /api/media/pdfs/sensitive-metadata/` (PDF List)

---

### **Anonymization & Management:**
- ✅ **8 Anonymization-Endpoints aktiv** (Business-Logik-Schicht, behalten)
- ✅ **4 Media-Management-Endpoints aktiv** (Admin-Funktionen, behalten)
- ✅ **1 Validation-Endpoint unter /api/anonymization/** (Business-Logik, behalten)

### **Kritische Findings:**
- ✅ **Video Segment Validation komplett migriert** (14. Oktober 2025)
- ✅ **Alle Segment-Endpoints im Modern Framework** (CRUD + Validation)
- ✅ **Legacy Video-Streaming migriert** (14. Oktober 2025)
- ✅ **Anonymization Workflow vollständig implementiert** (8 aktive Endpoints)
- � **Sensitive Metadata Migration KRITISCH** (Non-existent endpoints blockieren Features)

### **Migrations-Roadmap:**

| Priorität | Migration | Status | Dokument |
|-----------|-----------|--------|----------|
| 🔴 **P0** | Sensitive Metadata Framework | 🟡 Geplant | `MIGRATION_SENSITIVE_META_PLAN.md` |
| 🟢 **DONE** | Video Segments CRUD + Validation | ✅ Abgeschlossen | Dokumentiert |
| 🟢 **DONE** | Video Streaming Framework | ✅ Abgeschlossen | Dokumentiert |

### **Letzte Aktualisierung:**
- **Datum:** 14. Oktober 2025
- **Änderung:** Sensitive Metadata Migration Plan erstellt + Non-existent endpoints identifiziert
- **Kritischer Befund:** 5 Frontend-Endpoints existieren nicht im Backend
- **Frontend-Dateien betroffen:** 5 (anonymizationStore, ReportViewer, reportListService, AnnotationDashboard, AnonymizationValidationComponent)
- **Backend-Functions benötigt:** 6 (4 Resource-Scoped + 2 List-Endpoints)
- **Status:** 🔴 Migration HÖCHSTE PRIORITÄT - Features blockiert

---

## 🚀 **NÄCHSTE SCHRITTE**

1. ~~**Segment Validation Migration:**~~ ✅ **KOMPLETT** (14. Oktober 2025)
   - ✅ Backend: Alle Views migriert (3 Funktionen)
   - ✅ Frontend: VideoExaminationAnnotation.vue aktualisiert
   - ✅ URLs: Alle registriert im Modern Framework
   - ✅ Dokumentation: Vollständig aktualisiert

2. **Sensitive Metadata Migration:** Höchste Priorität
   - Zu `/api/media/{type}/<pk>/sensitive-metadata/` migrieren

3. **VideoLabelView Migration:** Label-basierte Segmentierung
   - Zu `/api/media/videos/<pk>/labels/<label_name>/` migrieren

4. **Legacy-Endpoint Deprecation:** Nach vollständiger Migration
   - Legacy Validation-Endpoints deaktivieren
   - Dokumentation Update: API-Docs nach Migration aktualisieren
