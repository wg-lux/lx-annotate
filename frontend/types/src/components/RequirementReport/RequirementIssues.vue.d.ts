import type { EvaluateRequirementsResponse } from '@/types/api/evaluateRequirements';
type __VLS_Props = {
    payload: EvaluateRequirementsResponse | null;
    unmetBySet: Record<string, {
        setId: number | null;
        setName: string;
        items: EvaluateRequirementsResponse['results'];
    }>;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
