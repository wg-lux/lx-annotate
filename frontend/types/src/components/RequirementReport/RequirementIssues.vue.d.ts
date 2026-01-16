type __VLS_Props = {
    patientExaminationId: number | null | undefined;
    requirementSetIds?: number[] | null;
    /** show only unmet or errored requirements (default = true) */
    showOnlyUnmet?: boolean;
};
declare function fetchRequirements(): Promise<void>;
declare const _default: import("vue").DefineComponent<__VLS_Props, {
    reload: typeof fetchRequirements;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
