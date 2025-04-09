declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    ReportOverview: import("vue").DefineComponent<{}, {}, {
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
    }, {}, {
        loadPatients(): Promise<void>;
        openPatientForm(patient?: null | undefined): void;
        closePatientForm(): void;
        submitPatientForm(): Promise<void>;
        deletePatient(id: any): Promise<void>;
    }, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
