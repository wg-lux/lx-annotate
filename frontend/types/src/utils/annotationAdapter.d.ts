export type AuthIdentity = {
    sub?: string | null;
    username?: string | null;
} | null | undefined;
export interface BulkUpsertPayload {
    frameId: number;
    choiceName: string;
    value: boolean;
    floatValue: number | null;
    informationSourceName: string;
    annotator: string;
    externalAnnotationId: string;
    modelMetaId: number | null;
}
export declare function resolveAnnotator(identity: AuthIdentity): string;
export declare function toBulkUpsertPayload(lsResult: unknown[], frameId: number, annotator: string, existingExternalId?: string): BulkUpsertPayload;
