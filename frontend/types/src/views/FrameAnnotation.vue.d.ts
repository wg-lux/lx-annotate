declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    ScrollingFrames: import("vue").DefineComponent<{}, {
        frames: {
            id: string;
            imageUrl: string;
            status: "in_progress" | "completed";
            assignedUser?: string | null | undefined;
        }[];
        annotateFrame: (frame: any) => void;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
    AnnotationComponent: import("vue").DefineComponent<{}, {}, {
        selectedGender: string;
        randomFirstNames: never[];
        randomLastNames: never[];
        randomFullNames: never[];
        droppedNames: never[];
        errorMessage: string;
        uploadedFile: null;
        processedImageUrl: null;
        originalImageUrl: null;
        showOriginal: boolean;
        femaleFirstNames: never[];
        femaleLastNames: never[];
        maleFirstNames: never[];
        maleLastNames: never[];
    }, {
        canSubmit(): null;
        displayedImageUrl(): null;
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
        getCookie(name: any): string | undefined;
        resetForm(): void;
    }, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
