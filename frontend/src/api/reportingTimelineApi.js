import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
export function pickPreferredStream(options = []) {
    return (options.find((option) => option.type === 'processed')?.url ??
        options.find((option) => option.type === 'raw')?.url ??
        null);
}
export function pickPreferredReportStream(options = []) {
    return (options.find((option) => option.type === 'raw')?.url ??
        options.find((option) => option.type === 'processed')?.url ??
        null);
}
export async function fetchPatientTimelineLatest(params) {
    const response = await axiosInstance.get(r(endpoints.media.patientTimeline(params.patientId)), {
        params: {
            latest_only: true,
            ...(params.patientExaminationId
                ? { patient_examination_id: params.patientExaminationId }
                : {})
        }
    });
    return response.data;
}
