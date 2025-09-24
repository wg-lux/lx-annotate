import { type Patient } from '@/stores/patientStore';
interface Props {
    patient: Patient;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    cancel: () => any;
    "patient-updated": (patient: Patient) => any;
    "patient-deleted": (patientId: number) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    onCancel?: (() => any) | undefined;
    "onPatient-updated"?: ((patient: Patient) => any) | undefined;
    "onPatient-deleted"?: ((patientId: number) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
