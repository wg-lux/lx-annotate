import axiosInstance, { dtypesApi } from '@/api/axiosInstance';
const readKey = (input, camel, snake) => {
    const value = input[camel];
    if (value !== undefined)
        return value;
    return input[snake];
};
const asRecord = (input) => input && typeof input === 'object' ? input : {};
const asString = (value) => (typeof value === 'string' ? value : undefined);
const asNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return undefined;
};
const asBoolean = (value) => (typeof value === 'boolean' ? value : undefined);
const asStringArray = (value) => {
    if (Array.isArray(value)) {
        return value.filter((entry) => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
    return [];
};
const asStringRecord = (value) => {
    const rec = asRecord(value);
    const out = {};
    for (const [key, entry] of Object.entries(rec)) {
        if (typeof entry === 'string')
            out[key] = entry;
    }
    return out;
};
const asStringNumberRecord = (value) => {
    const rec = asRecord(value);
    const out = {};
    for (const [key, entry] of Object.entries(rec)) {
        if (typeof entry === 'string' || typeof entry === 'number')
            out[key] = entry;
    }
    return out;
};
const asNumberRecord = (value) => {
    const rec = asRecord(value);
    const out = {};
    for (const [key, entry] of Object.entries(rec)) {
        const n = asNumber(entry);
        if (n !== undefined)
            out[key] = n;
    }
    return out;
};
const normalizeBase = (raw) => {
    const source = asRecord(raw);
    const name = asString(readKey(source, 'name', 'name')) ?? 'unknown';
    const nameDe = asString(readKey(source, 'nameDe', 'name_de'));
    const nameEn = asString(readKey(source, 'nameEn', 'name_en'));
    return {
        id: asNumber(readKey(source, 'id', 'id')),
        name,
        nameDe,
        nameEn,
        description: asString(readKey(source, 'description', 'description')),
        uuid: asString(readKey(source, 'uuid', 'uuid')),
        tags: asStringArray(readKey(source, 'tags', 'tags')),
        kbModuleName: asString(readKey(source, 'kbModuleName', 'kb_module_name')),
        displayName: nameDe ?? nameEn ?? name
    };
};
const normalizeClassification = (raw) => {
    const source = asRecord(raw);
    return {
        ...normalizeBase(source),
        classificationChoices: asStringArray(readKey(source, 'classificationChoices', 'classification_choices')),
        classificationTypes: asStringArray(readKey(source, 'classificationTypes', 'classification_types'))
    };
};
const normalizeClassificationChoice = (raw) => {
    const source = asRecord(raw);
    return {
        ...normalizeBase(source),
        classificationChoiceDescriptors: asStringArray(readKey(source, 'classificationChoiceDescriptors', 'classification_choice_descriptors'))
    };
};
const normalizeClassificationChoiceDescriptor = (raw) => {
    const source = asRecord(raw);
    return {
        ...normalizeBase(source),
        classificationChoiceDescriptorType: asString(readKey(source, 'classificationChoiceDescriptorType', 'classification_choice_descriptor_type')),
        unit: asString(readKey(source, 'unit', 'unit')),
        numericMin: asNumber(readKey(source, 'numericMin', 'numeric_min')),
        numericMax: asNumber(readKey(source, 'numericMax', 'numeric_max')),
        numericDistribution: asString(readKey(source, 'numericDistribution', 'numeric_distribution')),
        numericDistributionParams: asStringNumberRecord(readKey(source, 'numericDistributionParams', 'numeric_distribution_params')),
        textMaxLength: asNumber(readKey(source, 'textMaxLength', 'text_max_length')),
        defaultValueStr: asString(readKey(source, 'defaultValueStr', 'default_value_str')),
        defaultValueNum: asNumber(readKey(source, 'defaultValueNum', 'default_value_num')),
        defaultValueBool: asBoolean(readKey(source, 'defaultValueBool', 'default_value_bool')),
        selectionOptions: asStringArray(readKey(source, 'selectionOptions', 'selection_options')),
        selectionMultiple: asBoolean(readKey(source, 'selectionMultiple', 'selection_multiple')),
        selectionMultipleNMin: asNumber(readKey(source, 'selectionMultipleNMin', 'selection_multiple_n_min')),
        selectionMultipleNMax: asNumber(readKey(source, 'selectionMultipleNMax', 'selection_multiple_n_max')),
        selectionDefaultOptions: asNumberRecord(readKey(source, 'selectionDefaultOptions', 'selection_default_options'))
    };
};
const normalizeExamination = (raw) => {
    const source = asRecord(raw);
    return {
        ...normalizeBase(source),
        findings: asStringArray(readKey(source, 'findings', 'findings')),
        examinationTypes: asStringArray(readKey(source, 'examinationTypes', 'examination_types')),
        indications: asStringArray(readKey(source, 'indications', 'indications'))
    };
};
const normalizeFinding = (raw) => {
    const source = asRecord(raw);
    return {
        ...normalizeBase(source),
        findingTypes: asStringArray(readKey(source, 'findingTypes', 'finding_types')),
        classifications: asStringArray(readKey(source, 'classifications', 'classifications')),
        interventions: asStringArray(readKey(source, 'interventions', 'interventions'))
    };
};
const normalizeFindingType = (raw) => ({ ...normalizeBase(raw) });
const normalizeIndication = (raw) => {
    const source = asRecord(raw);
    return {
        ...normalizeBase(source),
        indicationTypes: asStringArray(readKey(source, 'indicationTypes', 'indication_types')),
        interventions: asStringArray(readKey(source, 'interventions', 'interventions'))
    };
};
const normalizeIndicationType = (raw) => ({ ...normalizeBase(raw) });
const normalizeIntervention = (raw) => {
    const source = asRecord(raw);
    return {
        ...normalizeBase(source),
        interventionTypes: asStringArray(readKey(source, 'interventionTypes', 'intervention_types'))
    };
};
const normalizeInterventionType = (raw) => ({ ...normalizeBase(raw) });
const normalizeUnit = (raw) => {
    const source = asRecord(raw);
    return {
        ...normalizeBase(source),
        abbreviation: asString(readKey(source, 'abbreviation', 'abbreviation')),
        unitTypes: asStringArray(readKey(source, 'unitTypes', 'unit_types'))
    };
};
const normalizeUnitType = (raw) => ({ ...normalizeBase(raw) });
const normalizeInformationSource = (raw) => {
    const source = asRecord(raw);
    return {
        ...normalizeBase(source),
        informationSourceTypes: asStringArray(readKey(source, 'informationSourceTypes', 'information_source_types'))
    };
};
const normalizeInformationSourceType = (raw) => ({
    ...normalizeBase(raw)
});
const normalizeCitation = (raw) => {
    const source = asRecord(raw);
    return {
        ...normalizeBase(source),
        citationKey: asString(readKey(source, 'citationKey', 'citation_key')) ?? 'unknown',
        title: asString(readKey(source, 'title', 'title')) ?? 'unknown',
        abstract: asString(readKey(source, 'abstract', 'abstract')),
        authors: asStringArray(readKey(source, 'authors', 'authors')),
        publicationYear: asNumber(readKey(source, 'publicationYear', 'publication_year')),
        publicationMonth: asString(readKey(source, 'publicationMonth', 'publication_month')),
        journal: asString(readKey(source, 'journal', 'journal')),
        publisher: asString(readKey(source, 'publisher', 'publisher')),
        volume: asString(readKey(source, 'volume', 'volume')),
        issue: asString(readKey(source, 'issue', 'issue')),
        pages: asString(readKey(source, 'pages', 'pages')),
        doi: asString(readKey(source, 'doi', 'doi')),
        url: asString(readKey(source, 'url', 'url')),
        entryType: asString(readKey(source, 'entryType', 'entry_type')),
        language: asString(readKey(source, 'language', 'language')),
        keywords: asStringArray(readKey(source, 'keywords', 'keywords')),
        identifiers: asStringRecord(readKey(source, 'identifiers', 'identifiers'))
    };
};
const asArray = (value) => (Array.isArray(value) ? value : []);
export const normalizeCoreConceptCollection = (raw) => {
    const source = asRecord(raw);
    return {
        moduleName: asString(readKey(source, 'moduleName', 'module_name')) ||
            asString(readKey(source, 'module', 'module')) ||
            'unknown',
        classification: asArray(readKey(source, 'classification', 'classification')).map(normalizeClassification),
        classificationChoice: asArray(readKey(source, 'classificationChoice', 'classification_choice')).map(normalizeClassificationChoice),
        classificationChoiceDescriptor: asArray(readKey(source, 'classificationChoiceDescriptor', 'classification_choice_descriptor')).map(normalizeClassificationChoiceDescriptor),
        examination: asArray(readKey(source, 'examination', 'examination')).map(normalizeExamination),
        finding: asArray(readKey(source, 'finding', 'finding')).map(normalizeFinding),
        findingType: asArray(readKey(source, 'findingType', 'finding_type')).map(normalizeFindingType),
        indication: asArray(readKey(source, 'indication', 'indication')).map(normalizeIndication),
        indicationType: asArray(readKey(source, 'indicationType', 'indication_type')).map(normalizeIndicationType),
        intervention: asArray(readKey(source, 'intervention', 'intervention')).map(normalizeIntervention),
        interventionType: asArray(readKey(source, 'interventionType', 'intervention_type')).map(normalizeInterventionType),
        unit: asArray(readKey(source, 'unit', 'unit')).map(normalizeUnit),
        unitType: asArray(readKey(source, 'unitType', 'unit_type')).map(normalizeUnitType),
        informationSource: asArray(readKey(source, 'informationSource', 'information_source')).map(normalizeInformationSource),
        informationSourceType: asArray(readKey(source, 'informationSourceType', 'information_source_type')).map(normalizeInformationSourceType),
        citation: asArray(readKey(source, 'citation', 'citation')).map(normalizeCitation)
    };
};
export const fetchCoreConcepts = async (moduleName) => {
    const response = await axiosInstance.get(dtypesApi(`core-concepts/${moduleName}`));
    return normalizeCoreConceptCollection(response.data);
};
