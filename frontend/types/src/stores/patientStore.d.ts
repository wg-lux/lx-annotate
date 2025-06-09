export interface Patient {
    first_name: string;
    name: string;
    dob: string;
    email: string;
    phone: string;
    is_real_person: boolean;
    gender_id: number;
    center_id: number;
}
export interface PatientExamination {
    date_start: string;
    date_stop: string;
    examination_id: number;
    patient_id: number;
    report_file_id: number;
    video_file_id: number;
}
export interface PatientFinding {
    date_start: string;
    date_stop: string;
    examination_id: number;
    patient_id: number;
    report_file_id: number;
    video_file_id: number;
}
export declare const usePatientStore: import("pinia").StoreDefinition<"patient", import("pinia")._UnwrapAll<Pick<{
    patients: import("vue").Ref<{
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    }[], Patient[] | {
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    }[]>;
    currentPatient: import("vue").Ref<{
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    } | null, Patient | {
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    } | null>;
    patientExaminations: import("vue").Ref<{
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[], PatientExamination[] | {
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[]>;
    patientFindings: import("vue").Ref<{
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[], PatientFinding[] | {
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchPatients: () => Promise<void>;
}, "patients" | "currentPatient" | "patientExaminations" | "patientFindings" | "loading" | "error">>, Pick<{
    patients: import("vue").Ref<{
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    }[], Patient[] | {
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    }[]>;
    currentPatient: import("vue").Ref<{
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    } | null, Patient | {
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    } | null>;
    patientExaminations: import("vue").Ref<{
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[], PatientExamination[] | {
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[]>;
    patientFindings: import("vue").Ref<{
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[], PatientFinding[] | {
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchPatients: () => Promise<void>;
}, never>, Pick<{
    patients: import("vue").Ref<{
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    }[], Patient[] | {
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    }[]>;
    currentPatient: import("vue").Ref<{
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    } | null, Patient | {
        first_name: string;
        name: string;
        dob: string;
        email: string;
        phone: string;
        is_real_person: boolean;
        gender_id: number;
        center_id: number;
    } | null>;
    patientExaminations: import("vue").Ref<{
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[], PatientExamination[] | {
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[]>;
    patientFindings: import("vue").Ref<{
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[], PatientFinding[] | {
        date_start: string;
        date_stop: string;
        examination_id: number;
        patient_id: number;
        report_file_id: number;
        video_file_id: number;
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchPatients: () => Promise<void>;
}, "fetchPatients">>;
