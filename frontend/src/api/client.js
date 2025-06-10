import axiosInstance, { r } from './axiosInstance';
// Implementation of the API Client using the existing axiosInstance
class DefaultApiClient {
    async get(url) {
        return axiosInstance.get(r(url));
    }
    async post(url, data) {
        return axiosInstance.post(r(url), data);
    }
    async put(url, data) {
        return axiosInstance.put(r(url), data);
    }
    async patch(url, data) {
        return axiosInstance.patch(r(url), data);
    }
    async delete(url) {
        return axiosInstance.delete(r(url));
    }
}
// Factory function to create an API client instance
export function createApiClient() {
    return new DefaultApiClient();
}
// Default export for convenience
export default createApiClient;
