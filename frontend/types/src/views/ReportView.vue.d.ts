declare const _default: import("vue").DefineComponent<{}, {
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string, string>;
    reportData: import("vue").Ref<null, null>;
    editMode: import("vue").Ref<boolean, boolean>;
    editableData: {
        patient_first_name: string;
        patient_last_name: string;
        patient_gender: number;
        patient_dob: string;
        examination_date: string;
        anonymized_text: string;
    };
    validationErrors: {};
    successMessage: import("vue").Ref<string, string>;
    errorMessage: import("vue").Ref<string, string>;
    toggleEditMode: () => Promise<void>;
    saveChanges: () => Promise<void>;
    formatDate: (dateString: any) => string;
    formatFileSize: (bytes: any) => string;
    getGenderDisplay: (gender: any) => any;
    getStatusDisplay: (status: any) => any;
    getStatusBadgeClass: (status: any) => any;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
