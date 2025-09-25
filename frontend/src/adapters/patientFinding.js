export function adaptPatientClassification(raw, defaultFinding) {
    // Fallback: nested classification aus *_id bauen
    const classification = raw.classification ??
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
export function adaptPatientClassifications(arr, defaultFinding) {
    if (!Array.isArray(arr)) {
        console.warn('🚨 [PatientFinding Adapter] Input is not an array:', arr);
        return [];
    }
    const results = arr
        .map(item => adaptPatientClassification(item, defaultFinding))
        .filter((x) => x !== null);
    console.log('📋 [PatientFinding Adapter] Processed classifications:', {
        input: arr.length,
        output: results.length,
        filtered: arr.length - results.length
    });
    return results;
}
