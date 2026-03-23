import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
export async function fetchPatientExaminationDraft(patientExaminationId) {
    const response = await axiosInstance.get(r(endpoints.examination.patientExaminationDraft(patientExaminationId)));
    return response.data;
}
export async function savePatientExaminationDraft(params) {
    const response = await axiosInstance.put(r(endpoints.examination.patientExaminationDraft(params.patientExaminationId)), {
        module_name: params.moduleName,
        template_name: params.templateName || '',
        payload: params.payload
    });
    return response.data;
}
