import { type Patient } from '@/stores/patientStore';
declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {} & {
    cancel: () => any;
    "patient-created": (patient: Patient) => any;
}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{
    onCancel?: (() => any) | undefined;
    "onPatient-created"?: ((patient: Patient) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
