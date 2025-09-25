export type RawPatientClassification = {
    id: number;
    finding?: number;
    classification?: {
        id: number;
        name: string;
        description?: string;
        required?: boolean;
    } | null;
    classification_id?: number;
    classification_choice?: {
        id: number;
        name: string;
    } | null;
    choice?: {
        id: number;
        name: string;
    } | null;
    is_active?: boolean;
    subcategories?: Record<string, unknown> | null;
    numerical_descriptors?: Record<string, unknown> | null;
};
export type SafePatientClassification = {
    id: number;
    finding: number;
    classification: {
        id: number;
        name: string;
        description?: string;
        required?: boolean;
    };
    choice: {
        id: number;
        name: string;
    };
    is_active: boolean;
    subcategories: Record<string, unknown>;
    numerical_descriptors: Record<string, unknown>;
};
export declare function adaptPatientClassification(raw: RawPatientClassification, defaultFinding?: number): SafePatientClassification | null;
export declare function adaptPatientClassifications(arr: RawPatientClassification[], defaultFinding?: number): SafePatientClassification[];
