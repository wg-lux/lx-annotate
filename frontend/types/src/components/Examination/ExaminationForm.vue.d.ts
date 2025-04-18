import type { Examination, SubcategoryMap } from '@/stores/examinationStore';
declare const _default: import("vue").DefineComponent<{}, {
    examinations: import("vue").Ref<{
        id: number;
        name: string;
    }[], Examination[] | {
        id: number;
        name: string;
    }[]>;
    selectedExamId: import("vue").Ref<number | null, number | null>;
    activeCategory: import("vue").Ref<keyof SubcategoryMap, keyof SubcategoryMap>;
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
    subcategories: import("vue").ComputedRef<SubcategoryMap>;
    categoryLabels: {
        readonly morphologyChoices: "Morphologie";
        readonly locationChoices: "Lokalisierung";
        readonly interventions: "Interventionen";
        readonly instruments: "Instrumente";
    };
    onExamChange: () => Promise<void>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
