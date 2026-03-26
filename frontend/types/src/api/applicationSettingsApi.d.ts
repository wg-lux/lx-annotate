export interface ApplicationSettingsRecord {
    id: number;
    centerId: number | null;
    centerName: string | null;
    processorId: number | null;
    processorName: string | null;
    annotatorName: string | null;
    reportTemplateName: string | null;
    updatedAt: string | null;
}
export interface ApplicationSettingsUpdatePayload {
    centerId?: number | null;
    processorId?: number | null;
    reportTemplateName?: string | null;
}
export interface NamedDropdownOption {
    id: number;
    name: string;
}
export interface ValueLabelOption {
    value: string;
    label: string;
}
export interface ApplicationSettingsDropdowns {
    centers: NamedDropdownOption[];
    processors: NamedDropdownOption[];
    reportTemplates: ValueLabelOption[];
}
export declare function fetchApplicationSettings(): Promise<ApplicationSettingsRecord>;
export declare function updateApplicationSettings(payload: ApplicationSettingsUpdatePayload): Promise<ApplicationSettingsRecord>;
export declare function fetchApplicationSettingsDropdowns(): Promise<ApplicationSettingsDropdowns>;
