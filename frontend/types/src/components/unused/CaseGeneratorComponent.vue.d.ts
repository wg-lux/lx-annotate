declare const _default: import("vue").DefineComponent<{}, {}, {
    fileUserValidation: boolean;
    documentType: string;
    textType: string;
    isFinal: boolean;
    containsHisto: boolean;
    followupOneYear: boolean;
    isPreliminary: boolean;
    patientFirstName: string;
    patientLastName: string;
    patientBirthDate: string;
    examinationDate: string;
    processedText: string;
    uploadedFile: null;
}, {}, {
    triggerFileInput(): void;
    handleDrop(event: any): void;
    handleFileUpload(event: any): void;
    validateForm(): "Vorläufige Berichte sollten angeben, ob Histologie erforderlich ist." | "Untersuchungen, die älter als 1 Jahr sind, erfordern eine Nachkontrolle." | null;
    handleSubmit(): void;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
