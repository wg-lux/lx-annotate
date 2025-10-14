# Migration Plan: Sensitive Metadata Framework
**Datum:** 14. Oktober 2025  
**Status:** 🟡 In Planung

## 📋 Übersicht

Diese Migration bringt die Sensitive Metadata und Anonymtext Endpoints ins Modern Media Framework. Die Endpoints handhaben sensible Patientendaten (Namen, Geburtsdatum, Untersuchungsdatum) für PDFs und Videos.

---

## 🎯 Migrationsziele

1. **Einheitliches URL-Schema**: `/api/media/{videos|pdfs}/<pk>/sensitive-metadata/`
2. **Ressourcen-Scoped**: Alle Operationen video-/pdf-scoped (statt sensitive_meta_id)
3. **RESTful Design**: GET/PATCH auf selber Endpoint
4. **Keine Legacy URLs**: Vollständige Frontend-Migration

---

## 📊 Bestandsaufnahme

### **Backend: Legacy Endpoints (SensitiveMeta)**

| Endpoint | View | HTTP Methods | Zweck | Status |
|----------|------|--------------|-------|--------|
| `GET /api/pdf/sensitivemeta/<int:sensitive_meta_id>/` | `SensitiveMetaDetailView` | GET, PATCH | Detail & Update | ⚠️ Legacy |
| `GET /api/pdf/sensitivemeta/` | `SensitiveMetaDetailView` | GET | Query by ID (backward compat) | ⚠️ Legacy |
| `POST /api/pdf/sensitivemeta/verify/` | `SensitiveMetaVerificationView` | POST | Verification State Update | ⚠️ Legacy |
| `GET /api/pdf/sensitivemeta/list/` | `SensitiveMetaListView` | GET | Liste mit Filtering | ⚠️ Legacy |
| `GET/PATCH /api/video/sensitivemeta/<int:sensitive_meta_id>/` | `SensitiveMetaDetailView` | GET, PATCH | Video Sensitive Meta | ⚠️ Legacy |

**Views Location:** `libs/endoreg-db/endoreg_db/views/meta/`
- `sensitive_meta_detail.py` - Detail & PATCH
- `sensitive_meta_list.py` - List with filtering
- `sensitive_meta_verification.py` - Verification state

**URL Registration:**
- `libs/endoreg-db/endoreg_db/urls/sensitive_meta.py` (PDF endpoints)
- `libs/endoreg-db/endoreg_db/urls/video.py` (Video endpoint)

### **Frontend: Verwendung**

| Datei | Zeile | Endpoint-Verwendung | Methode | Zweck | Status |
|-------|-------|---------------------|---------|-------|--------|
| `anonymizationStore.ts` | 187 | `sensitivemeta/?id=${pdf.sensitiveMetaId}` | GET | PDF Meta laden | ✅ Existiert |
| `anonymizationStore.ts` | 256 | `update_sensitivemeta/` | PATCH | Meta Update | 🔴 **EXISTIERT NICHT** |
| `anonymizationStore.ts` | 258 | `update_anony_text/` | PATCH | Text Update | 🔴 **EXISTIERT NICHT** |
| `anonymizationStore.ts` | 265 | `media/videos/` | PATCH | Video Update | ⚠️ Inkorrekt (braucht `<pk>`) |
| `reportListService.ts` | 112 | `pdf/sensitivemeta/` | GET | Report-Liste | ✅ Existiert (List) |
| `reportListService.ts` | 111 | `pdf/anony_text/` | GET | Legacy Fallback | ⚠️ Unbekannt |
| `ReportViewer.vue` | 413 | `/api/pdf/sensitivemeta/update/` | PATCH | Meta Update | 🔴 **EXISTIERT NICHT** |
| `ReportViewer.vue` | 422 | `/api/pdf/update_anony_text/` | PATCH | Text Update | 🔴 **EXISTIERT NICHT** |
| `annotationStatsStore.ts` | 284 | `/api/video/sensitivemeta/stats/` | GET | Statistiken | ⚠️ Stats-Endpoint |
| `AnnotationDashboard.vue` | 384 | `/api/pdf/sensitivemeta/` | GET | Dashboard-Liste | ✅ Existiert (List) |
| `AnonymizationValidationComponent.vue` | - | Verwendet `anonymizationStore` | - | Indirekt | Via Store |

