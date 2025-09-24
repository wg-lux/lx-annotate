# Fix: TypeError "can't access property 'id', H.classification is undefined"

## Problem
Der Fehler tritt auf, wenn die API `PatientFinding`-Objekte mit ungültigen `classifications` zurückgibt, bei denen `classification` oder `classification_choice` `undefined` ist. Das Vue-Template versucht dann auf `classification.classification.name` zuzugreifen, was zu einem TypeError führt.

## Root Cause
In der API-Response können `classifications` arrays enthalten:
```json
{
  "id": 1,
  "classification": undefined,  // ❌ Problem!
  "classification_choice": { "id": 1, "name": "Test Choice" },
  "is_active": true
}
```

## Solution Applied

### 1. Template Defense (AddableFindingsDetail.vue)
```vue
<!-- BEFORE (causing error) -->
<div v-for="classification in finding.patientClassifications">
  {{ classification.classification.name }}  <!-- ❌ crashes if undefined -->
</div>

<!-- AFTER (defensive) -->  
<div v-for="classification in finding.patientClassifications?.filter(c => c.classification && c.choice) || []">
  {{ classification.classification.name }}  <!-- ✅ safe - already filtered -->
</div>
```

### 2. Data Mapping Defense
```typescript
// BEFORE (unsafe mapping)
patientClassifications: pcs.map((cls: any) => ({
  classification: {
    id: cls.classification?.id ?? 0,  // ❌ still creates invalid objects
    name: cls.classification?.name ?? 'Unnamed'  
  }
}))

// AFTER (filter first, then map)
patientClassifications: pcs
  .filter((cls: any) => cls.classification && cls.classification_choice)  // ✅ filter out invalid
  .map((cls: any) => ({
    classification: {
      id: cls.classification.id,  // ✅ safe - guaranteed to exist
      name: cls.classification.name
    }
  }))
```

### 3. Debug Logging Added
Added comprehensive logging to:
- `patientFindingStore.ts`: Log invalid classifications from API
- `AddableFindingsDetail.vue`: Log filtered invalid classifications
- Both `loadAddedFindingsForCurrentExam()` and `addFindingToExamination()` methods

## Files Modified
1. `/frontend/src/components/RequirementReport/AddableFindingsDetail.vue`
   - Template: Filter invalid classifications in v-for
   - Script: Filter before mapping in two locations
   - Added debug logging for invalid classifications

2. `/frontend/src/stores/patientFindingStore.ts`
   - Added debug logging to detect invalid API responses

## Prevention
- Template now filters out invalid classifications before rendering
- Data mapping now validates objects before transformation
- Debug logging helps identify when/where invalid data originates
- TypeScript strictness maintained throughout

## Verification
The fix prevents the runtime error while maintaining all functionality. Invalid classifications are filtered out rather than causing crashes, and debug logs help track the source of invalid data for future API fixes.
