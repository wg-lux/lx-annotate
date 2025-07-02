declare const _default: import("vue").DefineComponent<{}, {}, {
    randomNames: any[];
    selectedGender: string;
    femaleFirstNames: any[];
    femaleLastNames: any[];
    maleFirstNames: any[];
    maleLastNames: any[];
    errorMessage: string;
}, {}, {
    loadNames(): Promise<void>;
    getRandomIndex(array: any): number;
    generateRandomName(gender: any): string;
    handleAddRandomName(): void;
    removeName(index: any): void;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