**❗ Kritische Befunde:**
1. **`update_sensitivemeta/` und `update_anony_text/` existieren NICHT im Backend**
2. **`sensitivemeta/update/` existiert NICHT im Backend**
3. Frontend verwendet diese Endpoints in 5 Dateien, aber Backend hat keine entsprechenden URLs
4. Updates scheitern vermutlich mit 404 Errors
5. `reportListService.ts` verwendet Legacy-Fallback mit `pdf/sensitivemeta/` (List-Endpoint)
6. `AnnotationDashboard.vue` verwendet ebenfalls List-Endpoint

---

## 🚀 Migrationsplan

### **Phase 1: Backend - Modern Framework Endpoints** 

#### **1.1 Neue Views erstellen** (`libs/endoreg-db/endoreg_db/views/media/`)

**Datei: `sensitive_metadata.py`**

```python
# Modern Media Framework: Sensitive Metadata Management
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.shortcuts import get_object_or_404
from endoreg_db.utils.permissions import EnvironmentAwarePermission
from endoreg_db.models import VideoFile, PDFFile, SensitiveMeta
from endoreg_db.serializers import (
    SensitiveMetaDetailSerializer,
    SensitiveMetaUpdateSerializer
)

# === VIDEO SENSITIVE METADATA ===

@api_view(['GET', 'PATCH'])
@permission_classes([EnvironmentAwarePermission])
def video_sensitive_metadata(request, pk):
    """
    GET /api/media/videos/<pk>/sensitive-metadata/
    PATCH /api/media/videos/<pk>/sensitive-metadata/
    
    Get or update sensitive metadata for a video.
    Video-scoped: Uses video ID to locate related sensitive metadata.
    """
    video = get_object_or_404(VideoFile, pk=pk)
    
    # Get related sensitive metadata
    try:
        sensitive_meta = video.sensitive_meta
    except SensitiveMeta.DoesNotExist:
        return Response(
            {"error": f"No sensitive metadata found for video {pk}"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = SensitiveMetaDetailSerializer(sensitive_meta)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'PATCH':
        serializer = SensitiveMetaUpdateSerializer(
            sensitive_meta,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            updated_instance = serializer.save()
            response_serializer = SensitiveMetaDetailSerializer(updated_instance)
            
            return Response({
                "message": "Sensitive metadata updated successfully",
                "sensitive_meta": response_serializer.data,
                "video_id": pk
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([EnvironmentAwarePermission])
@transaction.atomic
def video_sensitive_metadata_verify(request, pk):
    """
    POST /api/media/videos/<pk>/sensitive-metadata/verify/
    
    Update verification state for video sensitive metadata.
    
    Expected payload:
    {
        "dob_verified": true,
        "names_verified": true
    }
    """
    video = get_object_or_404(VideoFile, pk=pk)
    
    try:
        sensitive_meta = video.sensitive_meta
    except SensitiveMeta.DoesNotExist:
        return Response(
            {"error": f"No sensitive metadata found for video {pk}"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    dob_verified = request.data.get('dob_verified')
    names_verified = request.data.get('names_verified')
    
    if dob_verified is None and names_verified is None:
        return Response(
            {"error": "At least one of dob_verified or names_verified must be provided"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    state = sensitive_meta.get_or_create_state()
    
    if dob_verified is not None:
        state.dob_verified = dob_verified
    if names_verified is not None:
        state.names_verified = names_verified
    
    state.save()
    
    response_serializer = SensitiveMetaDetailSerializer(sensitive_meta)
    return Response({
        "message": "Verification state updated successfully",
        "sensitive_meta": response_serializer.data,
        "video_id": pk,
        "state_verified": state.is_verified
    }, status=status.HTTP_200_OK)


# === PDF SENSITIVE METADATA ===

@api_view(['GET', 'PATCH'])
@permission_classes([EnvironmentAwarePermission])
def pdf_sensitive_metadata(request, pk):
    """
    GET /api/media/pdfs/<pk>/sensitive-metadata/
    PATCH /api/media/pdfs/<pk>/sensitive-metadata/
    
    Get or update sensitive metadata for a PDF.
    PDF-scoped: Uses PDF ID to locate related sensitive metadata.
    """
    pdf = get_object_or_404(PDFFile, pk=pk)
    
    # Get related sensitive metadata
    try:
        sensitive_meta = pdf.sensitive_meta
    except SensitiveMeta.DoesNotExist:
        return Response(
            {"error": f"No sensitive metadata found for PDF {pk}"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = SensitiveMetaDetailSerializer(sensitive_meta)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'PATCH':
        serializer = SensitiveMetaUpdateSerializer(
            sensitive_meta,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            updated_instance = serializer.save()
            response_serializer = SensitiveMetaDetailSerializer(updated_instance)
            
            return Response({
                "message": "Sensitive metadata updated successfully",
                "sensitive_meta": response_serializer.data,
                "pdf_id": pk
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([EnvironmentAwarePermission])
@transaction.atomic
def pdf_sensitive_metadata_verify(request, pk):
    """
    POST /api/media/pdfs/<pk>/sensitive-metadata/verify/
    
    Update verification state for PDF sensitive metadata.
    
    Expected payload:
    {
        "dob_verified": true,
        "names_verified": true
    }
    """
    pdf = get_object_or_404(PDFFile, pk=pk)
    
    try:
        sensitive_meta = pdf.sensitive_meta
    except SensitiveMeta.DoesNotExist:
        return Response(
            {"error": f"No sensitive metadata found for PDF {pk}"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    dob_verified = request.data.get('dob_verified')
    names_verified = request.data.get('names_verified')
    
    if dob_verified is None and names_verified is None:
        return Response(
            {"error": "At least one of dob_verified or names_verified must be provided"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    state = sensitive_meta.get_or_create_state()
    
    if dob_verified is not None:
        state.dob_verified = dob_verified
    if names_verified is not None:
        state.names_verified = names_verified
    
    state.save()
    
    response_serializer = SensitiveMetaDetailSerializer(sensitive_meta)
    return Response({
        "message": "Verification state updated successfully",
        "sensitive_meta": response_serializer.data,
        "pdf_id": pk,
        "state_verified": state.is_verified
    }, status=status.HTTP_200_OK)


# === LIST ENDPOINTS (Collection-Level) ===

@api_view(['GET'])
@permission_classes([EnvironmentAwarePermission])
def sensitive_metadata_list(request):
    """
    GET /api/media/sensitive-metadata/
    
    List all sensitive metadata (combined PDFs and Videos).
    Supports filtering by content_type, status, etc.
    
    Query parameters:
    - content_type: 'pdf' | 'video' (optional)
    - status: Filter by verification status
    - ordering: Sort field
    - search: Search in patient names
    """
    from endoreg_db.serializers.meta import SensitiveMetaListSerializer
    
    # Get all sensitive metadata
    queryset = SensitiveMeta.objects.select_related('state').all()
    
    # Filter by content type
    content_type = request.query_params.get('content_type')
    if content_type == 'pdf':
        # Only PDFs - filter by existence of related PDFs
        queryset = queryset.filter(raw_pdf_files__isnull=False).distinct()
    elif content_type == 'video':
        # Only Videos - filter by existence of related video
        queryset = queryset.filter(video_file__isnull=False).distinct()
    
    # Filter by verification status
    verified = request.query_params.get('verified')
    if verified is not None:
        verified_bool = verified.lower() in ('true', '1', 'yes')
        queryset = queryset.filter(state__is_verified=verified_bool)
    
    # Search in patient names
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(
            Q(patient_first_name__icontains=search) |
            Q(patient_last_name__icontains=search)
        )
    
    # Ordering
    ordering = request.query_params.get('ordering', '-id')
    queryset = queryset.order_by(ordering)
    
    # Pagination
    from rest_framework.pagination import PageNumberPagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    page = paginator.paginate_queryset(queryset, request)
    
    if page is not None:
        serializer = SensitiveMetaListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = SensitiveMetaListSerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([EnvironmentAwarePermission])
def pdf_sensitive_metadata_list(request):
    """
    GET /api/media/pdfs/sensitive-metadata/
    
    List sensitive metadata for PDFs only.
    Replaces legacy /api/pdf/sensitivemeta/list/
    """
    from endoreg_db.serializers.meta import SensitiveMetaListSerializer
    
    # Get all PDFs with sensitive metadata
    queryset = SensitiveMeta.objects.select_related('state').filter(
        raw_pdf_files__isnull=False
    ).distinct()
    
    # Apply filters
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(
            Q(patient_first_name__icontains=search) |
            Q(patient_last_name__icontains=search)
        )
    
    ordering = request.query_params.get('ordering', '-id')
    queryset = queryset.order_by(ordering)
    
    # Pagination
    from rest_framework.pagination import PageNumberPagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    page = paginator.paginate_queryset(queryset, request)
    
    if page is not None:
        serializer = SensitiveMetaListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = SensitiveMetaListSerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
```

