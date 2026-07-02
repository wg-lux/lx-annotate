import { defineStore } from 'pinia';
import axiosInstance, { r } from '@/api/axiosInstance';
import { findingsApi, parseFindingsApiError } from '@/api/findingsApi';
import { endpoints } from '@/types/api/endpoints';
import { getCoreConceptDisplayName } from '@/types/coreConcepts';
export const useExaminationStore = defineStore('examination', {
    state: () => ({
        loading: false,
        error: null,
        exams: [],
        selectedExaminationId: null,
        // cache (optional)
        findingsByExam: new Map(),
        classificationsByFinding: new Map()
    }),
    getters: {
        examinations(state) {
            return state.exams;
        },
        examinationsDropdown(state) {
            return state.exams.map((e) => ({
                id: e.id,
                name: e.name,
                displayName: getCoreConceptDisplayName(e, e.name)
            }));
        },
        selectedExamination(state) {
            return state.exams.find((e) => e.id === state.selectedExaminationId) ?? null;
        },
        availableFindings(state) {
            const id = state.selectedExaminationId;
            if (!id)
                return [];
            return state.findingsByExam.get(id) ?? [];
        }
    },
    actions: {
        setSelectedExamination(id) {
            this.selectedExaminationId = id;
        },
        /**
         * Load examinations list.
         * We have 2 viable endpoints in your project:
         *  - examinations/  (generic list)
         *  - patient-examinations/examinations_dropdown/ (already tailored for dropdown)
         *
         * While patient Examinations will filter the examinations available for the patient, examinations query will return all available examinations.
         */
        async fetchExaminations() {
            this.loading = true;
            this.error = null;
            try {
                const normalizeRows = (rows) => {
                    this.exams = rows
                        .map((entry) => {
                        if (!entry || typeof entry !== 'object')
                            return null;
                        const row = entry;
                        const fallbackName = typeof row.name === 'string' ? row.name : typeof row.name_de === 'string' ? row.name_de : '';
                        const name = typeof row.name === 'string'
                            ? row.name
                            : typeof row.nameDe === 'string'
                                ? String(row.nameDe)
                                : fallbackName;
                        const nameDe = typeof row.nameDe === 'string'
                            ? row.nameDe
                            : typeof row.name_de === 'string'
                                ? row.name_de
                                : undefined;
                        const nameEn = typeof row.nameEn === 'string'
                            ? row.nameEn
                            : typeof row.name_en === 'string'
                                ? row.name_en
                                : undefined;
                        const displayNameSource = typeof row.displayName === 'string'
                            ? String(row.displayName)
                            : typeof row.display_name === 'string'
                                ? String(row.display_name)
                                : undefined;
                        return {
                            id: Number(row.id),
                            name,
                            nameDe,
                            nameEn,
                            name_de: nameDe,
                            name_en: nameEn,
                            displayName: getCoreConceptDisplayName({
                                name,
                                nameDe,
                                nameEn,
                                displayName: displayNameSource
                            }, name)
                        };
                    })
                        .filter((entry) => entry && Number.isFinite(entry.id));
                };
                const dropdownPayload = await axiosInstance.get(r(endpoints.examination.examinationsDropdown));
                const dropdownRows = Array.isArray(dropdownPayload.data) ? dropdownPayload.data :
                    Array.isArray(dropdownPayload.data?.results)
                        ? dropdownPayload.data.results
                        : [];
                if (Array.isArray(dropdownRows) && dropdownRows.length > 0) {
                    normalizeRows(dropdownRows);
                    return;
                }
                const fallbackPayload = await axiosInstance.get(r(endpoints.router.examinations));
                const fallbackRows = Array.isArray(fallbackPayload.data)
                    ? fallbackPayload.data
                    : Array.isArray(fallbackPayload.data?.results)
                        ? fallbackPayload.data.results
                        : [];
                normalizeRows(fallbackRows);
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
                const findings = await findingsApi.getExaminationFindings(examId);
                this.findingsByExam.set(examId, findings);
                return findings;
            }
            catch (e) {
                const parsed = parseFindingsApiError(e);
                this.error = parsed.message;
                return [];
            }
            finally {
                this.loading = false;
            }
        },
        async getCurrentExaminationId() {
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
                const classifications = await findingsApi.getFindingClassifications(findingId);
                const payload = {
                    locationClassifications: classifications.filter((classification) => classification.classificationTypes.includes('location')),
                    morphologyClassifications: classifications.filter((classification) => classification.classificationTypes.includes('morphology'))
                };
                this.classificationsByFinding.set(findingId, payload);
                return payload;
            }
            catch (e) {
                const parsed = parseFindingsApiError(e);
                this.error = parsed.message;
                return { locationClassifications: [], morphologyClassifications: [] };
            }
            finally {
                this.loading = false;
            }
        }
    }
});
