declare const _default: import("vue").DefineComponent<{}, {}, {
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
}, {}, {
    loadPatients(): Promise<void>;
    openPatientForm(patient?: any): void;
    closePatientForm(): void;
    submitPatientForm(): Promise<void>;
    deletePatient(id: any): Promise<void>;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
