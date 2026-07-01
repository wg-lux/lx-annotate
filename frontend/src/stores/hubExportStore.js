import { defineStore } from 'pinia';
import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
export const useHubExportStore = defineStore('hubExport', {
    state: () => ({
        loading: false,
        error: null,
        selectedTargetNodeKey: null,
        sourceNodeKey: null,
        hubNodes: [],
        items: [],
        configReady: false,
        configError: '',
        privacySummary: null
    }),
    getters: {
        eligibleItems: (state) => state.items.filter((item) => item.eligible),
        markedItems: (state) => state.items.filter((item) => item.markedForUpload)
    },
    actions: {
        async fetchOverview(targetNodeKey) {
            this.loading = true;
            this.error = null;
            try {
                const params = targetNodeKey ? { target_node_key: targetNodeKey } : undefined;
                const { data } = await axiosInstance.get(r(endpoints.hubExport.overview), { params });
                this.selectedTargetNodeKey = data.selectedTargetNodeKey;
                this.sourceNodeKey = data.sourceNodeKey;
                this.hubNodes = data.hubNodes;
                this.items = data.items;
                this.configReady = data.configReady;
                this.configError = data.configError;
                this.privacySummary = data.privacySummary ?? null;
                return data;
            }
            catch (error) {
                this.error = error?.response?.data?.detail || error?.message || 'Fehler beim Laden der Hub-Export-Übersicht.';
                throw error;
            }
            finally {
                this.loading = false;
            }
        },
        async markResources(resources) {
            if (!this.selectedTargetNodeKey) {
                throw new Error('Kein Hub-Ziel ausgewählt.');
            }
            await axiosInstance.post(r(endpoints.hubExport.mark), {
                targetNodeKey: this.selectedTargetNodeKey,
                resources
            });
            await this.fetchOverview(this.selectedTargetNodeKey);
        },
        async unmarkResources(resources) {
            if (!this.selectedTargetNodeKey) {
                throw new Error('Kein Hub-Ziel ausgewählt.');
            }
            await axiosInstance.post(r(endpoints.hubExport.unmark), {
                targetNodeKey: this.selectedTargetNodeKey,
                resources
            });
            await this.fetchOverview(this.selectedTargetNodeKey);
        }
    }
});
