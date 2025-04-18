declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    ExaminationGenerator: import("vue").DefineComponent<{}, {
        examinations: import("vue").Ref<{
            id: number;
            name: string;
        }[], import("../stores/examinationStore.js").Examination[] | {
            id: number;
            name: string;
        }[]>;
        selectedExamId: import("vue").Ref<number | null, number | null>;
        activeCategory: import("vue").Ref<keyof import("../stores/examinationStore.js").SubcategoryMap, keyof import("../stores/examinationStore.js").SubcategoryMap>;
        form: import("vue").Ref<{
            morphologyChoiceId: number | null;
            locationChoiceId: number | null;
            selectedInterventions: number[];
            selectedInstruments: number[];
        }, {
            morphologyChoiceId: number | null;
            locationChoiceId: number | null;
            selectedInterventions: number[];
            selectedInstruments: number[];
        } | {
            morphologyChoiceId: number | null;
            locationChoiceId: number | null;
            selectedInterventions: number[];
            selectedInstruments: number[];
        }>;
        subcategories: import("vue").ComputedRef<import("../stores/examinationStore.js").SubcategoryMap>;
        categoryLabels: {
            readonly morphologyChoices: "Morphologie";
            readonly locationChoices: "Lokalisierung";
            readonly interventions: "Interventionen";
            readonly instruments: "Instrumente";
        };
        onExamChange: () => Promise<void>;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
