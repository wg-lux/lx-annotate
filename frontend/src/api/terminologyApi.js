import axiosInstance, { dtypesApi } from '@/api/axiosInstance';
const TERMINOLOGY_BASE = dtypesApi('terminology');
export const MEDICAL_FIELD_OPTIONS = [
    { value: 'gastroenterology', label: 'Gastroenterologie' }
];
export async function fetchTerminologyBundles() {
    const response = await axiosInstance.get(`${TERMINOLOGY_BASE}/bundles`);
    return response.data;
}
export async function importTerminologyBundle(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`${TERMINOLOGY_BASE}/bundles/import`, formData);
    return response.data;
}
export async function selectTerminologyBundle(payload) {
    const response = await axiosInstance.post(`${TERMINOLOGY_BASE}/bundles/select`, payload);
    return response.data;
}
