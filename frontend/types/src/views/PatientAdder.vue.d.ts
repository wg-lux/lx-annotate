declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    PatientAdder: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {} & {
        cancel: () => any;
        "patient-created": (patient: import("../api/patientService.js").Patient) => any;
    }, string, import("vue").PublicProps, Readonly<{}> & Readonly<{
        onCancel?: (() => any) | undefined;
        "onPatient-created"?: ((patient: import("../api/patientService.js").Patient) => any) | undefined;
    }>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