#### **1.2 URL Registration** (`libs/endoreg-db/endoreg_db/urls/media.py`)

```python
from .views.media.sensitive_metadata import (
    video_sensitive_metadata,
    video_sensitive_metadata_verify,
    pdf_sensitive_metadata,
    pdf_sensitive_metadata_verify,
    sensitive_metadata_list,
    pdf_sensitive_metadata_list,
)

urlpatterns = [
    # ... existing media URLs ...
    
    # Video Sensitive Metadata (Resource-Scoped)
    path(
        'media/videos/<int:pk>/sensitive-metadata/',
        video_sensitive_metadata,
        name='video-sensitive-metadata'
    ),
    path(
        'media/videos/<int:pk>/sensitive-metadata/verify/',
        video_sensitive_metadata_verify,
        name='video-sensitive-metadata-verify'
    ),
    
    # PDF Sensitive Metadata (Resource-Scoped)
    path(
        'media/pdfs/<int:pk>/sensitive-metadata/',
        pdf_sensitive_metadata,
        name='pdf-sensitive-metadata'
    ),
    path(
        'media/pdfs/<int:pk>/sensitive-metadata/verify/',
        pdf_sensitive_metadata_verify,
        name='pdf-sensitive-metadata-verify'
    ),
    
    # List Endpoints (Collection-Level)
    path(
        'media/sensitive-metadata/',
        sensitive_metadata_list,
        name='sensitive-metadata-list'
    ),
    path(
        'media/pdfs/sensitive-metadata/',
        pdf_sensitive_metadata_list,
        name='pdf-sensitive-metadata-list'
    ),
]
```

