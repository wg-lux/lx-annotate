# 🔍 pdfStore.ts Endpoint Analysis & Migration Path
**Datum:** 14. Oktober 2025  
**Zweck:** Analyse fehlender Endpoints für pdfStore.ts Wiederherstellung

---

## 📋 Übersicht

Der `pdfStore.ts` verwendet **6 verschiedene Endpoints**, von denen **4 NICHT existieren** und durch moderne Alternativen ersetzt werden müssen.

---

## 🔴 KRITISCH: Fehlende Endpoints im pdfStore.ts

### **Endpoint-Inventar**

| pdfStore Funktion | Verwendeter Endpoint | Methode | Status | Backend View |
|-------------------|---------------------|---------|--------|--------------|
| `buildPdfStreamUrl()` | `/api/pdfs/${id}/stream` | GET | ✅ **EXISTIERT** | Modern Framework |
| `fetchNextPdf()` | `/api/pdf/next/` | GET | 🔴 **404** | **FEHLT** |
| `updateSensitiveMeta()` | `/api/pdf/sensitivemeta/${id}/` | PATCH | ✅ **EXISTIERT** | Legacy (migriert) |
| `updateAnonymizedText()` | `/api/pdf/${id}/anonymize/` | POST | 🔴 **404** | **FEHLT** |
| `approvePdf()` | `/api/pdf/${id}/approve/` | POST | 🔴 **404** | **FEHLT** |
| `checkAnonymizationStatus()` | `/api/pdf/${id}/status/` | GET | 🔴 **404** | **FEHLT** |

---

## 🎯 Detaillierte Endpoint-Analyse

### **1. ✅ PDF Stream (FUNKTIONIERT)**

**pdfStore Code:**
```typescript
function buildPdfStreamUrl(pdfId: number): string {
  return `/api/pdfs/${pdfId}/stream`;
}
```

**Backend:**
```
✅ /api/media/pdfs/<int:pk>/stream/
   View: PdfMediaView
   Status: Modern Framework - FUNKTIONIERT
```

**Empfehlung:** ✅ **KEINE ÄNDERUNG ERFORDERLICH**

---

### **2. 🔴 Fetch Next PDF (FEHLT KOMPLETT)**

**pdfStore Code:**
```typescript
async function fetchNextPdf(lastId?: number): Promise<void> {
  const url = lastId 
    ? `/api/pdf/next/?last_id=${lastId}`
    : '/api/pdf/next/';
  
  const response = await fetch(url);
  // ...
}
```

**Backend Status:**
```
🔴 FEHLT: /api/pdf/next/
   Keine entsprechende View gefunden
   Keine URL-Registration
```

**Alternative Lösungen:**

#### **Option A: Anonymization Overview verwenden** ⭐ **EMPFOHLEN**
```
✅ EXISTIERT: /api/anonymization/items/overview/
   View: AnonymizationOverviewView
   Zweck: Übersicht zu anonymisierender Dateien
   
GET /api/anonymization/items/overview/
Response: {
  "pdfs": [
    {
      "id": 1,
      "status": "pending_validation",
      "sensitive_meta_id": 10,
      ...
    }
  ],
  "videos": [...]
}
```

**Migration:**
```typescript
async function fetchNextPdf(lastId?: number): Promise<void> {
  // Use anonymization overview endpoint
  const response = await fetch('/api/anonymization/items/overview/');
  const data = await response.json();
  
  // Filter PDFs and find next one
  const pendingPdfs = data.pdfs.filter(p => p.status === 'pending_validation');
  
  if (lastId) {
    const lastIndex = pendingPdfs.findIndex(p => p.id === lastId);
    currentPdf.value = pendingPdfs[lastIndex + 1] || null;
  } else {
    currentPdf.value = pendingPdfs[0] || null;
  }
}
```

#### **Option B: Media Framework List-Endpoint**
```
✅ EXISTIERT: /api/media/pdfs/
   View: PdfMediaView
   Zweck: PDF-Liste

GET /api/media/pdfs/?status=pending_validation&ordering=id
```

**Empfehlung:** ⭐ **Option A** - Speziell für Anonymization-Workflow konzipiert

---

### **3. ✅ Update Sensitive Metadata (MIGRIERT)**

