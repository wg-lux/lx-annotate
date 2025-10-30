# Patient Classifications & Requirement Issues Implementation

## 📋 Übersicht

Diese Implementierung behebt zwei kritische Probleme:

1. **Fehlende Patient-Klassifikationen** in den "Hinzugefügte Befunde" Karten
2. **Fehlendes Requirement Issues System** für die Anzeige von Backend-Problemen

## 🔧 Implementierte Änderungen

### A) PatientFinding Store - Korrekte Datentrennung

**Problem:** Der PatientFinding Store hat die patient-side Klassifikationen mit den definition-side Klassifikationen überschrieben.

**Lösung:**
- ✅ `PatientFinding` Interface erweitert um `available_classifications` (Definitionen)
- ✅ `classifications` bleibt für Patient-Selections reserviert
- ✅ Type Guards hinzugefügt: `isValidPatientClassification()`, `filterValidPatientClassifications()`
- ✅ `fetchPatientFindings()` trennt korrekt Patient- und Definitions-Daten

**Änderungen:**
```typescript
// stores/patientFindingStore.ts - Zeilen 42-56
function isValidPatientClassification(x: any): x is PatientFindingClassification
function filterValidPatientClassifications(arr?: PatientFindingClassification[]): PatientFindingClassification[]

// Zeilen 120-130: Korrekte Datentrennung
return {
  ...pf,
  classifications: filterValidPatientClassifications(pf.classifications), // Patient-Selections
  available_classifications: defClassifications // Definitionen
};
```

### B) AddableFindingsDetail - Vereinfachte Patient-Klassifikationen

**Problem:** Komplizierte Logik für die Transformation von Patient-Klassifikationen führte zu leeren Anzeigen.

**Lösung:**
- ✅ Direkter Zugriff auf sanitized `pf.classifications` (Patient-side)
- ✅ `safeMapPatientClassifications()` für sichere Transformation
- ✅ Entfernung der komplexen Shape-Detection Logik

**Änderungen:**
```typescript
// AddableFindingsDetail.vue - Zeilen 625-650
const patientClassifications = safeMapPatientClassifications(
  Array.from(pf.classifications || []),
  (cls: any) => ({
    id: cls.id,
    classification: {
      id: cls.classification.id,
      name: cls.classification.name ?? 'Unnamed Classification'
    },
    choice: {
      id: cls.classification_choice.id,
      name: cls.classification_choice.name ?? 'Unknown Choice'
    },
    is_active: cls.is_active ?? true
  }),
  correspondingFinding.id
);
```

### C) Requirement Store - Issues Management System

**Problem:** Backend Issues wurden nie verarbeitet oder angezeigt.

**Lösung:**
- ✅ `RequirementIssue` Interface definiert
- ✅ `issuesBySet` und `issuesGlobal` State hinzugefügt  
- ✅ `ingestIssues()` Funktion für Issue-Normalisierung
- ✅ Helper-Funktionen: `getIssuesForSet()`, `getSeverityCounts()`
- ✅ Integration in alle Evaluation-Funktionen

**Änderungen:**
```typescript
// stores/requirementStore.ts - Zeilen 45-55
export interface RequirementIssue {
    id?: number;
    set_id?: number;
    requirement_name?: string;
    code?: string;
    message: string;
    severity?: 'info' | 'warning' | 'error';
    finding_id?: number;
    extra?: Record<string, any>;
}

// Zeilen 495-520: Issues Normalization
const ingestIssues = (payload: any) => {
    const raw = payload?.requirementIssues || payload?.requirement_issues || payload?.issues || [];
    const normalizedIssues: RequirementIssue[] = Array.isArray(raw) 
        ? raw.map((i: any) => ({
            id: i.id,
            set_id: i.set_id ?? i.requirement_set_id,
            message: i.message ?? i.detail ?? String(i),
            severity: i.severity ?? 'warning'
        }))
        : [];
    // ... Partitionierung nach Sets
};
```

### D) RequirementGenerator UI - Issues Anzeige

**Problem:** Keine UI für die Anzeige von Requirement Issues.

**Lösung:**
- ✅ Issues Badges pro Requirement Set (Info/Warning/Error Counts)
- ✅ Kollabierbare Issues-Details mit Severity-Icons
- ✅ Integration in `fetchLookupAll()`, `triggerRecompute()` und Evaluation-Funktionen
- ✅ UI State Management für Issue-Visibility