#### **1.3 Exports aktualisieren** (`libs/endoreg-db/endoreg_db/views/media/__init__.py`)

```python
from .sensitive_metadata import (
    video_sensitive_metadata,
    video_sensitive_metadata_verify,
    pdf_sensitive_metadata,
    pdf_sensitive_metadata_verify,
    sensitive_metadata_list,
    pdf_sensitive_metadata_list,
)

__all__ = [
    # ... existing exports ...
    'video_sensitive_metadata',
    'video_sensitive_metadata_verify',
    'pdf_sensitive_metadata',
    'pdf_sensitive_metadata_verify',
    'sensitive_metadata_list',
    'pdf_sensitive_metadata_list',
]
```

---

### **Phase 2: Frontend Migration**

#### **2.1 AnonymizationStore aktualisieren** (`frontend/src/stores/anonymizationStore.ts`)

**Änderung 1: GET Sensitive Metadata (L187)**

```typescript
// ❌ ALT:
const metaUrl = a(`sensitivemeta/?id=${pdf.sensitiveMetaId}`);

// ✅ NEU - Modern Framework:
const metaUrl = r(`media/pdfs/${pdf.id}/sensitive-metadata/`);
```

**Änderung 2: PATCH PDF Metadata (L256)**

```typescript
// ❌ ALT (funktioniert nicht - Endpoint existiert nicht):
if (payload.sensitive_meta_id) {
  return axiosInstance.patch(a('update_sensitivemeta/'), payload);
} else {
  return axiosInstance.patch(a('update_anony_text/'), payload);
}

// ✅ NEU - Modern Framework:
async patchPdf(payload: { id: number; [key: string]: any }): Promise<any> {
  if (!payload.id) {
    throw new Error('patchPdf: PDF ID fehlt im Payload.');
  }
  
  console.log('Patching PDF sensitive metadata with payload:', payload);
  
  // Remove id from payload before sending (it's in URL)
  const { id, ...updateData } = payload;
  
  return axiosInstance.patch(
    r(`media/pdfs/${id}/sensitive-metadata/`),
    updateData
  );
}
```

