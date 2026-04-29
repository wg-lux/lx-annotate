export type TimelineStreamOption = {
    type: string;
    url: string;
};
export type TimelinePatient = {
    id: number;
    firstName: string | null;
    lastName: string | null;
    dob: string | null;
    isRealPerson: boolean;
    patientHash: string | null;
};
export type TimelineLatestReport = {
    mediaType: 'pdf' | 'full_report' | string;
    id: number;
    rawPdfId?: number | null;
    patientExaminationId: number | null;
    anonymizedText: string | null;
    documentType: string | null;
    streamOptions: TimelineStreamOption[];
};
export type TimelineLatestVideo = {
    mediaType: 'video' | string;
    id: number;
    patientExaminationId: number | null;
    streamOptions: TimelineStreamOption[];
};
export type TimelineLatestFrame = {
    videoId: number;
    frameNumber: number;
    category: string | null;
    selectionSource: string | null;
    segmentId: number | null;
    segmentLabel: string | null;
    streamUrl: string;
};
export type TimelineLatestPayload = {
    patient: TimelinePatient;
    latestReport: TimelineLatestReport | null;
    latestVideo: TimelineLatestVideo | null;
    latestFrames: TimelineLatestFrame[];
};
export declare function pickPreferredStream(options?: TimelineStreamOption[]): string | null;
export declare function fetchPatientTimelineLatest(params: {
    patientId: number;
    patientExaminationId?: number | null;
}): Promise<TimelineLatestPayload>;
