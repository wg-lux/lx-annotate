import type { ClassificationSelection, Finding, PatientFindingRow } from '@/api/findings.contract';
import type { Patient } from '@/stores/patientStore';
interface PatientFinding extends Partial<PatientFindingRow> {
    id: number;
    examination?: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    createdBy?: string;
    updatedBy?: string;
    finding: Finding | PatientFindingRow['finding'];
    patient?: Patient;
    classifications?: PatientFindingRow['classifications'];
    patientExamination?: number;
    patient_examination?: number;
    isActive?: boolean;
    is_active?: boolean;
}
declare const usePatientFindingStore: import("pinia").StoreDefinition<"patientFinding", Pick<{
    patientFindings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | null | undefined;
        readonly updatedAt?: string | null | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly displayName?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly centerKey?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        } | undefined;
        readonly classifications?: readonly {
            readonly id: number;
            readonly classification: number;
            readonly classificationChoice: number;
            readonly classificationName?: string | undefined;
            readonly classificationChoiceName?: string | undefined;
            readonly subcategories: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly numericalDescriptors: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly isActive: boolean;
        }[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
        readonly interventions?: readonly (number | {
            readonly intervention?: number | undefined;
            readonly interventionId?: number | undefined;
            readonly state?: string | null | undefined;
            readonly date?: string | null | undefined;
            readonly timeStart?: string | null | undefined;
            readonly timeEnd?: string | null | undefined;
        })[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | null | undefined;
        readonly updatedAt?: string | null | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly displayName?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly centerKey?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        } | undefined;
        readonly classifications?: readonly {
            readonly id: number;
            readonly classification: number;
            readonly classificationChoice: number;
            readonly classificationName?: string | undefined;
            readonly classificationChoiceName?: string | undefined;
            readonly subcategories: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly numericalDescriptors: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly isActive: boolean;
        }[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
        readonly interventions?: readonly (number | {
            readonly intervention?: number | undefined;
            readonly interventionId?: number | undefined;
            readonly state?: string | null | undefined;
            readonly date?: string | null | undefined;
            readonly timeStart?: string | null | undefined;
            readonly timeEnd?: string | null | undefined;
        })[] | undefined;
    }[]>>;
    patientFindingsByCurrentPatient: import("vue").ComputedRef<{
        id: number;
        examination?: string | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        createdBy?: string | undefined;
        updatedBy?: string | undefined;
        finding: number | {
            id: number;
            description: string;
            nameDe?: string | undefined;
            displayName?: string | undefined;
            examinations: string[];
            patientExaminationId?: number | undefined;
            classifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            FindingClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            findingTypes: string[];
            findingInterventions: string[];
            name: string;
        } | {
            id: number;
        };
        patient?: {
            id?: number | undefined;
            firstName: string;
            lastName: string;
            dob?: string | null | undefined;
            gender?: string | null | undefined;
            center?: string | null | undefined;
            centerKey?: string | null | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            patientHash?: string | null | undefined;
            comments?: string | undefined;
            isRealPerson?: boolean | undefined;
            pseudonymFirstName?: string | null | undefined;
            pseudonymLastName?: string | null | undefined;
            sensitiveMetaId?: number | null | undefined;
            age?: number | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        } | undefined;
        classifications?: {
            id: number;
            classification: number;
            classificationChoice: number;
            classificationName?: string | undefined;
            classificationChoiceName?: string | undefined;
            subcategories: import("@/api/findings.contract").JsonMap;
            numericalDescriptors: import("@/api/findings.contract").JsonMap;
            isActive: boolean;
        }[] | undefined;
        patientExamination?: number | undefined;
        patient_examination?: number | undefined;
        isActive?: boolean | undefined;
        is_active?: boolean | undefined;
        interventions?: (number | {
            intervention?: number | undefined;
            interventionId?: number | undefined;
            state?: string | null | undefined;
            date?: string | null | undefined;
            timeStart?: string | null | undefined;
            timeEnd?: string | null | undefined;
        })[] | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    fetchPatientFindings: (patientExaminationId: number) => Promise<void>;
    createPatientFinding: (patientFindingData: {
        patient_examination?: number;
        patientExamination?: number;
        finding: number;
        classifications?: ClassificationSelection[];
    }) => Promise<PatientFinding>;
    updatePatientFinding: (id: number, updateData: Partial<PatientFinding>) => Promise<PatientFinding>;
    deletePatientFinding: (id: number) => Promise<void>;
}, "error" | "loading" | "patientFindings">, Pick<{
    patientFindings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | null | undefined;
        readonly updatedAt?: string | null | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly displayName?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly centerKey?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        } | undefined;
        readonly classifications?: readonly {
            readonly id: number;
            readonly classification: number;
            readonly classificationChoice: number;
            readonly classificationName?: string | undefined;
            readonly classificationChoiceName?: string | undefined;
            readonly subcategories: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly numericalDescriptors: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly isActive: boolean;
        }[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
        readonly interventions?: readonly (number | {
            readonly intervention?: number | undefined;
            readonly interventionId?: number | undefined;
            readonly state?: string | null | undefined;
            readonly date?: string | null | undefined;
            readonly timeStart?: string | null | undefined;
            readonly timeEnd?: string | null | undefined;
        })[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | null | undefined;
        readonly updatedAt?: string | null | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly displayName?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly centerKey?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        } | undefined;
        readonly classifications?: readonly {
            readonly id: number;
            readonly classification: number;
            readonly classificationChoice: number;
            readonly classificationName?: string | undefined;
            readonly classificationChoiceName?: string | undefined;
            readonly subcategories: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly numericalDescriptors: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly isActive: boolean;
        }[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
        readonly interventions?: readonly (number | {
            readonly intervention?: number | undefined;
            readonly interventionId?: number | undefined;
            readonly state?: string | null | undefined;
            readonly date?: string | null | undefined;
            readonly timeStart?: string | null | undefined;
            readonly timeEnd?: string | null | undefined;
        })[] | undefined;
    }[]>>;
    patientFindingsByCurrentPatient: import("vue").ComputedRef<{
        id: number;
        examination?: string | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        createdBy?: string | undefined;
        updatedBy?: string | undefined;
        finding: number | {
            id: number;
            description: string;
            nameDe?: string | undefined;
            displayName?: string | undefined;
            examinations: string[];
            patientExaminationId?: number | undefined;
            classifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            FindingClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            findingTypes: string[];
            findingInterventions: string[];
            name: string;
        } | {
            id: number;
        };
        patient?: {
            id?: number | undefined;
            firstName: string;
            lastName: string;
            dob?: string | null | undefined;
            gender?: string | null | undefined;
            center?: string | null | undefined;
            centerKey?: string | null | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            patientHash?: string | null | undefined;
            comments?: string | undefined;
            isRealPerson?: boolean | undefined;
            pseudonymFirstName?: string | null | undefined;
            pseudonymLastName?: string | null | undefined;
            sensitiveMetaId?: number | null | undefined;
            age?: number | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        } | undefined;
        classifications?: {
            id: number;
            classification: number;
            classificationChoice: number;
            classificationName?: string | undefined;
            classificationChoiceName?: string | undefined;
            subcategories: import("@/api/findings.contract").JsonMap;
            numericalDescriptors: import("@/api/findings.contract").JsonMap;
            isActive: boolean;
        }[] | undefined;
        patientExamination?: number | undefined;
        patient_examination?: number | undefined;
        isActive?: boolean | undefined;
        is_active?: boolean | undefined;
        interventions?: (number | {
            intervention?: number | undefined;
            interventionId?: number | undefined;
            state?: string | null | undefined;
            date?: string | null | undefined;
            timeStart?: string | null | undefined;
            timeEnd?: string | null | undefined;
        })[] | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    fetchPatientFindings: (patientExaminationId: number) => Promise<void>;
    createPatientFinding: (patientFindingData: {
        patient_examination?: number;
        patientExamination?: number;
        finding: number;
        classifications?: ClassificationSelection[];
    }) => Promise<PatientFinding>;
    updatePatientFinding: (id: number, updateData: Partial<PatientFinding>) => Promise<PatientFinding>;
    deletePatientFinding: (id: number) => Promise<void>;
}, "patientFindingsByCurrentPatient">, Pick<{
    patientFindings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | null | undefined;
        readonly updatedAt?: string | null | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly displayName?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly centerKey?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        } | undefined;
        readonly classifications?: readonly {
            readonly id: number;
            readonly classification: number;
            readonly classificationChoice: number;
            readonly classificationName?: string | undefined;
            readonly classificationChoiceName?: string | undefined;
            readonly subcategories: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly numericalDescriptors: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly isActive: boolean;
        }[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
        readonly interventions?: readonly (number | {
            readonly intervention?: number | undefined;
            readonly interventionId?: number | undefined;
            readonly state?: string | null | undefined;
            readonly date?: string | null | undefined;
            readonly timeStart?: string | null | undefined;
            readonly timeEnd?: string | null | undefined;
        })[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | null | undefined;
        readonly updatedAt?: string | null | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly displayName?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly displayName?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly displayName?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly centerKey?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        } | undefined;
        readonly classifications?: readonly {
            readonly id: number;
            readonly classification: number;
            readonly classificationChoice: number;
            readonly classificationName?: string | undefined;
            readonly classificationChoiceName?: string | undefined;
            readonly subcategories: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly numericalDescriptors: {
                readonly [x: string]: Readonly<unknown>;
            };
            readonly isActive: boolean;
        }[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
        readonly interventions?: readonly (number | {
            readonly intervention?: number | undefined;
            readonly interventionId?: number | undefined;
            readonly state?: string | null | undefined;
            readonly date?: string | null | undefined;
            readonly timeStart?: string | null | undefined;
            readonly timeEnd?: string | null | undefined;
        })[] | undefined;
    }[]>>;
    patientFindingsByCurrentPatient: import("vue").ComputedRef<{
        id: number;
        examination?: string | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        createdBy?: string | undefined;
        updatedBy?: string | undefined;
        finding: number | {
            id: number;
            description: string;
            nameDe?: string | undefined;
            displayName?: string | undefined;
            examinations: string[];
            patientExaminationId?: number | undefined;
            classifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            FindingClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                displayName?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    displayName?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            findingTypes: string[];
            findingInterventions: string[];
            name: string;
        } | {
            id: number;
        };
        patient?: {
            id?: number | undefined;
            firstName: string;
            lastName: string;
            dob?: string | null | undefined;
            gender?: string | null | undefined;
            center?: string | null | undefined;
            centerKey?: string | null | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            patientHash?: string | null | undefined;
            comments?: string | undefined;
            isRealPerson?: boolean | undefined;
            pseudonymFirstName?: string | null | undefined;
            pseudonymLastName?: string | null | undefined;
            sensitiveMetaId?: number | null | undefined;
            age?: number | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        } | undefined;
        classifications?: {
            id: number;
            classification: number;
            classificationChoice: number;
            classificationName?: string | undefined;
            classificationChoiceName?: string | undefined;
            subcategories: import("@/api/findings.contract").JsonMap;
            numericalDescriptors: import("@/api/findings.contract").JsonMap;
            isActive: boolean;
        }[] | undefined;
        patientExamination?: number | undefined;
        patient_examination?: number | undefined;
        isActive?: boolean | undefined;
        is_active?: boolean | undefined;
        interventions?: (number | {
            intervention?: number | undefined;
            interventionId?: number | undefined;
            state?: string | null | undefined;
            date?: string | null | undefined;
            timeStart?: string | null | undefined;
            timeEnd?: string | null | undefined;
        })[] | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    fetchPatientFindings: (patientExaminationId: number) => Promise<void>;
    createPatientFinding: (patientFindingData: {
        patient_examination?: number;
        patientExamination?: number;
        finding: number;
        classifications?: ClassificationSelection[];
    }) => Promise<PatientFinding>;
    updatePatientFinding: (id: number, updateData: Partial<PatientFinding>) => Promise<PatientFinding>;
    deletePatientFinding: (id: number) => Promise<void>;
}, "fetchPatientFindings" | "createPatientFinding" | "updatePatientFinding" | "deletePatientFinding">>;
export { usePatientFindingStore };