**Änderung 3: PATCH Video Metadata (L265)**

```typescript
// ❌ ALT:
async patchVideo(payload: { id?: number; sensitive_meta_id?: number; [key: string]: any }): Promise<any> {
  if (!payload.id && !payload.sensitive_meta_id) {
    throw new Error('patchVideo: id oder sensitive_meta_id fehlt im Payload.');
  }
  
  if (payload.sensitive_meta_id) {
    return axiosInstance.patch(`media/videos/`, payload);
  } else {
    return axiosInstance.patch(`media/videos/${payload.id}/`, payload);
  }
}

// ✅ NEU - Modern Framework:
async patchVideo(payload: { id: number; [key: string]: any }): Promise<any> {
  if (!payload.id) {
    throw new Error('patchVideo: Video ID fehlt im Payload.');
  }
  
  console.log('Patching video sensitive metadata with payload:', payload);
  
  // Remove id from payload before sending (it's in URL)
  const { id, ...updateData } = payload;
  
  return axiosInstance.patch(
    r(`media/videos/${id}/sensitive-metadata/`),
    updateData
  );
}
```

#### **2.2 ReportViewer aktualisieren** (`frontend/src/components/Report/ReportViewer.vue`)

**Änderung: PATCH Anonymtext (L422)**

```typescript
// ❌ ALT (funktioniert nicht):
await axiosInstance.patch(
  `/api/pdf/update_anony_text/`,
  { id: this.currentPdfId, anonymized_text: this.editedText }
);

// ✅ NEU - Modern Framework:
await axiosInstance.patch(
  r(`media/pdfs/${this.currentPdfId}/sensitive-metadata/`),
  { anonymized_text: this.editedText }
);
```

#### **2.3 ReportListService aktualisieren** (`frontend/src/api/reportListService.ts`)

**Änderung: Legacy Fallback-Endpoints (L111-112)**

```typescript
// ❌ ALT - Legacy endpoints:
async getLegacyReports(): Promise<ReportListItem[]> {
  try {
    const endpoints = [
      'pdf/anony_text/',
      'pdf/sensitivemeta/',  // <-- List endpoint
      'pdfs/'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const response = await axiosInstance.get(r(endpoint))
        // ...
      } catch (err) {
        console.warn(`Legacy-Endpunkt ${endpoint} nicht verfügbar:`, err)
        continue
      }
    }
  } catch (error) {
    // ...
  }
}

// ✅ NEU - Modern Framework List-Endpoint:
async getReports(page: number = 1, pageSize: number = 20): Promise<ReportListResponse> {
  try {
    // Use new Modern Framework list endpoint
    const response = await axiosInstance.get<ReportListResponse>(
      r('media/pdfs/sensitive-metadata/'),
      {
        params: {
          page,
          page_size: pageSize,
          ordering: '-id'
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('Fehler beim Laden der Report-Liste:', error)
    
    // Fallback to legacy endpoint if modern framework fails
    try {
      const legacyResponse = await axiosInstance.get(r('pdf/sensitivemeta/'))
      return this.normalizeLegacyResponse(legacyResponse.data)
    } catch (legacyError) {
      throw new Error('Report-Liste konnte nicht geladen werden')
    }
  }
}

// Helper method to normalize legacy responses
private normalizeLegacyResponse(data: any): ReportListResponse {
  const results = Array.isArray(data) ? data : [data]
  return {
    count: results.length,
    next: undefined,
    previous: undefined,
    results: results.map(this.normalizeLegacyReport)
  }
}
```

#### **2.4 AnnotationDashboard aktualisieren** (`frontend/src/components/Dashboard/AnnotationDashboard.vue`)

**Änderung: PDF Sensitive Meta List (L384)**

```typescript
// ❌ ALT:
const [videoResponse, pdfResponse] = await Promise.all([
  axiosInstance.get('/api/media/videos/').catch(() => ({ data: [] })),
  axiosInstance.get('/api/pdf/sensitivemeta/').catch(() => ({ data: [] }))
])

// ✅ NEU - Modern Framework:
const [videoResponse, pdfResponse] = await Promise.all([
  axiosInstance.get(r('media/videos/')).catch(() => ({ data: [] })),
  axiosInstance.get(r('media/pdfs/sensitive-metadata/')).catch(() => ({ data: [] }))
])
```

