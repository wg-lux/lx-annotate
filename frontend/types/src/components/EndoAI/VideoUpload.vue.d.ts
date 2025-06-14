import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    'video-uploaded': (videoId: number) => any;
    'back-to-annotation': () => any;
}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{
    "onVideo-uploaded"?: ((videoId: number) => any) | undefined;
    "onBack-to-annotation"?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {
    pond: unknown;
}, HTMLDivElement>;
export default _default;