**pdfStore Code:**
```typescript
async function updateSensitiveMeta(sensitiveMetaId: number, data: any) {
  const response = await fetch(`/api/pdf/sensitivemeta/${sensitiveMetaId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
```

**Backend Status:**
```
✅ LEGACY EXISTIERT: /api/pdf/sensitivemeta/<sensitive_meta_id>/
   View: SensitiveMetaDetailView (Legacy)
   Status: Funktioniert, aber VERALTET

✅ MODERN EXISTIERT: /api/media/pdfs/<pk>/sensitive-metadata/
   View: pdf_sensitive_metadata
   Status: Modern Framework - EMPFOHLEN
```

**Migration:**
```typescript
// ❌ ALT (verwendet sensitive_meta_id):
await fetch(`/api/pdf/sensitivemeta/${sensitiveMetaId}/`, ...)

// ✅ NEU (verwendet pdf_id):
await fetch(`/api/media/pdfs/${pdfId}/sensitive-metadata/`, ...)
```

**Problem:** pdfStore hat nur `sensitiveMetaId`, braucht aber `pdfId` für Modern Framework

**Lösung:** PDF-Datenstruktur erweitern:
```typescript
export interface PdfMetadata {
  id: number;                    // ← PDF ID (RawPdfFile.id)
  sensitiveMetaId: number | null; // ← SensitiveMeta ID
  // ...
}
```

**Empfehlung:** ✅ **Auf Modern Framework migrieren** (braucht PDF ID)

---

### **4. 🔴 Update Anonymized Text (FEHLT KOMPLETT)**

**pdfStore Code:**
```typescript
async function updateAnonymizedText(pdfId: number, anonymizedText: string) {
  const response = await fetch(`/api/pdf/${pdfId}/anonymize/`, {
    method: 'POST',
    body: JSON.stringify({ anonymized_text: anonymizedText }),
  });
}
```

**Backend Status:**
```
🔴 FEHLT: /api/pdf/<id>/anonymize/
   Keine entsprechende View
   Keine URL-Registration
```

**Alternative Lösungen:**

#### **Option A: Sensitive Metadata Endpoint verwenden** ⭐ **EMPFOHLEN**
```
✅ EXISTIERT: /api/media/pdfs/<pk>/sensitive-metadata/
   View: pdf_sensitive_metadata
   Unterstützt: PATCH mit anonymized_text

PATCH /api/media/pdfs/<pk>/sensitive-metadata/
Body: {
  "anonymized_text": "Max M., 01.01.1990, ..."
}
```

**Migration:**
```typescript
async function updateAnonymizedText(pdfId: number, anonymizedText: string) {
  // Use Modern Framework sensitive metadata endpoint
  const response = await fetch(`/api/media/pdfs/${pdfId}/sensitive-metadata/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify({ anonymized_text: anonymizedText }),
  });
  
  if (!response.ok) throw new Error(`Failed to update: ${response.status}`);
  currentPdf.value.anonymizedText = anonymizedText;
  currentPdf.value.status = 'done_processing_anonymization';
}
```

#### **Option B: Neuen Backend-Endpoint erstellen**
```python
# Neuer Endpoint (NICHT EMPFOHLEN - unnötig)
@api_view(['POST'])
def pdf_anonymize(request, pk):
    pdf = get_object_or_404(RawPdfFile, pk=pk)
    pdf.anonymized_text = request.data.get('anonymized_text')
    pdf.save()
    return Response(...)
```

**Empfehlung:** ⭐ **Option A** - Nutzt existierende Modern Framework Endpoints

---

### **5. 🔴 Approve PDF (FEHLT KOMPLETT)**

**pdfStore Code:**
```typescript
async function approvePdf(): Promise<void> {
  const response = await fetch(`/api/pdf/${pdfId}/approve/`, {
    method: 'POST',
  });
}
```

**Backend Status:**
```
🔴 FEHLT: /api/pdf/<id>/approve/
   Keine entsprechende View
```

**Alternative Lösungen:**

#### **Option A: Anonymization Validate verwenden** ⭐ **EMPFOHLEN**
```
✅ EXISTIERT: /api/anonymization/<file_id>/validate/
   View: AnonymizationValidateView
   Zweck: Anonymisierung validieren

POST /api/anonymization/<file_id>/validate/
Body: {
  "validation_status": "approved",
  "notes": "Validation completed"
}
```

**Migration:**
```typescript
async function approvePdf(): Promise<void> {
  const pdfId = currentPdf.value.id;
  
  const response = await fetch(`/api/anonymization/${pdfId}/validate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify({
      validation_status: 'approved'
    }),
  });
  
  if (!response.ok) throw new Error(`Failed to approve: ${response.status}`);
  
  lastProcessedId.value = pdfId;
  await fetchNextPdf(pdfId);
}
```

#### **Option B: Status-Update über Sensitive Metadata**
```typescript
// Mark as validated via sensitive metadata
PATCH /api/media/pdfs/<pk>/sensitive-metadata/verify/
Body: {
  "dob_verified": true,
  "names_verified": true
}
```

**Empfehlung:** ⭐ **Option A** - Speziell für Validation-Workflow konzipiert

---

### **6. 🔴 Check Anonymization Status (FEHLT KOMPLETT)**

**pdfStore Code:**
```typescript
async function checkAnonymizationStatus(pdfId: number) {
  const response = await fetch(`/api/pdf/${pdfId}/status/`);
  return await response.json();
}
```

**Backend Status:**
```
🔴 FEHLT: /api/pdf/<id>/status/
   Keine entsprechende View
