interface PatientInfo {
    patientFirstName?: string;
    patientLastName?: string;
    patientDob?: string;
    examinationDate?: string;
    centerName?: string;
}
interface FileItem {
    id: number;
    filename: string;
    filePath?: string;
    sensitiveMetaId?: number;
    patientInfo?: PatientInfo;
    createdAt?: string;
}
interface SelectedFile {
    type: 'pdf' | 'video';
    id: number;
    data: FileItem;
}
declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    fileSelected: (file: SelectedFile) => any;
    cancel: () => any;
}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{
    onCancel?: (() => any) | undefined;
    onFileSelected?: ((file: SelectedFile) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, HTMLDivElement>;
export default _default;
