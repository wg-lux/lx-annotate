declare const _default: import("vue").DefineComponent<{}, {}, {
    centers: any[];
    examinations: any[];
    findings: any[];
    locationClassifications: any[];
    locationClassificationChoices: any[];
    morphologyClassifications: any[];
    morphologyClassificationChoices: any[];
    interventions: any[];
    patients: any[];
    showPatientForm: boolean;
    editingPatient: any;
    patientForm: {
        id: any;
        first_name: string;
        last_name: string;
        age: any;
        comments: string;
        gender: any;
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
        selectedInterventions: any[];
    };
}, {
    filteredLocationChoices(): any[];
    filteredMorphologyChoices(): any[];
}, {
    loadPatients(): Promise<void>;
    openPatientForm(patient?: any): void;
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
    getCookie(name: any): string;
    handleSubmit(): Promise<void>;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
