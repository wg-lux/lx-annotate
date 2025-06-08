declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    ExaminationGenerator: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
        videoTimestamp: {
            type: NumberConstructor;
            default: null;
        };
        videoId: {
            type: NumberConstructor;
            default: null;
        };
    }>, {
        availableExaminations: import("vue").Ref<{
            id: number;
            name: string;
            domainId?: number | undefined;
            applicableClassifications?: string[] | undefined;
            optionalLocationClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            requiredLocationClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            optionalMorphologyClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            requiredMorphologyClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
        }[], import("../stores/examinationStore.js").Examination[] | {
            id: number;
            name: string;
            domainId?: number | undefined;
            applicableClassifications?: string[] | undefined;
            optionalLocationClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            requiredLocationClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            optionalMorphologyClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            requiredMorphologyClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
        }[]>;
        availableFindings: import("vue").Ref<{
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            optionalLocationClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            requiredLocationClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            optionalMorphologyClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            requiredMorphologyClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
        }[], import("../stores/examinationStore.js").Finding[] | {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            optionalLocationClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            requiredLocationClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            optionalMorphologyClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
            requiredMorphologyClassifications?: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                    name_en?: string | undefined;
                    description?: string | undefined;
                    description_de?: string | undefined;
                    description_en?: string | undefined;
                    classificationId: number;
                    subcategories?: Record<string, any> | undefined;
                    numerical_descriptors?: Record<string, any> | undefined;
                }[];
            }[] | undefined;
        }[]>;
        locationClassifications: import("vue").Ref<{
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[], import("../stores/examinationStore.js").LocationClassification[] | {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[]>;
        morphologyClassifications: import("vue").Ref<{
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[], import("../stores/examinationStore.js").MorphologyClassification[] | {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[]>;
        selectedExaminationId: import("vue").Ref<number | null, number | null>;
        selectedFindingId: import("vue").Ref<number | null, number | null>;
        selectedLocationChoices: import("vue").Ref<number[], number[]>;
        selectedMorphologyChoices: import("vue").Ref<number[], number[]>;
        activeTab: import("vue").Ref<"location" | "morphology", "location" | "morphology">;
        notes: import("vue").Ref<string, string>;
        loading: import("vue").Ref<boolean, boolean>;
        error: import("vue").Ref<string | null, string | null>;
        examinationDataLoaded: import("vue").Ref<boolean, boolean>;
        hasRequiredLocationClassifications: import("vue").ComputedRef<boolean>;
        hasRequiredMorphologyClassifications: import("vue").ComputedRef<boolean>;
        validationErrors: import("vue").ComputedRef<string[]>;
        canSave: import("vue").ComputedRef<boolean>;
        onExaminationChange: () => void;
        onFindingChange: () => void;
        isRequiredLocationClassification: (classificationId: number) => boolean;
        isRequiredMorphologyClassification: (classificationId: number) => boolean;
        getSelectedLocationChoicesForClassification: (classificationId: number) => number[];
        getSelectedMorphologyChoicesForClassification: (classificationId: number) => number[];
        updateLocationChoicesForClassification: (classificationId: number, choiceIds: number[]) => void;
        updateMorphologyChoicesForClassification: (classificationId: number, choiceIds: number[]) => void;
        hasSelectedLocationChoiceForClassification: (classificationId: number) => boolean;
        hasSelectedMorphologyChoiceForClassification: (classificationId: number) => boolean;
        saveFinding: () => Promise<void>;
        resetForm: () => void;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "examination-saved"[], "examination-saved", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        videoTimestamp: {
            type: NumberConstructor;
            default: null;
        };
        videoId: {
            type: NumberConstructor;
            default: null;
        };
    }>> & Readonly<{
        "onExamination-saved"?: ((...args: any[]) => any) | undefined;
    }>, {
        videoId: number;
        videoTimestamp: number;
    }, {}, {
        ClassificationCard: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
            label: {
                type: StringConstructor;
                required: true;
            };
            options: {
                type: import("vue").PropType<import("../components/Examination/ClassificationCard.vue").Option[]>;
                default: () => never[];
            };
            modelValue: {
                type: import("vue").PropType<number[]>;
                default: () => never[];
            };
            tempValue: {
                type: NumberConstructor;
                default: undefined;
            };
            compact: {
                type: BooleanConstructor;
                default: boolean;
            };
            singleSelect: {
                type: BooleanConstructor;
                default: boolean;
            };
        }>, {
            localModelValue: import("vue").WritableComputedRef<number[], number[]>;
            localTempValue: import("vue").WritableComputedRef<number | undefined, number | undefined>;
            singleSelectedValue: import("vue").WritableComputedRef<number | null, number | null>;
            isSingleSelection: import("vue").ComputedRef<boolean>;
            selectedLabels: import("vue").ComputedRef<import("../components/Examination/ClassificationCard.vue").Option[]>;
            availableOptions: import("vue").ComputedRef<import("../components/Examination/ClassificationCard.vue").Option[]>;
            selectPrompt: import("vue").ComputedRef<string>;
            addSelected: () => void;
            removeItem: (id: number) => void;
        }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("update:modelValue" | "update:tempValue")[], "update:modelValue" | "update:tempValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
            label: {
                type: StringConstructor;
                required: true;
            };
            options: {
                type: import("vue").PropType<import("../components/Examination/ClassificationCard.vue").Option[]>;
                default: () => never[];
            };
            modelValue: {
                type: import("vue").PropType<number[]>;
                default: () => never[];
            };
            tempValue: {
                type: NumberConstructor;
                default: undefined;
            };
            compact: {
                type: BooleanConstructor;
                default: boolean;
            };
            singleSelect: {
                type: BooleanConstructor;
                default: boolean;
            };
        }>> & Readonly<{
            "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
            "onUpdate:tempValue"?: ((...args: any[]) => any) | undefined;
        }>, {
            options: import("../components/Examination/ClassificationCard.vue").Option[];
            modelValue: number[];
            tempValue: number;
            compact: boolean;
            singleSelect: boolean;
        }, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
    }, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
