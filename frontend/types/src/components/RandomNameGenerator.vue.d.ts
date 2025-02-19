declare const _default: import("vue").DefineComponent<{}, {}, {
    randomNames: never[];
    selectedGender: string;
    femaleFirstNames: never[];
    femaleLastNames: never[];
    maleFirstNames: never[];
    maleLastNames: never[];
    errorMessage: string;
}, {}, {
    loadNames(): Promise<void>;
    getRandomIndex(array: any): number;
    generateRandomName(gender: any): string | undefined;
    handleAddRandomName(): void;
    removeName(index: any): void;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
