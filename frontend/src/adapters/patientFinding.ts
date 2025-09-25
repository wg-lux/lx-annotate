// adapters/patientFinding.ts
export type RawPatientClassification = {
  id: number;
  finding?: number; // Make optional for flexibility
  classification?: { id: number; name: string; description?: string; required?: boolean } | null;
  classification_id?: number; // alternative API form
  classification_choice?: { id: number; name: string } | null;
  choice?: { id: number; name: string } | null; // alternative field name
  is_active?: boolean;
  subcategories?: Record<string, unknown> | null;
  numerical_descriptors?: Record<string, unknown> | null;
};

export type SafePatientClassification = {
  id: number;
  finding: number;
  classification: { id: number; name: string; description?: string; required?: boolean };
  choice: { id: number; name: string };
  is_active: boolean;
  subcategories: Record<string, unknown>;
  numerical_descriptors: Record<string, unknown>;
};

export function adaptPatientClassification(raw: RawPatientClassification, defaultFinding?: number): SafePatientClassification | null {
  // Fallback: nested classification aus *_id bauen
  const classification =
    raw.classification ??
    (raw.classification_id != null ? { id: raw.classification_id, name: String(raw.classification_id) } : null);

  // Support for both choice and classification_choice field names  
  const choice = raw.classification_choice ?? raw.choice;

  if (!classification || !choice) {
    console.warn('🚨 [PatientFinding Adapter] Invalid classification data:', {
      id: raw.id,
      hasClassification: !!raw.classification,
      hasClassificationChoice: !!raw.classification_choice,
      hasChoice: !!raw.choice,
      classificationId: raw.classification_id
    });
    return null;
  }

  const finding = raw.finding ?? defaultFinding;
  if (finding === undefined) {
    console.warn('🚨 [PatientFinding Adapter] Missing finding ID:', raw);
    return null;
  }

  return {
    id: raw.id,
    finding,
    classification,
    choice,
    is_active: raw.is_active ?? true,
    subcategories: raw.subcategories ?? {},
    numerical_descriptors: raw.numerical_descriptors ?? {},
  };
}

export function adaptPatientClassifications(arr: RawPatientClassification[], defaultFinding?: number): SafePatientClassification[] {
  if (!Array.isArray(arr)) {
    console.warn('🚨 [PatientFinding Adapter] Input is not an array:', arr);
    return [];
  }
  
  const results = arr
    .map(item => adaptPatientClassification(item, defaultFinding))
    .filter((x): x is SafePatientClassification => x !== null);
  
  console.log('📋 [PatientFinding Adapter] Processed classifications:', {
    input: arr.length,
    output: results.length,
    filtered: arr.length - results.length
  });
  
  return results;
}
