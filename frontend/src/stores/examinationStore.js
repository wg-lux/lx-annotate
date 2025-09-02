import { defineStore } from 'pinia';
import { reactive, ref, computed, readonly } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
export const useExaminationStore = defineStore('examination', {
    state: () => ({
        loading: false,
        error: null,
        exams: [],
        selectedExaminationId: null,
        // cache (optional)
        findingsByExam: new Map(),
        classificationsByFinding: new Map(),
    }),
    getters: {
        examinations(state) {
            return state.exams;
        },
        examinationsDropdown(state) {
            return state.exams.map(e => ({
                id: e.id,
                name: e.name,
                displayName: e.displayName ?? e.name_de ?? e.name,
            }));
        },
        selectedExamination(state) {
            return state.exams.find(e => e.id === state.selectedExaminationId) ?? null;
        },
        availableFindings(state) {
            const id = state.selectedExaminationId;
            if (!id)
                return [];
            return state.findingsByExam.get(id) ?? [];
        },
    },
    actions: {
        setSelectedExamination(id) {
            this.selectedExaminationId = id;
        },
        /**
         * Load examinations list.
         * #TODO: You have 2 viable endpoints in your project:
         *  - /api/examinations/  (generic list)
         *  - /api/patient-examinations/examinations_dropdown/ (already tailored for dropdown)
         *
         * Pick ONE. Below I show the dropdown endpoint because it already returns displayName.
         */
        async fetchExaminations() {
            this.loading = true;
            this.error = null;
            try {
                const res = await axiosInstance.get('/api/examinations/');
                // Normalize to Examination[]
                this.exams = res.data.map((e) => ({
                    id: e.id,
                    name: e.name,
                    name_de: e.name_de,
                    name_en: e.name_en,
                    displayName: e.displayName ?? e.name_de ?? e.name_en ?? e.name,
                }));
            }
            catch (e) {
                this.error = e?.response?.data?.detail ?? e?.message ?? 'Unbekannter Fehler';
            }
            finally {
                this.loading = false;
            }
        },
        /**
         * Findings for the selected exam.
         * URLs (from show_urls): /api/examinations/<int:examination_id>/findings/
         */
        async loadFindingsForExamination(examId) {
            if (!examId)
                return [];
            this.loading = true;
            this.error = null;
            try {
                const res = await axiosInstance.get(`/api/examinations/${examId}/findings/`);
                const findings = res.data;
                this.findingsByExam.set(examId, findings);
                return findings;
            }
            catch (e) {
                this.error = e?.response?.data?.detail ?? e?.message ?? 'Unbekannter Fehler';
                return [];
            }
            finally {
                this.loading = false;
            }
        },
        async getCurrentPatientExaminationId() {
            if (this.selectedExaminationId)
                return this.selectedExaminationId;
            await this.fetchExaminations();
            return this.selectedExaminationId;
        },
        /**
         * Classifications for a finding
         * Your URLs: /api/findings/<int:finding_id>/classifications/
         * (You also have specific endpoints for location/morphology, but the combined one is easiest.)
         */
        async loadFindingClassifications(findingId) {
            this.loading = true;
            this.error = null;
            try {
                const res = await axiosInstance.get(`/api/findings/${findingId}/classifications/`);
                const payload = res.data;
                this.classificationsByFinding.set(findingId, payload);
                return payload;
            }
            catch (e) {
                this.error = e?.response?.data?.detail ?? e?.message ?? 'Unbekannter Fehler';
                return { locationClassifications: [], morphologyClassifications: [] };
            }
            finally {
                this.loading = false;
            }
        },
    },
});
