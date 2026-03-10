import axiosInstance from '@/api/axiosInstance';
import { normalizeFindingChoice, normalizeFindings, normalizeFindingClassification, normalizePatientFindingRow, normalizePatientFindingRows } from '@/api/findings.contract';
const ENDOREG_PATHS = {
    findings: '/api/findings/',
    examinationFindings: (examinationId) => `/api/examinations/${examinationId}/findings/`,
    findingClassifications: (findingId) => `/api/findings/${findingId}/classifications/`,
    classificationChoices: (classificationId) => `/api/classifications/${classificationId}/choices/`,
    patientFindings: '/api/patient-findings/',
    patientFindingById: (patientFindingId) => `/api/patient-findings/${patientFindingId}/`
};
const DTYPES_PATHS = {
    examinationFindings: (examinationId) => `/base_api/examinations/${examinationId}/findings/`,
    findingClassifications: (findingId) => `/base_api/findings/${findingId}/classifications/`,
    classificationChoices: (classificationId) => `/base_api/classifications/${classificationId}/choices/`,
    patientFindings: '/base_api/patient-findings/',
    patientFindingById: (patientFindingId) => `/base_api/patient-findings/${patientFindingId}/`,
    patientFindingClassifications: (patientFindingId) => `/base_api/patient-findings/${patientFindingId}/classifications/`
};
function normalizeMode(value) {
    if (value === 'dtypes' || value === 'dtypes_read' || value === 'endoreg') {
        return value;
    }
    return 'endoreg';
}
export function getFindingsBackendMode() {
    return normalizeMode(import.meta.env.VITE_FINDINGS_BACKEND);
}
function useDtypesRead(mode) {
    return mode === 'dtypes' || mode === 'dtypes_read';
}
function useDtypesWrite(mode) {
    return mode === 'dtypes';
}
function parseMessages(data) {
    if (!data)
        return [];
    if (typeof data === 'string')
        return data.trim() ? [data] : [];
    if (typeof data?.message === 'string' && data.message.trim())
        return [data.message];
    if (typeof data?.detail === 'string' && data.detail.trim())
        return [data.detail];
    const messages = [];
    if (typeof data === 'object' && !Array.isArray(data)) {
        for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value) && value.length) {
                messages.push(`${key}: ${value.join(', ')}`);
            }
            else if (typeof value === 'string' && value.trim()) {
                messages.push(`${key}: ${value}`);
            }
        }
    }
    return messages;
}
export function parseFindingsApiError(error) {
    const status = Number(error?.response?.status || 0) || undefined;
    const data = error?.response?.data;
    const explicitCode = String(data?.code || '').trim();
    const messages = parseMessages(data);
    const lowerMessage = messages.join(' | ').toLowerCase();
    if (explicitCode) {
        return {
            code: explicitCode,
            message: messages[0] || error?.message || 'Unbekannter Fehler',
            status,
            details: data
        };
    }
    if (status === 404) {
        return {
            code: 'not-found',
            message: messages[0] || 'Ressource nicht gefunden.',
            status,
            details: data
        };
    }
    if (status === 400) {
        if (lowerMessage.includes('required finding') ||
            lowerMessage.includes('erforderliche finding')) {
            return {
                code: 'required-finding',
                message: messages[0] || 'Erforderlicher Befund fehlt.',
                status,
                details: data
            };
        }
        if (lowerMessage.includes('duplicate') ||
            lowerMessage.includes('already') ||
            lowerMessage.includes('unique_active_finding')) {
            return {
                code: 'duplicate-finding',
                message: messages[0] || 'Befund ist bereits vorhanden.',
                status,
                details: data
            };
        }
        if (lowerMessage.includes('choice') ||
            lowerMessage.includes('classification_choice') ||
            lowerMessage.includes('klassifikation')) {
            return {
                code: 'invalid-choice',
                message: messages[0] || 'Ungültige Klassifikationsauswahl.',
                status,
                details: data
            };
        }
        if (lowerMessage.includes('finding')) {
            return {
                code: 'invalid-finding',
                message: messages[0] || 'Ungültiger Befund.',
                status,
                details: data
            };
        }
        return {
            code: 'bad-request',
            message: messages[0] || 'Ungültige Anfrage.',
            status,
            details: data
        };
    }
    return {
        code: 'unknown',
        message: messages[0] || error?.message || 'Unbekannter Fehler',
        status,
        details: data
    };
}
async function setClassificationsViaDtypes(patientFindingId, classifications) {
    await axiosInstance.post(DTYPES_PATHS.patientFindingClassifications(patientFindingId), {
        replace: true,
        classifications
    });
}
export const findingsApi = {
    getBackendMode() {
        return getFindingsBackendMode();
    },
    async listFindings() {
        const response = await axiosInstance.get(ENDOREG_PATHS.findings);
        return normalizeFindings(response.data);
    },
    async getExaminationFindings(examinationId) {
        const mode = getFindingsBackendMode();
        const path = useDtypesRead(mode)
            ? DTYPES_PATHS.examinationFindings(examinationId)
            : ENDOREG_PATHS.examinationFindings(examinationId);
        const response = await axiosInstance.get(path);
        return normalizeFindings(response.data);
    },
    async getFindingClassifications(findingId) {
        const mode = getFindingsBackendMode();
        const path = useDtypesRead(mode)
            ? DTYPES_PATHS.findingClassifications(findingId)
            : ENDOREG_PATHS.findingClassifications(findingId);
        const response = await axiosInstance.get(path);
        if (!Array.isArray(response.data))
            return [];
        return response.data.map(normalizeFindingClassification);
    },
    async getClassificationChoices(classificationId) {
        const mode = getFindingsBackendMode();
        const path = useDtypesRead(mode)
            ? DTYPES_PATHS.classificationChoices(classificationId)
            : ENDOREG_PATHS.classificationChoices(classificationId);
        const response = await axiosInstance.get(path);
        const payload = response.data;
        if (Array.isArray(payload))
            return payload.map(normalizeFindingChoice);
        return Array.isArray(payload?.choices) ? payload.choices.map(normalizeFindingChoice) : [];
    },
    async listPatientFindings(patientExaminationId) {
        const mode = getFindingsBackendMode();
        const basePath = useDtypesWrite(mode)
            ? DTYPES_PATHS.patientFindings
            : ENDOREG_PATHS.patientFindings;
        const response = await axiosInstance.get(basePath, {
            params: { patient_examination: patientExaminationId }
        });
        return normalizePatientFindingRows(response.data);
    },
    async createPatientFinding(payload) {
        const mode = getFindingsBackendMode();
        const classifications = Array.isArray(payload.classifications)
            ? payload.classifications
            : [];
        if (useDtypesWrite(mode)) {
            const response = await axiosInstance.post(DTYPES_PATHS.patientFindings, {
                patient_examination: payload.patientExamination,
                finding: payload.finding,
                classifications
            });
            return normalizePatientFindingRow(response.data);
        }
        // Endoreg-safe path:
        // 1) create finding on /api
        // 2) write classifications via dedicated /base_api route
        const createRes = await axiosInstance.post(ENDOREG_PATHS.patientFindings, {
            patientExamination: payload.patientExamination,
            finding: payload.finding
        });
        const created = normalizePatientFindingRow(createRes.data);
        const createdId = Number(created?.id);
        if (Number.isFinite(createdId) && classifications.length > 0) {
            await setClassificationsViaDtypes(createdId, classifications);
        }
        return created;
    },
    async updatePatientFinding(patientFindingId, payload) {
        const mode = getFindingsBackendMode();
        const classifications = Array.isArray(payload.classifications)
            ? payload.classifications
            : undefined;
        if (useDtypesWrite(mode)) {
            const response = await axiosInstance.patch(DTYPES_PATHS.patientFindingById(patientFindingId), {
                finding: payload.finding,
                is_active: payload.isActive,
                classifications
            });
            return normalizePatientFindingRow(response.data);
        }
        const patchPayload = {};
        if (typeof payload.finding === 'number')
            patchPayload.finding = payload.finding;
        if (typeof payload.isActive === 'boolean')
            patchPayload.isActive = payload.isActive;
        const response = await axiosInstance.patch(ENDOREG_PATHS.patientFindingById(patientFindingId), patchPayload);
        if (classifications) {
            await setClassificationsViaDtypes(patientFindingId, classifications);
        }
        return normalizePatientFindingRow(response.data);
    },
    async deletePatientFinding(patientFindingId) {
        const mode = getFindingsBackendMode();
        const path = useDtypesWrite(mode)
            ? DTYPES_PATHS.patientFindingById(patientFindingId)
            : ENDOREG_PATHS.patientFindingById(patientFindingId);
        await axiosInstance.delete(path);
    },
    async replacePatientFindingClassifications(patientFindingId, classifications) {
        const mode = getFindingsBackendMode();
        if (useDtypesWrite(mode)) {
            const response = await axiosInstance.post(DTYPES_PATHS.patientFindingClassifications(patientFindingId), { replace: true, classifications });
            return normalizePatientFindingRow(response.data);
        }
        await setClassificationsViaDtypes(patientFindingId, classifications);
        return null;
    }
};
