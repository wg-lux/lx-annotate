declare const _default: import("vue").DefineComponent<{}, {}, {
    centers: never[];
    examinations: never[];
    findings: never[];
    locationClassifications: never[];
    locationClassificationChoices: never[];
    morphologyClassifications: never[];
    morphologyClassificationChoices: never[];
    interventions: never[];
    patients: never[];
    showPatientForm: boolean;
    editingPatient: null;
    patientForm: {
        id: null;
        first_name: string;
        last_name: string;
        age: null;
        comments: string;
        gender: null;
    };
    errorMessage: string;
    formData: {
        name: string;
        polypCount: string;
        comments: string;
        gender: string;
        centerId: string;
        examinationId: string;
        findingId: string;
        locationClassificationId: string;
        locationChoiceId: string;
        morphologyClassificationId: string;
        morphologyChoiceId: string;
        selectedInterventions: never[];
    };
}, {
    filteredLocationChoices(): never[];
    filteredMorphologyChoices(): never[];
}, {
    loadPatients(): Promise<void>;
    openPatientForm(patient?: null): void;
    closePatientForm(): void;
    submitPatientForm(): Promise<void>;
    deletePatient(id: any): Promise<void>;
    loadCenters(): Promise<void>;
    loadExaminations(): Promise<void>;
    loadFindings(): Promise<void>;
    loadLocationClassifications(): Promise<void>;
    loadLocationClassificationChoices(): Promise<void>;
    loadMorphologyClassifications(): Promise<void>;
    loadMorphologyClassificationChoices(): Promise<void>;
    loadInterventions(): Promise<void>;
    loadLocationChoices(): void;
    loadMorphologyChoices(): void;
    getCookie(name: any): string | null;
    handleSubmit(): Promise<void>;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
