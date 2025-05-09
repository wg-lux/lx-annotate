/* src/stores/anonymizationStore.ts */
import { defineStore } from 'pinia';
import axiosInstance, { a, r } from '@/api/axiosInstance';
import axios from 'axios';
/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
export const useAnonymizationStore = defineStore('anonymization', {
    state: () => ({
        anonymizationStatus: 'idle',
        loading: false,
        error: null,
        pending: [], // Beachte: pending verwendet jetzt auch PatientData mit SensitiveMetaApiResponse
        current: null
    }),
    getters: {
        getCurrentItem: (state) => state.current,
    },
    actions: {
        /** Holt den nächsten PDF-Datensatz + zugehöriges SensitiveMeta
         *  und fügt beides zusammen. */
        async fetchNext(lastId) {
            this.loading = true;
            this.error = null;
            try {
                /* 1) PDF-Datensatz -------------------------------------------- */
                const pdfUrl = lastId
                    ? a(`anony_text/?last_id=${lastId}`)
                    : a('anony_text/');
                const { data: pdf } = await axiosInstance.get(pdfUrl); // Omit report_meta initially
                if (!pdf?.id) {
                    this.$patch({ current: null });
                    throw new Error('Backend lieferte keinen gültigen PDF-Datensatz.');
                }
                if (pdf.error) {
                    this.$patch({ current: null });
                    throw new Error('Backend meldet Fehler-Flag im PDF-Datensatz.');
                }
                /* 2) Sensitive-Meta nachladen ---------------------------------- */
                const metaUrl = a(`sensitivemeta/?id=${pdf.sensitive_meta_id}`);
                console.log(`Fetching sensitive meta from: ${metaUrl}`);
                const { data: metaResponse } = await axiosInstance.get(metaUrl);
                console.log('Received sensitive meta response data:', metaResponse);
                if (typeof metaResponse?.id !== 'number') {
                    console.error('Received invalid sensitive meta data structure:', metaResponse);
                    this.$patch({ current: null });
                    throw new Error('Ungültige Metadaten vom Backend empfangen (keine gültige ID gefunden).');
                }
                /* 3) Merge & State-Update -------------------------------------- */
                const merged = { ...pdf, report_meta: metaResponse };
                console.log('Merged data:', merged);
                this.$patch({
                    current: merged
                });
                return merged;
            }
            catch (err) {
                console.error('Error in fetchNext:', err);
                // Detailliertere Fehlermeldung, falls Axios-Fehler
                if (axios.isAxiosError(err)) {
                    console.error('Axios error details:', err.response?.status, err.response?.data);
                    this.error = `Fehler beim Laden der Metadaten (${err.response?.status}): ${err.message}`;
                }
                else {
                    this.error = err?.message ?? 'Unbekannter Fehler beim Laden.';
                }
                this.$patch({ current: null });
                return null;
            }
            finally {
                this.loading = false;
            }
        },
        /* ---------------------------------------------------------------- */
        /* Update-Methoden                                                  */
        /* ---------------------------------------------------------------- */
        async patchPdf(payload) {
            if (!payload.id)
                throw new Error('patchPdf: id fehlt im Payload.');
            console.log('Patching PDF with payload:', payload); // Logge Payload
            return axiosInstance.patch(a('update_anony_text/'), payload);
        },
        async patchVideo(payload) {
            return axiosInstance.patch(r('video/update_sensitivemeta/'), payload);
        },
        fetchPendingAnonymizations() {
            return this.pending;
        }
    }
});