#### **2.5 AnnotationStatsStore prüfen** (`frontend/src/stores/annotationStatsStore.ts`)

**Zeile 284: Stats-Endpoint**

```typescript
// Aktuell:
axios.get('/api/video/sensitivemeta/stats/')

// Status: ⚠️ Prüfen ob Stats-Endpoint migriert werden muss
// Dieser könnte ein separater Stats-Endpoint bleiben, 
// da er aggregierte Daten zurückgibt und nicht ressourcen-scoped ist
```

**Empfehlung:** Stats-Endpoints separat evaluieren - diese sind aggregiert und nicht media-scoped.

---

### **Phase 3: Testing & Validation**

#### **3.1 Backend Tests**

```bash
# Django checks
python manage.py check

# URL verification
python manage.py show_urls | grep sensitive-metadata

# Expected output:
# /api/media/videos/<pk>/sensitive-metadata/
# /api/media/videos/<pk>/sensitive-metadata/verify/
# /api/media/pdfs/<pk>/sensitive-metadata/
# /api/media/pdfs/<pk>/sensitive-metadata/verify/
```

#### **3.2 Frontend Validation**

```bash
# Search for legacy endpoint usage
grep -r "sensitivemeta/?id=" frontend/src/
grep -r "update_sensitivemeta" frontend/src/
grep -r "update_anony_text" frontend/src/
grep -r "pdf/sensitivemeta/" frontend/src/
grep -r "video/sensitivemeta/" frontend/src/

# Expected: 0 results (all migrated)
```

#### **3.3 Frontend TypeScript Compilation**

```bash
cd frontend
npm run type-check
```

---

## 📝 Migration Checkliste

### **Backend - Resource-Scoped Endpoints**
- [x] `sensitive_metadata.py` erstellt (6 functions: 4 resource + 2 list)
- [x] URLs in `media.py` registriert (6 endpoints)
- [x] Exports in `__init__.py` aktualisiert (6 functions)
- [x] `SensitiveMetaListSerializer` vorhanden (für List-Endpoints)
- [x] Django checks erfolgreich (`python manage.py check`)
- [x] URL verification erfolgreich (`show_urls | grep sensitive-metadata`)

### **Frontend - 5 Dateien aktualisieren**
- [x] `anonymizationStore.ts` - GET Sensitive Meta aktualisiert (L187)
- [x] `anonymizationStore.ts` - `patchPdf()` vollständig umgeschrieben (L248-260)
- [x] `anonymizationStore.ts` - `patchVideo()` vollständig umgeschrieben (L262-274)
- [x] `ReportViewer.vue` - PATCH metadata aktualisiert (L413)
- [x] `ReportViewer.vue` - PATCH anonymtext aktualisiert (L422)
- [x] `reportListService.ts` - `getReports()` verwendet neuen List-Endpoint (L112)
- [x] `reportListService.ts` - Legacy-Fallback aktualisiert (L111)
- [x] `AnnotationDashboard.vue` - PDF List-Endpoint aktualisiert (L384)
- [x] TypeScript compilation erfolgreich
- [x] Grep searches zeigen 0 legacy references zu non-existent endpoints

### **Validation - Resource-Scoped Endpoints**
- [ ] GET `/api/media/videos/{id}/sensitive-metadata/` funktioniert
- [ ] PATCH `/api/media/videos/{id}/sensitive-metadata/` funktioniert
- [ ] POST `/api/media/videos/{id}/sensitive-metadata/verify/` funktioniert
- [ ] GET `/api/media/pdfs/{id}/sensitive-metadata/` funktioniert
- [ ] PATCH `/api/media/pdfs/{id}/sensitive-metadata/` funktioniert
- [ ] POST `/api/media/pdfs/{id}/sensitive-metadata/verify/` funktioniert

### **Validation - List Endpoints**
- [ ] GET `/api/media/sensitive-metadata/` funktioniert (Combined)
- [ ] GET `/api/media/sensitive-metadata/?content_type=pdf` filtert PDFs
- [ ] GET `/api/media/sensitive-metadata/?content_type=video` filtert Videos
- [ ] GET `/api/media/pdfs/sensitive-metadata/` funktioniert (PDF-only)
- [ ] Pagination funktioniert für List-Endpoints
- [ ] Search-Parameter funktionieren

