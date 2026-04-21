import axiosInstance, { r } from '@/api/axiosInstance';
const SETTINGS_DETAIL_PATH = 'settings/application/';
const SETTINGS_CENTERS_PATH = 'settings/application/dropdowns/centers/';
const SETTINGS_PROCESSORS_PATH = 'settings/application/dropdowns/processors/';
const SETTINGS_ANNOTATORS_PATH = 'settings/application/dropdowns/annotators/';
const SETTINGS_REPORT_TEMPLATES_PATH = 'settings/application/dropdowns/report_templates/';
const SETTINGS_AI_DATASETS_PATH = 'settings/application/dropdowns/ai_datasets/';
const SETTINGS_AI_DATASET_EXPORT_PATH = 'settings/application/ai_dataset_export/';
const SETTINGS_BACKUP_PATH = 'settings/application/backup/';
export async function fetchApplicationSettings() {
    const { data } = await axiosInstance.get(r(SETTINGS_DETAIL_PATH));
    return data;
}
export async function updateApplicationSettings(payload) {
    const { data } = await axiosInstance.patch(r(SETTINGS_DETAIL_PATH), payload);
    return data;
}
export async function fetchApplicationSettingsDropdowns() {
    const [centersResponse, processorsResponse, annotatorsResponse, reportTemplatesResponse, aiDatasetsResponse] = await Promise.all([
        axiosInstance.get(r(SETTINGS_CENTERS_PATH)),
        axiosInstance.get(r(SETTINGS_PROCESSORS_PATH)),
        axiosInstance.get(r(SETTINGS_ANNOTATORS_PATH)),
        axiosInstance.get(r(SETTINGS_REPORT_TEMPLATES_PATH)),
        axiosInstance.get(r(SETTINGS_AI_DATASETS_PATH))
    ]);
    return {
        centers: centersResponse.data,
        processors: processorsResponse.data,
        annotators: annotatorsResponse.data,
        reportTemplates: reportTemplatesResponse.data,
        aiDatasets: aiDatasetsResponse.data
    };
}
export async function triggerApplicationBackup(payload) {
    const { data } = await axiosInstance.post(r(SETTINGS_BACKUP_PATH), payload);
    return data;
}
export async function triggerApplicationAiDatasetExport(payload) {
    const { data } = await axiosInstance.post(r(SETTINGS_AI_DATASET_EXPORT_PATH), payload);
    return data;
}
