import axiosInstance, { r } from '@/api/axiosInstance';
const SETTINGS_DETAIL_PATH = 'settings/application/';
const SETTINGS_CENTERS_PATH = 'settings/application/dropdowns/centers/';
const SETTINGS_PROCESSORS_PATH = 'settings/application/dropdowns/processors/';
const SETTINGS_REPORT_TEMPLATES_PATH = 'settings/application/dropdowns/report_templates/';
export async function fetchApplicationSettings() {
    const { data } = await axiosInstance.get(r(SETTINGS_DETAIL_PATH));
    return data;
}
export async function updateApplicationSettings(payload) {
    const { data } = await axiosInstance.patch(r(SETTINGS_DETAIL_PATH), payload);
    return data;
}
export async function fetchApplicationSettingsDropdowns() {
    const [centersResponse, processorsResponse, reportTemplatesResponse] = await Promise.all([
        axiosInstance.get(r(SETTINGS_CENTERS_PATH)),
        axiosInstance.get(r(SETTINGS_PROCESSORS_PATH)),
        axiosInstance.get(r(SETTINGS_REPORT_TEMPLATES_PATH))
    ]);
    return {
        centers: centersResponse.data,
        processors: processorsResponse.data,
        reportTemplates: reportTemplatesResponse.data
    };
}
