import type { ReportTemplateRuntimeValidationResult } from '@/types/reportTemplate';
type __VLS_Props = {
    title?: string;
    subtitle?: string;
    loading?: boolean;
    errorMessage?: string | null;
    result?: ReportTemplateRuntimeValidationResult | null;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    loading: boolean;
    title: string;
    errorMessage: string | null;
    subtitle: string;
    result: ReportTemplateRuntimeValidationResult | null;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