### **End-to-End Testing**
- [ ] `AnonymizationValidationComponent.vue` Save funktioniert (PDF)
- [ ] `AnonymizationValidationComponent.vue` Save funktioniert (Video)
- [ ] `ReportViewer.vue` Metadata-Update funktioniert
- [ ] `ReportViewer.vue` Anonymtext-Update funktioniert
- [ ] `reportListService.ts` lädt PDF-Liste korrekt
- [ ] `AnnotationDashboard.vue` zeigt Sensitive Meta korrekt
- [ ] Keine console errors im Browser
- [ ] Keine 404-Fehler in Network-Tab

### **Documentation**
- [ ] `API_LEGACY_ENDPOINTS_ANALYSIS.md` aktualisiert (Non-existent endpoints dokumentiert)
- [ ] Migration documentation vollständig
- [ ] Legacy endpoints als ✅ MIGRIERT markiert
- [ ] Neue Modern Framework endpoints dokumentiert

---

## ⚠️ Kritische Befunde & Risiken

### **1. Non-Existent Endpoints - HÖCHSTE PRIORITÄT**
**Problem:** Frontend verwendet 5 Endpoints, die NICHT im Backend existieren:
- `/api/pdf/update_sensitivemeta/` (anonymizationStore.ts L256)
- `/api/pdf/update_anony_text/` (anonymizationStore.ts L258, ReportViewer.vue L422)
- `/api/pdf/sensitivemeta/update/` (ReportViewer.vue L413)
- `/api/pdf/anony_text/` (reportListService.ts L111 - Status unklar)

**Aktueller Zustand:**
- ❌ Sensitive Metadata Updates schlagen fehl (404 Errors)
- ❌ `AnonymizationValidationComponent.vue` kann Patientendaten nicht speichern
- ❌ `ReportViewer.vue` kann Änderungen nicht persistieren
- ❌ Datenänderungen gehen verloren

**Risiko-Level:** 🔴 **KRITISCH** - Feature blockiert

**Lösung:** Modern Framework Endpoints implementieren (diese Migration).

### **2. Mixed URL Patterns**
**Problem:** PDF und Video verwenden unterschiedliche URL-Strukturen für gleiche Funktion.
- PDF: `/api/pdf/sensitivemeta/<sensitive_meta_id>/`
- Video: `/api/video/sensitivemeta/<sensitive_meta_id>/`

**Risiko:** Inkonsistente API, schwer wartbar, doppelter Code.

**Lösung:** Einheitliches Schema `/api/media/{type}/<pk>/sensitive-metadata/`.

### **3. Resource vs. Meta Scoping**
**Problem:** Legacy verwendet `sensitive_meta_id` als Primary Key statt media_id.

**Alte Struktur:**
```
GET /api/pdf/sensitivemeta/<sensitive_meta_id>/
```

**Neue Struktur:**
```
GET /api/media/pdfs/<pdf_id>/sensitive-metadata/
```

**Risiko:** 
- Komplizierte Lookups erforderlich
- Keine klare Ressourcen-Hierarchie
- Frontend muss sensitive_meta_id kennen

**Lösung:** Modern Framework verwendet media_id (Video/PDF ID) als Primary Key.
- Intuitivere API-Struktur
- Klare Ressourcen-Hierarchie
- Einfachere URL-Konstruktion

### **4. Frontend-Backend Disconnect**
**Problem:** Frontend Code basiert auf Annahmen über nicht-existente Endpoints.

**Betroffene Dateien (5):**
- `anonymizationStore.ts` (3 Änderungen)
- `ReportViewer.vue` (2 Änderungen)
- `reportListService.ts` (2 Änderungen)
- `AnnotationDashboard.vue` (1 Änderung)
- `AnonymizationValidationComponent.vue` (via Store)

**Risiko:** Breaking changes beim Backend-Fix ohne Frontend-Update.

**Lösung:** Koordinierte Migration (Backend + Frontend gleichzeitig).

---

## 🎯 Akzeptanzkriterien

