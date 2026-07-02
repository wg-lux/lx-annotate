import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
export async function makeReport(payload) {
    const { data } = await axiosInstance.post(r(endpoints.report.makeReport), payload);
    return data;
}
