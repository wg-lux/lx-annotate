export type CoreConceptName = 'classification' | 'classificationChoice' | 'classificationChoiceDescriptor' | 'examination' | 'finding' | 'findingType' | 'indication' | 'indicationType' | 'intervention' | 'interventionType' | 'unit' | 'unitType' | 'informationSource' | 'informationSourceType' | 'citation';
export interface CoreConceptTransportBase {
    id?: number;
    name: string;
    name_de?: string;
    name_en?: string;
    description?: string;
    uuid?: string;
    tags?: string[] | string;
    kb_module_name?: string;
}
export interface CoreConceptBase {
    id?: number;
    name: string;
    nameDe?: string;
    nameEn?: string;
    description?: string;
    uuid?: string;
    tags: string[];
    kbModuleName?: string;
    displayName?: string;
}
export interface ClassificationCoreDto extends CoreConceptTransportBase {
    classification_choices?: string[] | string;
    classification_types?: string[] | string;
}
export interface ClassificationCore extends CoreConceptBase {
    classificationChoices: string[];
    classificationTypes: string[];
}
export interface ClassificationChoiceCoreDto extends CoreConceptTransportBase {
    classification_choice_descriptors?: string[] | string;
}
export interface ClassificationChoiceCore extends CoreConceptBase {
    classificationChoiceDescriptors: string[];
}
export interface ClassificationChoiceDescriptorCoreDto extends CoreConceptTransportBase {
    classification_choice_descriptor_type?: string;
    unit?: string;
    numeric_min?: number;
    numeric_max?: number;
    numeric_distribution?: string;
    numeric_distribution_params?: Record<string, string | number>;
    text_max_length?: number;
    default_value_str?: string;
    default_value_num?: number;
    default_value_bool?: boolean;
    selection_options?: string[] | string;
    selection_multiple?: boolean;
    selection_multiple_n_min?: number;
    selection_multiple_n_max?: number;
    selection_default_options?: Record<string, number>;
}
export interface ClassificationChoiceDescriptorCore extends CoreConceptBase {
    classificationChoiceDescriptorType?: string;
    unit?: string;
    numericMin?: number;
    numericMax?: number;
    numericDistribution?: string;
    numericDistributionParams: Record<string, string | number>;
    textMaxLength?: number;
    defaultValueStr?: string;
    defaultValueNum?: number;
    defaultValueBool?: boolean;
    selectionOptions: string[];
    selectionMultiple?: boolean;
    selectionMultipleNMin?: number;
    selectionMultipleNMax?: number;
    selectionDefaultOptions: Record<string, number>;
}
export interface ExaminationCoreDto extends CoreConceptTransportBase {
    findings?: string[] | string;
    examination_types?: string[] | string;
    indications?: string[] | string;
}
export interface ExaminationCore extends CoreConceptBase {
    findings: string[];
    examinationTypes: string[];
    indications: string[];
}
export interface FindingCoreDto extends CoreConceptTransportBase {
    finding_types?: string[] | string;
    classifications?: string[] | string;
    interventions?: string[] | string;
}
export interface FindingCore extends CoreConceptBase {
    findingTypes: string[];
    classifications: string[];
    interventions: string[];
}
export interface FindingTypeCoreDto extends CoreConceptTransportBase {
}
export interface FindingTypeCore extends CoreConceptBase {
}
export interface IndicationCoreDto extends CoreConceptTransportBase {
    indication_types?: string[] | string;
    interventions?: string[] | string;
}
export interface IndicationCore extends CoreConceptBase {
    indicationTypes: string[];
    interventions: string[];
}
export interface IndicationTypeCoreDto extends CoreConceptTransportBase {
}
export interface IndicationTypeCore extends CoreConceptBase {
}
export interface InterventionCoreDto extends CoreConceptTransportBase {
    intervention_types?: string[] | string;
}
export interface InterventionCore extends CoreConceptBase {
    interventionTypes: string[];
}
export interface InterventionTypeCoreDto extends CoreConceptTransportBase {
}
export interface InterventionTypeCore extends CoreConceptBase {
}
export interface UnitCoreDto extends CoreConceptTransportBase {
    abbreviation?: string;
    unit_types?: string[] | string;
}
export interface UnitCore extends CoreConceptBase {
    abbreviation?: string;
    unitTypes: string[];
}
export interface UnitTypeCoreDto extends CoreConceptTransportBase {
}
export interface UnitTypeCore extends CoreConceptBase {
}
export interface InformationSourceCoreDto extends CoreConceptTransportBase {
    information_source_types?: string[] | string;
}
export interface InformationSourceCore extends CoreConceptBase {
    informationSourceTypes: string[];
}
export interface InformationSourceTypeCoreDto extends CoreConceptTransportBase {
}
export interface InformationSourceTypeCore extends CoreConceptBase {
}
export interface CitationCoreDto extends CoreConceptTransportBase {
    citation_key: string;
    title: string;
    abstract?: string;
    authors?: string[] | string;
    publication_year?: number;
    publication_month?: string;
    journal?: string;
    publisher?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    doi?: string;
    url?: string;
    entry_type?: string;
    language?: string;
    keywords?: string[] | string;
    identifiers?: Record<string, string>;
}
export interface CitationCore extends CoreConceptBase {
    citationKey: string;
    title: string;
    abstract?: string;
    authors: string[];
    publicationYear?: number;
    publicationMonth?: string;
    journal?: string;
    publisher?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    doi?: string;
    url?: string;
    entryType?: string;
    language?: string;
    keywords: string[];
    identifiers: Record<string, string>;
}
export interface CoreConceptTransportCollection {
    module_name?: string;
    module?: string;
    classification?: ClassificationCoreDto[];
    classification_choice?: ClassificationChoiceCoreDto[];
    classification_choice_descriptor?: ClassificationChoiceDescriptorCoreDto[];
    examination?: ExaminationCoreDto[];
    finding?: FindingCoreDto[];
    finding_type?: FindingTypeCoreDto[];
    indication?: IndicationCoreDto[];
    indication_type?: IndicationTypeCoreDto[];
    intervention?: InterventionCoreDto[];
    intervention_type?: InterventionTypeCoreDto[];
    unit?: UnitCoreDto[];
    unit_type?: UnitTypeCoreDto[];
    information_source?: InformationSourceCoreDto[];
    information_source_type?: InformationSourceTypeCoreDto[];
    citation?: CitationCoreDto[];
}
export interface CoreConceptCollection {
    moduleName: string;
    classification: ClassificationCore[];
    classificationChoice: ClassificationChoiceCore[];
    classificationChoiceDescriptor: ClassificationChoiceDescriptorCore[];
    examination: ExaminationCore[];
    finding: FindingCore[];
    findingType: FindingTypeCore[];
    indication: IndicationCore[];
    indicationType: IndicationTypeCore[];
    intervention: InterventionCore[];
    interventionType: InterventionTypeCore[];
    unit: UnitCore[];
    unitType: UnitTypeCore[];
    informationSource: InformationSourceCore[];
    informationSourceType: InformationSourceTypeCore[];
    citation: CitationCore[];
}
export type CoreConceptDisplay = Pick<CoreConceptBase, 'name' | 'nameDe' | 'nameEn' | 'displayName'>;
export declare const getCoreConceptDisplayName: (concept: CoreConceptDisplay | null | undefined, fallback?: string) => string;