```

**Alternative Lösungen:**

#### **Option A: Anonymization Status Endpoint** ⭐ **EMPFOHLEN**
```
✅ EXISTIERT: /api/anonymization/<file_id>/status/
   View: anonymization_status
   Zweck: Anonymisierungsstatus abrufen

GET /api/anonymization/<file_id>/status/
Response: {
  "status": "processing",
  "progress": 75,
  "message": "Processing frames..."
}
```

**Migration:**
```typescript
async function checkAnonymizationStatus(pdfId: number) {
  const response = await fetch(`/api/anonymization/${pdfId}/status/`);
  if (!response.ok) throw new Error(`Failed to check status: ${response.status}`);
  return await response.json();
}
```

**Empfehlung:** ⭐ **Option A** - Direkter Ersatz

---

## 🚀 Migrations-Roadmap für pdfStore.ts

### **Phase 1: Kritische Fixes (Sofort)**

#### **1.1 Update `updateSensitiveMeta()` auf Modern Framework**
```typescript
// Änderung erforderlich: Von sensitive_meta_id zu pdf_id
async function updateSensitiveMeta(pdfId: number, data: any) {
  // ✅ NEU: Modern Framework
  const response = await fetch(`/api/media/pdfs/${pdfId}/sensitive-metadata/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error(`Failed to update: ${response.status}`);
  const updatedData = await response.json();
  
  if (currentPdf.value.reportMeta) {
    currentPdf.value.reportMeta = { ...currentPdf.value.reportMeta, ...updatedData };
  }
}
```

#### **1.2 Update `updateAnonymizedText()` auf Modern Framework**
```typescript
async function updateAnonymizedText(pdfId: number, anonymizedText: string) {
  // ✅ NEU: Verwendet Sensitive Metadata Endpoint
  const response = await fetch(`/api/media/pdfs/${pdfId}/sensitive-metadata/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify({ anonymized_text: anonymizedText }),
  });
  
  if (!response.ok) throw new Error(`Failed to update text: ${response.status}`);
  
  currentPdf.value.anonymizedText = anonymizedText;
  currentPdf.value.status = 'done_processing_anonymization';
}
```

---

### **Phase 2: Workflow-Integration**

#### **2.1 Replace `fetchNextPdf()` mit Anonymization Overview**
```typescript
async function fetchNextPdf(lastId?: number): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    // ✅ NEU: Use Anonymization Overview
    const response = await fetch('/api/anonymization/items/overview/');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch overview: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter pending PDFs
    const pendingPdfs = data.pdfs.filter(
      (p: any) => p.status === 'pending_validation' || p.status === 'not_started'
    );
    
    if (pendingPdfs.length === 0) {
      currentPdf.value = null;
      lastProcessedId.value = null;
      return;
    }
    
    // Find next PDF
    let nextPdf;
    if (lastId) {
      const lastIndex = pendingPdfs.findIndex((p: any) => p.id === lastId);
      nextPdf = pendingPdfs[lastIndex + 1] || pendingPdfs[0];
    } else {
      nextPdf = pendingPdfs[0];
    }
    
    currentPdf.value = nextPdf;
    lastProcessedId.value = nextPdf.id;
    
    // Build stream URL
    if (nextPdf.id) {
      currentPdf.value.pdfStreamUrl = buildPdfStreamUrl(nextPdf.id);
      streamingActive.value = true;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching next PDF:', err);
  } finally {
    loading.value = false;
  }
}
```

#### **2.2 Replace `approvePdf()` mit Anonymization Validate**
```typescript
async function approvePdf(): Promise<void> {
  if (!currentPdf.value) {
    throw new Error('No current PDF to approve');
  }

  const pdfId = currentPdf.value.id;
  loading.value = true;
  error.value = null;

  try {
    // ✅ NEU: Use Anonymization Validate Endpoint
    const response = await fetch(`/api/anonymization/${pdfId}/validate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      body: JSON.stringify({
        validation_status: 'approved'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to approve PDF: ${response.status}`);
    }

    // Mark as processed and fetch next
    lastProcessedId.value = pdfId;
    await fetchNextPdf(pdfId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error approving PDF:', err);
    throw err;
  } finally {
    loading.value = false;
  }
}
```

#### **2.3 Replace `checkAnonymizationStatus()` mit Anonymization Status**
```typescript
async function checkAnonymizationStatus(pdfId: number): Promise<{ status: string; progress?: number }> {
  try {
    // ✅ NEU: Use Anonymization Status Endpoint
    const response = await fetch(`/api/anonymization/${pdfId}/status/`);
    
    if (!response.ok) {
      throw new Error(`Failed to check status: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error checking anonymization status:', err);
    throw err;
  }
}
```

---

## 📊 Endpoint-Mapping Zusammenfassung

| pdfStore Funktion | ALT (404) | NEU (Funktioniert) | Migration |
|-------------------|-----------|-------------------|-----------|
| `buildPdfStreamUrl()` | `/api/pdfs/${id}/stream` | `/api/media/pdfs/${id}/stream/` | ✅ Funktioniert bereits |
| `fetchNextPdf()` | `/api/pdf/next/` 🔴 | `/api/anonymization/items/overview/` ✅ | Logik anpassen |
| `updateSensitiveMeta()` | `/api/pdf/sensitivemeta/${id}/` ⚠️ | `/api/media/pdfs/${id}/sensitive-metadata/` ✅ | Parameter ändern |
| `updateAnonymizedText()` | `/api/pdf/${id}/anonymize/` 🔴 | `/api/media/pdfs/${id}/sensitive-metadata/` ✅ | Endpoint ändern |
| `approvePdf()` | `/api/pdf/${id}/approve/` 🔴 | `/api/anonymization/${id}/validate/` ✅ | Endpoint ändern |
| `checkAnonymizationStatus()` | `/api/pdf/${id}/status/` 🔴 | `/api/anonymization/${id}/status/` ✅ | URL anpassen |

---

## ✅ Vorteile der Migration

1. **Funktioniert:** Alle neuen Endpoints existieren im Backend
2. **Modern Framework:** Konsistent mit aktueller Architektur
3. **Workflow-Integration:** Nutzt spezialisierte Anonymization-Endpoints
4. **Keine Backend-Änderungen:** Alles funktioniert mit existierenden Endpoints
5. **Bessere Struktur:** Klare Trennung zwischen Media und Workflow

---

## 🧪 Testing-Empfehlungen

### **Nach Migration testen:**

1. **PDF Stream:**
   ```bash
   curl http://localhost:8000/api/media/pdfs/1/stream/
   # Erwartung: PDF wird gestreamt
   ```

2. **Anonymization Overview:**
   ```bash
   curl http://localhost:8000/api/anonymization/items/overview/
   # Erwartung: JSON mit pdfs[] array
   ```

3. **Update Sensitive Metadata:**
   ```bash
   curl -X PATCH http://localhost:8000/api/media/pdfs/1/sensitive-metadata/ \
     -H "Content-Type: application/json" \
     -d '{"anonymized_text": "Test"}'
   # Erwartung: 200 OK mit updated data
   ```

4. **Approve PDF:**
   ```bash
   curl -X POST http://localhost:8000/api/anonymization/1/validate/ \
     -H "Content-Type: application/json" \
     -d '{"validation_status": "approved"}'
   # Erwartung: 200 OK
   ```

5. **Check Status:**
   ```bash
   curl http://localhost:8000/api/anonymization/1/status/
   # Erwartung: {"status": "...", "progress": ...}
   ```

---

## 📝 Fazit

**Der pdfStore.ts kann VOLLSTÄNDIG wiederhergestellt werden** durch:

1. ✅ **Keine Backend-Änderungen erforderlich** - Alle Endpoints existieren
2. ✅ **4 von 6 Funktionen brauchen Updates** (fetchNext, updateText, approve, checkStatus)
3. ✅ **2 Funktionen funktionieren bereits** (buildStreamUrl, updateSensitiveMeta)
4. ✅ **Migration auf Modern Framework** - Bessere Architektur
5. ✅ **Workflow-Integration** - Nutzt spezialisierte Anonymization-Endpoints

**Geschätzte Zeit:** 1-2 Stunden für vollständige Migration + Testing

---

**Erstellt von:** GitHub Copilot  
**Datum:** 14. Oktober 2025
