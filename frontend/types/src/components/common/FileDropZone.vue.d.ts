interface Props {
    acceptedFileTypes?: string;
    isUploading?: boolean;
}
declare const _default: import("vue").DefineComponent<Props, {
    triggerFileInput: () => void;
    clearValidationError: () => void;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "files-selected": (files: File[]) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    "onFiles-selected"?: ((files: File[]) => any) | undefined;
}>, {
    acceptedFileTypes: string;
    isUploading: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