**Änderungen:**
```vue
<!-- RequirementGenerator.vue - Template Issues Badges -->
<template v-if="getSetIssuesCount(rs.id).total > 0">
  <span v-if="getSetIssuesCount(rs.id).error > 0" class="badge bg-danger">
    {{ getSetIssuesCount(rs.id).error }} <i class="fas fa-times-circle"></i>
  </span>
  <span v-if="getSetIssuesCount(rs.id).warning > 0" class="badge bg-warning">
    {{ getSetIssuesCount(rs.id).warning }} <i class="fas fa-exclamation-triangle"></i>
  </span>
</template>

<!-- Kollabierbare Issues-Details -->
<div v-if="showIssuesForSet.has(rs.id)" class="card border-warning">
  <div v-for="issue in getIssuesForSet(rs.id)" class="mb-2">
    <i class="fas" :class="{ 'fa-times-circle text-danger': issue.severity === 'error' }"></i>
    <div class="fw-semibold">{{ issue.requirement_name }}</div>
    <div class="small">{{ issue.message }}</div>
  </div>
</div>
```

```typescript
// Script - Issues Management Functions
const getSetIssuesCount = (setId: number) => {
  const counts = requirementStore.getSeverityCounts(setId);
  return { ...counts, total: counts.info + counts.warning + counts.error };
};

const toggleIssuesForSet = (setId: number) => {
  const newSet = new Set(showIssuesForSet.value);
  if (newSet.has(setId)) { newSet.delete(setId); } else { newSet.add(setId); }
  showIssuesForSet.value = newSet;
};
```

## ✅ Acceptance Criteria Erfüllt

### 1. Patient-Klassifikationen in "Hinzugefügte Befunde" ✅
- Grüne Karten zeigen korrekt "Klassifikationen (N)" mit Name: Choice Chips
- Inactive Classifications zeigen ⚠️ Icon
- Debug "Processed addedFindings" zeigt populated `patientClassifications`

### 2. Requirement Issues System ✅  
- Requirement Set Liste zeigt Severity Badges (Error/Warning/Info counts)
- Kollabierbare Issue-Details mit Nachrichten und Severity-Icons
- "Keine Probleme" bei leeren Issues
- Issues werden von Backend Evaluation/Lookup Responses verarbeitet

### 3. Keine Regressionen ✅
- "Verfügbare Befunde" Panel zeigt weiterhin Definitions-Klassifikationen korrekt
- Keine 400er Errors durch UI-Änderungen
- Existing Alert-Bereich funktioniert weiterhin

### 4. Code Quality ✅
- TypeScript kompiliert ohne Errors
- Defensive Programmierung mit Optional Chaining
- Pinia State wird nicht in-place mutiert
- Comprehensive Logging für Debugging

## 🔍 Usage

### Patient-Klassifikationen
```typescript
// Zugriff auf Patient-Selections (bereits ausgewählt)
patientFinding.classifications // PatientFindingClassification[]

// Zugriff auf verfügbare Definitionen  
patientFinding.available_classifications // FindingClassification[]
```

### Requirement Issues
```typescript
// Issues für ein spezifisches Set
const issues = requirementStore.getIssuesForSet(setId);

// Severity Counts
const counts = requirementStore.getSeverityCounts(setId);
// { info: 2, warning: 3, error: 1 }

// Alle Issues
const allIssues = requirementStore.getAllIssues();
```

### Backend Integration
Issues werden automatisch aus folgenden API Responses verarbeitet:
- `/api/lookup/{token}/all/` → `requirementIssues` oder `issues` 
- `/api/evaluate-requirements/` → Response `issues` field
- `/api/lookup/{token}/recompute/` → Response `issues` field

## 🎯 Ergebnis

Das System zeigt nun korrekt:
1. **Patient-Klassifikationen** in hinzugefügten Befunden mit Name: Choice Format
2. **Requirement Issues** als farbkodierte Badges und detaillierte Nachrichten
3. **Vollständige Integration** mit Backend Evaluation und Lookup Responses

Beide Probleme wurden mit defensive Programming, Type Safety und comprehensive Logging gelöst.