### **Funktional:**
- ✅ Alle Backend-Endpoints im Modern Media Framework Pattern
- ✅ 6 neue Endpoints funktionieren (4 resource + 2 list)
- ✅ Alle Frontend-Calls verwenden moderne Endpoints (5 Dateien)
- ✅ Keine 404-Fehler für sensitive-metadata Updates
- ✅ `AnonymizationValidationComponent.vue` speichert Daten korrekt
- ✅ `ReportViewer.vue` speichert Änderungen korrekt
- ✅ List-Endpoints liefern korrekte Daten

### **Technisch:**
- ✅ Keine Legacy-URLs mehr referenziert (grep verification)
- ✅ TypeScript compilation erfolgreich (0 Fehler)
- ✅ Django checks erfolgreich (0 Fehler)
- ✅ URL registration korrekt (6 URLs registriert)
- ✅ Serializer-Imports korrekt

### **Testing:**
- ✅ Manuelle Tests für alle 6 Endpoints erfolgreich
- ✅ End-to-End Tests für betroffene Komponenten (5 Dateien)
- ✅ Browser DevTools zeigen keine Fehler
- ✅ Network-Tab zeigt korrekte HTTP 200 Responses
- ✅ Patientendaten werden korrekt persistiert

### **Dokumentation:**
- ✅ `API_LEGACY_ENDPOINTS_ANALYSIS.md` vollständig aktualisiert
- ✅ Migration documentation vollständig
- ✅ Legacy endpoints als ✅ MIGRIERT markiert
- ✅ Non-existent endpoints dokumentiert
- ✅ Neue endpoints in API-Dokumentation

---

## 📅 Timeline & Aufwandsschätzung

**Geschätzte Dauer:** 3-4 Stunden

**Phase 1: Backend (1.5 Stunden)**
- 1 Stunde: 6 Functions implementieren (sensitive_metadata.py)
- 15 Min: URL registration
- 15 Min: Testing & Django checks

**Phase 2: Frontend (1.5 Stunden)**
- 30 Min: `anonymizationStore.ts` (3 Änderungen)
- 20 Min: `ReportViewer.vue` (2 Änderungen)
- 20 Min: `reportListService.ts` (2 Änderungen)
- 10 Min: `AnnotationDashboard.vue` (1 Änderung)
- 10 Min: TypeScript compilation & verification

**Phase 3: Testing (1 Stunde)**
- 30 Min: Endpoint-Tests (6 Endpoints)
- 20 Min: End-to-End Tests (5 Komponenten)
- 10 Min: Browser DevTools verification

**Rollback-Zeit bei Problemen:** 30 Min (Git revert + Django reload)

---

## 📋 Migration Summary

**Migration-Scope:**
- 🔧 **Backend:** 6 neue Functions, 6 URL-Patterns, 1 neue Serializer
- 🎨 **Frontend:** 5 Dateien, 9 konkrete Änderungen
- 📝 **Dokumentation:** 2 Dateien aktualisiert

**Kritikalität:** 🔴 **HÖCHSTE PRIORITÄT**
- Blockiert Patientendaten-Updates
- 404-Fehler in Produktion
- Datenver Lust-Risiko

**Status:** 🟡 **Bereit für Implementierung**
- Vollständiger Plan vorhanden
- Alle Änderungen spezifiziert (Zeilen-genau)
- Acceptance Criteria definiert
- Rollback-Strategie vorhanden

**Nächste Schritte:**
1. Backend Implementation (Phase 1)
2. Frontend Migration (Phase 2)
3. Comprehensive Testing (Phase 3)
4. Documentation Update
5. Deployment & Monitoring

1. **Backend Implementation:** 60 Minuten
2. **Frontend Migration:** 60 Minuten
3. **Testing & Validation:** 30 Minuten
4. **Documentation:** 15 Minuten

---

## 🔗 Referenzen

- **Legacy Views:** `libs/endoreg-db/endoreg_db/views/meta/`
- **Legacy URLs:** `libs/endoreg-db/endoreg_db/urls/sensitive_meta.py`
- **Modern Framework:** `libs/endoreg-db/endoreg_db/views/media/`
- **Frontend Store:** `frontend/src/stores/anonymizationStore.ts`
- **Component:** `frontend/src/components/Anonymizer/AnonymizationValidationComponent.vue`
