import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
describe('reportingFlowStore case flags', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });
    it('reports active case once patient, examination and patient-examination are set', () => {
        const flow = useReportingFlowStore();
        flow.setCaseSelection({ selectedPatientId: 1, selectedExaminationId: 2 });
        flow.setLookupSession({ patientExaminationId: 3, lookupToken: null, status: 'idle' });
        expect(flow.hasActiveCase).toBe(true);
    });
});
