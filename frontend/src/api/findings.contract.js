const asRecord = (input) => input && typeof input === 'object' ? input : {};
const readKey = (input, camel, snake) => {
    const camelValue = input[camel];
    if (camelValue !== undefined)
        return camelValue;
    return input[snake];
};
const asString = (value) => (typeof value === 'string' ? value : undefined);
const asNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return undefined;
};
const asBoolean = (value) => typeof value === 'boolean' ? value : undefined;
const asStringArray = (value) => {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => asString(entry)?.trim())
        .filter((entry) => Boolean(entry));
};
const asJsonMap = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return value;
};
export const normalizeFindingChoice = (input) => {
    const source = asRecord(input);
    return {
        id: asNumber(readKey(source, 'id', 'id')) ?? 0,
        name: asString(readKey(source, 'name', 'name')) ?? 'unknown',
        nameDe: asString(readKey(source, 'nameDe', 'name_de')),
        description: asString(readKey(source, 'description', 'description')),
        subcategories: asJsonMap(readKey(source, 'subcategories', 'subcategories')),
        numericalDescriptors: asJsonMap(readKey(source, 'numericalDescriptors', 'numerical_descriptors'))
    };
};
export const normalizeFindingClassification = (input) => {
    const source = asRecord(input);
    const choicesRaw = readKey(source, 'choices', 'choices');
    return {
        id: asNumber(readKey(source, 'id', 'id')) ?? 0,
        name: asString(readKey(source, 'name', 'name')) ?? 'unknown',
        nameDe: asString(readKey(source, 'nameDe', 'name_de')),
        description: asString(readKey(source, 'description', 'description')),
        required: asBoolean(readKey(source, 'required', 'required')) ?? false,
        classificationTypes: asStringArray(readKey(source, 'classificationTypes', 'classification_types')),
        choices: Array.isArray(choicesRaw) ? choicesRaw.map(normalizeFindingChoice) : []
    };
};
const normalizeFindingClassificationList = (input) => {
    if (!Array.isArray(input))
        return [];
    return input
        .map(normalizeFindingClassification)
        .filter((classification) => Number.isFinite(classification.id) && classification.id > 0);
};
export const mergeFindingClassifications = (finding) => {
    if (!finding)
        return [];
    const merged = [
        ...(Array.isArray(finding.classifications) ? finding.classifications : []),
        ...(Array.isArray(finding.locationClassifications) ? finding.locationClassifications : []),
        ...(Array.isArray(finding.morphologyClassifications) ? finding.morphologyClassifications : []),
        ...(Array.isArray(finding.FindingClassifications) ? finding.FindingClassifications : [])
    ];
    const byId = new Map();
    for (const classification of merged) {
        if (!Number.isFinite(classification.id) || classification.id <= 0)
            continue;
        if (!byId.has(classification.id))
            byId.set(classification.id, classification);
    }
    return Array.from(byId.values());
};
export const normalizeFinding = (input) => {
    const source = asRecord(input);
    const classifications = normalizeFindingClassificationList(readKey(source, 'classifications', 'classifications'));
    const locationClassifications = normalizeFindingClassificationList(readKey(source, 'locationClassifications', 'location_classifications'));
    const morphologyClassifications = normalizeFindingClassificationList(readKey(source, 'morphologyClassifications', 'morphology_classifications'));
    const legacyFindingClassifications = normalizeFindingClassificationList(readKey(source, 'FindingClassifications', 'FindingClassifications'));
    const finding = {
        id: asNumber(readKey(source, 'id', 'id')) ?? 0,
        name: asString(readKey(source, 'name', 'name')) ?? 'unknown',
        nameDe: asString(readKey(source, 'nameDe', 'name_de')),
        description: asString(readKey(source, 'description', 'description')) ?? '',
        examinations: asStringArray(readKey(source, 'examinations', 'examinations')),
        patientExaminationId: asNumber(readKey(source, 'patientExaminationId', 'patient_examination_id') ??
            readKey(source, 'PatientExaminationId', 'PatientExaminationId')),
        classifications,
        locationClassifications,
        morphologyClassifications,
        FindingClassifications: legacyFindingClassifications.length
            ? legacyFindingClassifications
            : classifications,
        findingTypes: asStringArray(readKey(source, 'findingTypes', 'finding_types')),
        findingInterventions: asStringArray(readKey(source, 'findingInterventions', 'finding_interventions'))
    };
    if (finding.FindingClassifications.length === 0) {
        finding.FindingClassifications = mergeFindingClassifications(finding);
    }
    return finding;
};
export const normalizeFindings = (input) => {
    const rows = Array.isArray(input?.results)
        ? (input.results)
        : Array.isArray(input)
            ? input
            : [];
    return rows
        .map(normalizeFinding)
        .filter((finding) => Number.isFinite(finding.id) && finding.id > 0);
};
export const normalizePatientFindingClassification = (input) => {
    const source = asRecord(input);
    return {
        id: asNumber(readKey(source, 'id', 'id')) ?? 0,
        classification: asNumber(readKey(source, 'classification', 'classification')) ?? 0,
        classificationChoice: asNumber(readKey(source, 'classificationChoice', 'classification_choice')) ?? 0,
        classificationName: asString(readKey(source, 'classificationName', 'classification_name')),
        classificationChoiceName: asString(readKey(source, 'classificationChoiceName', 'classification_choice_name')),
        subcategories: asJsonMap(readKey(source, 'subcategories', 'subcategories')),
        numericalDescriptors: asJsonMap(readKey(source, 'numericalDescriptors', 'numerical_descriptors')),
        isActive: asBoolean(readKey(source, 'isActive', 'is_active')) ?? true
    };
};
export const normalizePatientFindingRow = (input) => {
    const source = asRecord(input);
    const rawClassifications = readKey(source, 'classifications', 'classifications');
    const findingId = asNumber(readKey(source, 'finding', 'finding'));
    const nestedFinding = asRecord(readKey(source, 'finding', 'finding'));
    return {
        id: asNumber(readKey(source, 'id', 'id')) ?? 0,
        patientExamination: asNumber(readKey(source, 'patientExamination', 'patient_examination')) ?? 0,
        finding: findingId !== undefined
            ? findingId
            : { id: asNumber(readKey(nestedFinding, 'id', 'id')) ?? 0 },
        isActive: asBoolean(readKey(source, 'isActive', 'is_active')) ?? true,
        createdAt: asString(readKey(source, 'createdAt', 'created_at')),
        updatedAt: asString(readKey(source, 'updatedAt', 'updated_at')),
        classifications: Array.isArray(rawClassifications)
            ? rawClassifications.map(normalizePatientFindingClassification)
            : []
    };
};
export const normalizePatientFindingRows = (input) => {
    const rows = Array.isArray(input?.results)
        ? (input.results)
        : Array.isArray(input)
            ? input
            : [];
    return rows
        .map(normalizePatientFindingRow)
        .filter((row) => Number.isFinite(row.id) && row.id > 0);
};
export const getFindingDisplayName = (finding) => finding?.nameDe || finding?.name || `Finding ${finding?.id ?? 'unknown'}`;
export const getClassificationDisplayName = (classification) => classification?.nameDe || classification?.name || 'unknown';
export const extractFindingId = (value) => {
    const directId = asNumber(value);
    if (directId !== undefined)
        return directId;
    const source = asRecord(value);
    const nestedId = asNumber(readKey(source, 'id', 'id'));
    return nestedId ?? null;
};
