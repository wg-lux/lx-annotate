export interface Gender {
    id: number;
    name: string;
    name_de?: string;
    name_en?: string;
    abbreviation?: string;
    description?: string;
}
export interface Center {
    id: number;
    name: string;
    name_de?: string;
    name_en?: string;
    description?: string;
}
export interface Patient {
    id?: number;
    first_name: string;
    last_name: string;
    dob?: string | null;
    gender?: string | null;
    center?: string | null;
    email?: string;
    phone?: string;
    patient_hash?: string | null;
    comments?: string;
    is_real_person?: boolean;
    pseudonym_first_name?: string | null;
    pseudonym_last_name?: string | null;
    sensitive_meta_id?: number | null;
    age?: number | null;
    created_at?: string;
    updated_at?: string;
}
export interface PatientFormData {
    id?: number | null;
    first_name: string;
    last_name: string;
    dob: string | null | undefined;
    gender: string | null;
    center: string | null;
    email: string;
    phone: string;
    patient_hash: string;
    comments: string;
    is_real_person?: boolean;
}
export interface PatientCreateData {
    first_name: string;
    last_name: string;
    dob?: string | null;
    gender?: string | null;
    center?: string | null;
    email?: string;
    phone?: string;
    patient_hash?: string | null;
    is_real_person?: boolean;
}
export interface PatientUpdateData extends PatientCreateData {
    id: number;
}
export interface PatientListResponse {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results: Patient[];
}
export declare const patientService: {
    getPatients(): Promise<Patient[]>;
    addPatient(patientData: PatientCreateData): Promise<Patient>;
    updatePatient(patientId: number, patientData: Partial<PatientCreateData>): Promise<Patient>;
    deletePatient(patientId: number): Promise<void>;
    getGenders(): Promise<Gender[]>;
    getCenters(): Promise<Center[]>;
    formatPatientData(patientForm: PatientFormData): PatientCreateData;
    calculateAge(dateOfBirth: string | null | undefined): number | null;
    isValidEmail(email: string): boolean;
    validatePatientData(patient: Partial<PatientFormData>): {
        isValid: boolean;
        errors: string[];
    };
};
