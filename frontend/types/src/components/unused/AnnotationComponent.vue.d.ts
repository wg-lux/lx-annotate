declare const _default: import("vue").DefineComponent<{}, {}, {
    selectedGender: string;
    randomFirstNames: any[];
    randomLastNames: any[];
    randomFullNames: any[];
    droppedNames: any[];
    errorMessage: string;
    uploadedFile: any;
    processedImageUrl: any;
    originalImageUrl: any;
    showOriginal: boolean;
    femaleFirstNames: any[];
    femaleLastNames: any[];
    maleFirstNames: any[];
    maleLastNames: any[];
}, {
    canSubmit(): boolean;
    displayedImageUrl(): any;
}, {
    loadNames(): Promise<void>;
    getRandomName(array: any): any;
    handleAddRandomFirstName(): void;
    handleAddRandomLastName(): void;
    handleAddRandomFullName(): void;
    removeName(type: any, index: any): void;
    handleDragStart(nameData: any, event: any): void;
    handleDrop(event: any): void;
    toggleImage(): void;
    handleFileUpload(event: any): Promise<void>;
    saveAnnotation(): Promise<void>;
    getCookie(name: any): string;
    resetForm(): void;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
