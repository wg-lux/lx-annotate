import { defineStore } from 'pinia';
import axios from 'axios';
import { dtypesApi } from '@/api/axiosInstance';
export const useImageStore = defineStore('image', {
    state: () => ({
        imageStatus: 'idle',
        loading: false,
        error: null,
        data: []
    }),
    actions: {
        async fetchImages() {
            this.loading = true;
            this.error = null;
            try {
                const response = await axios.get(dtypesApi('images'));
                this.data = response.data.map((image) => ({
                    id: image.id,
                    imageUrl: image.image_url,
                    status: image.status || 'in_progress',
                    assignedUser: image.assigned_user || null
                }));
            }
            catch (error) {
                this.error = error.message || 'Fehler beim Laden der Bilder';
            }
            finally {
                this.loading = false;
            }
        }
    }
});
