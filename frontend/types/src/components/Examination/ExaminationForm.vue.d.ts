interface Props {
    videoTimestamp?: number | null;
    videoId?: number | null;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    'examination-saved': (data: any) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    "onExamination-saved"?: ((data: any) => any) | undefined;
}>, {
    videoId: number | null;
    videoTimestamp: number | null;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
