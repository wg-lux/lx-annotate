import { type Patient } from '@/stores/patientStore';
interface Props {
    patient: Patient;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    'patient-updated': (patient: Patient) => any;
    cancel: () => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    onCancel?: (() => any) | undefined;
    "onPatient-updated"?: ((patient: Patient) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
