import type { Patient } from '@/stores/patientStore';
import type { Video } from '@/stores/videoStore';
import type { Examination } from './examinationStore';
export interface PatientExamination {
    patient: Patient;
    examination: Examination;
    video: Video | null;
    id: number;
}
export declare const usePatientExaminationStore: import("pinia").StoreDefinition<"patientExamination", {
    loading: boolean;
    error: string | null;
    patientExaminations: PatientExamination[];
    selectedPatientExaminationId: number | null;
}, {
    getPatientExaminationById: (state: {
        loading: boolean;
        error: string | null;
        patientExaminations: {
            patient: {
                id?: number | undefined;
                firstName: string;
                lastName: string;
                dob?: string | null | undefined;
                gender?: string | null | undefined;
                center?: string | null | undefined;
                email?: string | undefined;
                phone?: string | undefined;
                patientHash?: string | null | undefined;
                comments?: string | undefined;
                isRealPerson?: boolean | undefined;
                pseudonymFirstName?: string | null | undefined;
                pseudonymLastName?: string | null | undefined;
                sensitiveMetaId?: number | null | undefined;
                age?: number | null | undefined;
                createdAt?: string | undefined;
                updatedAt?: string | undefined;
            };
            examination: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                displayName?: string | undefined;
            };
            video: {
                [x: string]: any;
                id: number;
                center_name?: string | undefined;
                processor_name?: string | undefined;
                original_file_name?: string | undefined;
                status?: string | undefined;
                video_url?: string | undefined;
            } | null;
            id: number;
        }[];
        selectedPatientExaminationId: number | null;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        patientExaminations: PatientExamination[];
        selectedPatientExaminationId: number | null;
    }>) => (id: number) => {
        patient: {
            id?: number | undefined;
            firstName: string;
            lastName: string;
            dob?: string | null | undefined;
            gender?: string | null | undefined;
            center?: string | null | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            patientHash?: string | null | undefined;
            comments?: string | undefined;
            isRealPerson?: boolean | undefined;
            pseudonymFirstName?: string | null | undefined;
            pseudonymLastName?: string | null | undefined;
            sensitiveMetaId?: number | null | undefined;
            age?: number | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        };
        examination: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            displayName?: string | undefined;
        };
        video: {
            [x: string]: any;
            id: number;
            center_name?: string | undefined;
            processor_name?: string | undefined;
            original_file_name?: string | undefined;
            status?: string | undefined;
            video_url?: string | undefined;
        } | null;
        id: number;
    } | null;
    isLoading: (state: {
        loading: boolean;
        error: string | null;
        patientExaminations: {
            patient: {
                id?: number | undefined;
                firstName: string;
                lastName: string;
                dob?: string | null | undefined;
                gender?: string | null | undefined;
                center?: string | null | undefined;
                email?: string | undefined;
                phone?: string | undefined;
                patientHash?: string | null | undefined;
                comments?: string | undefined;
                isRealPerson?: boolean | undefined;
                pseudonymFirstName?: string | null | undefined;
                pseudonymLastName?: string | null | undefined;
                sensitiveMetaId?: number | null | undefined;
                age?: number | null | undefined;
                createdAt?: string | undefined;
                updatedAt?: string | undefined;
            };
            examination: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                displayName?: string | undefined;
            };
            video: {
                [x: string]: any;
                id: number;
                center_name?: string | undefined;
                processor_name?: string | undefined;
                original_file_name?: string | undefined;
                status?: string | undefined;
                video_url?: string | undefined;
            } | null;
            id: number;
        }[];
        selectedPatientExaminationId: number | null;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        patientExaminations: PatientExamination[];
        selectedPatientExaminationId: number | null;
    }>) => boolean;
    getError: (state: {
        loading: boolean;
        error: string | null;
        patientExaminations: {
            patient: {
                id?: number | undefined;
                firstName: string;
                lastName: string;
                dob?: string | null | undefined;
                gender?: string | null | undefined;
                center?: string | null | undefined;
                email?: string | undefined;
                phone?: string | undefined;
                patientHash?: string | null | undefined;
                comments?: string | undefined;
                isRealPerson?: boolean | undefined;
                pseudonymFirstName?: string | null | undefined;
                pseudonymLastName?: string | null | undefined;
                sensitiveMetaId?: number | null | undefined;
                age?: number | null | undefined;
                createdAt?: string | undefined;
                updatedAt?: string | undefined;
            };
            examination: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                displayName?: string | undefined;
            };
            video: {
                [x: string]: any;
                id: number;
                center_name?: string | undefined;
                processor_name?: string | undefined;
                original_file_name?: string | undefined;
                status?: string | undefined;
                video_url?: string | undefined;
            } | null;
            id: number;
        }[];
        selectedPatientExaminationId: number | null;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        patientExaminations: PatientExamination[];
        selectedPatientExaminationId: number | null;
    }>) => string | null;
    getAllPatientExaminations: (state: {
        loading: boolean;
        error: string | null;
        patientExaminations: {
            patient: {
                id?: number | undefined;
                firstName: string;
                lastName: string;
                dob?: string | null | undefined;
                gender?: string | null | undefined;
                center?: string | null | undefined;
                email?: string | undefined;
                phone?: string | undefined;
                patientHash?: string | null | undefined;
                comments?: string | undefined;
                isRealPerson?: boolean | undefined;
                pseudonymFirstName?: string | null | undefined;
                pseudonymLastName?: string | null | undefined;
                sensitiveMetaId?: number | null | undefined;
                age?: number | null | undefined;
                createdAt?: string | undefined;
                updatedAt?: string | undefined;
            };
            examination: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                displayName?: string | undefined;
            };
            video: {
                [x: string]: any;
                id: number;
                center_name?: string | undefined;
                processor_name?: string | undefined;
                original_file_name?: string | undefined;
                status?: string | undefined;
                video_url?: string | undefined;
            } | null;
            id: number;
        }[];
        selectedPatientExaminationId: number | null;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        patientExaminations: PatientExamination[];
        selectedPatientExaminationId: number | null;
    }>) => {
        patient: {
            id?: number | undefined;
            firstName: string;
            lastName: string;
            dob?: string | null | undefined;
            gender?: string | null | undefined;
            center?: string | null | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            patientHash?: string | null | undefined;
            comments?: string | undefined;
            isRealPerson?: boolean | undefined;
            pseudonymFirstName?: string | null | undefined;
            pseudonymLastName?: string | null | undefined;
            sensitiveMetaId?: number | null | undefined;
            age?: number | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        };
        examination: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            displayName?: string | undefined;
        };
        video: {
            [x: string]: any;
            id: number;
            center_name?: string | undefined;
            processor_name?: string | undefined;
            original_file_name?: string | undefined;
            status?: string | undefined;
            video_url?: string | undefined;
        } | null;
        id: number;
    }[];
    getSelectedPatientExaminationId: (state: {
        loading: boolean;
        error: string | null;
        patientExaminations: {
            patient: {
                id?: number | undefined;
                firstName: string;
                lastName: string;
                dob?: string | null | undefined;
                gender?: string | null | undefined;
                center?: string | null | undefined;
                email?: string | undefined;
                phone?: string | undefined;
                patientHash?: string | null | undefined;
                comments?: string | undefined;
                isRealPerson?: boolean | undefined;
                pseudonymFirstName?: string | null | undefined;
                pseudonymLastName?: string | null | undefined;
                sensitiveMetaId?: number | null | undefined;
                age?: number | null | undefined;
                createdAt?: string | undefined;
                updatedAt?: string | undefined;
            };
            examination: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                displayName?: string | undefined;
            };
            video: {
                [x: string]: any;
                id: number;
                center_name?: string | undefined;
                processor_name?: string | undefined;
                original_file_name?: string | undefined;
                status?: string | undefined;
                video_url?: string | undefined;
            } | null;
            id: number;
        }[];
        selectedPatientExaminationId: number | null;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        patientExaminations: PatientExamination[];
        selectedPatientExaminationId: number | null;
    }>) => number | null;
}, {
    fetchPatientExaminations(patientId: number): Promise<void>;
    addPatientExamination(pe: PatientExamination): void;
    removePatientExamination(id: number): void;
    setCurrentPatientExaminationId(id: number | null): void;
    getCurrentPatientExaminationId(): number | null;
}>;
