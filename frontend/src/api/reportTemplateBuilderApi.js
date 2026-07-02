import axiosInstance, { dtypesApi } from '@/api/axiosInstance';
export async function saveReportTemplateDefinition(payload) {
    const response = await axiosInstance.post(dtypesApi('report-templates/builder/templates'), payload);
    return response.data;
}
