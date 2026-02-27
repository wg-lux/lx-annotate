import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
describe('reportingFlowStore reset behavior', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });
    it('clears lookup and active report when patient changes', () => {
        const flow = useReportingFlowStore();
        flow.setLookupSession({ patientExaminationId: 77, lookupToken: 't1', status: 'active' });
        flow.setActiveReportId(400);
        flow.setCaseSelection({ selectedPatientId: 9, selectedExaminationId: 2 });
        flow.resetForPatientSwitch();
        expect(flow.lookupToken).toBeNull();
        expect(flow.activeReportId).toBeNull();
        expect(flow.patientExaminationId).toBeNull();
    });
});
