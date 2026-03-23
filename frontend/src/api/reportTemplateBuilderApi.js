import axiosInstance from '@/api/axiosInstance';
export async function saveReportTemplateDefinition(payload) {
    const response = await axiosInstance.post('/base_api/report-templates/builder/templates', payload);
    return response.data;
}
