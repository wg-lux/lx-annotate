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
export interface Examiner {
    id: string;
    name: string;
}
