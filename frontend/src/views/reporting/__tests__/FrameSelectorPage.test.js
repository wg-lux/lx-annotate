import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { endpoints } from '@/types/api/endpoints';
import FrameSelectorPage from '../FrameSelectorPage.vue';
const hoisted = vi.hoisted(() => ({
    flowRef: { current: null },
    get: vi.fn(),
    patch: vi.fn(),
    ensureCatalogLoaded: vi.fn()
}));
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: hoisted.get,
        patch: hoisted.patch
    },
    r: (path) => path
}));
vi.mock('@/stores/reportingFlowStore', () => ({
    useReportingFlowStore: () => hoisted.flowRef.current
}));
vi.mock('@/composables/reporting/useFindingSelectors', () => ({
    useFindingSelectors: () => ({
        catalogFindings: computed(() => [
            { id: 11, name: 'polyp', nameDe: 'Polyp' },
            { id: 12, name: 'bleeding', nameDe: 'Blutung' }
        ]),
        ensureCatalogLoaded: hoisted.ensureCatalogLoaded
    })
}));
function buildFrameSelectorState() {
    return {
        patientExaminationId: 42,
        reportId: 88,
        reportStatus: 'draft',
        count: 1,
        results: [
            {
                segmentId: 7,
                videoId: 5,
                labelName: 'Antrum',
                startFrameNumber: 10,
                endFrameNumber: 30,
                selectedFrameNumber: 15,
                selectedFrame: {
                    frameId: 901,
                    frameNumber: 15,
                    timestamp: 1.5,
                    relativePath: 'frames/frame-15.jpg',
                    fileExists: true
                },
                attachedFinding: {
                    patientFindingId: 501,
                    findingId: 11,
                    findingName: 'Polyp'
                }
            }
        ]
    };
}
function buildFlowStore() {
    const flow = reactive({
        patientExaminationId: 42,
        selectedExaminationId: 9,
        activeReportId: null,
        lookupToken: 'lookup-token',
        mediaPreload: {
            latestFrames: [
                {
                    videoId: 5,
                    frameNumber: 22,
                    category: 'recent',
                    streamUrl: `/api/${endpoints.media.videoStream(5)}?frame=22`
                }
            ]
        },
        setActiveReportId: vi.fn((id) => {
            flow.activeReportId = id;
        })
    });
    return flow;
}
function getButtonByText(wrapper, label) {
    const button = wrapper
        .findAll('button')
        .find((candidate) => candidate.text().includes(label));
    if (!button) {
        throw new Error(`Button with label "${label}" not found.`);
    }
    return button;
}
describe('FrameSelectorPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.flowRef.current = buildFlowStore();
        hoisted.ensureCatalogLoaded.mockResolvedValue(undefined);
    });
    it('loads the selector state on mount and opens latest preload frames', async () => {
        hoisted.get.mockResolvedValue({ data: buildFrameSelectorState() });
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        const wrapper = mount(FrameSelectorPage, {
            global: {
                stubs: {
                    LookupStatusPanel: true
                }
            }
        });
        await flushPromises();
        expect(hoisted.ensureCatalogLoaded).toHaveBeenCalledTimes(1);
        expect(hoisted.get).toHaveBeenCalledWith('patient-examination-reports/segment-frame-selector/?patient_examination_id=42');
        expect(hoisted.flowRef.current.setActiveReportId).toHaveBeenCalledWith(88);
        expect(wrapper.text()).toContain('Antrum');
        expect(wrapper.text()).toContain('Ausgewählt: 15');
        await getButtonByText(wrapper, '#22').trigger('click');
        expect(openSpy).toHaveBeenCalledWith(`/api/${endpoints.media.videoStream(5)}?frame=22`, '_blank', 'noopener,noreferrer');
    });
    it('patches segment actions and manual frame selection through the reporting route', async () => {
        hoisted.get.mockResolvedValue({ data: buildFrameSelectorState() });
        hoisted.patch
            .mockResolvedValueOnce({ data: buildFrameSelectorState() })
            .mockResolvedValueOnce({
            data: {
                ...buildFrameSelectorState(),
                results: [
                    {
                        ...buildFrameSelectorState().results[0],
                        selectedFrameNumber: 19,
                        selectedFrame: {
                            frameId: 902,
                            frameNumber: 19,
                            timestamp: 1.9,
                            relativePath: 'frames/frame-19.jpg',
                            fileExists: true
                        }
                    }
                ]
            }
        });
        const wrapper = mount(FrameSelectorPage, {
            global: {
                stubs: {
                    LookupStatusPanel: true
                }
            }
        });
        await flushPromises();
        await getButtonByText(wrapper, 'Zufallsframe').trigger('click');
        await flushPromises();
        expect(hoisted.patch).toHaveBeenNthCalledWith(1, 'patient-examination-reports/segment-frame-selector/', {
            patientExaminationId: 42,
            reportId: 88,
            segmentId: 7,
            action: 'random',
            findingId: 11
        });
        await wrapper.get('input[type="number"]').setValue('19');
        await getButtonByText(wrapper, 'Setzen').trigger('click');
        await flushPromises();
        expect(hoisted.patch).toHaveBeenNthCalledWith(2, 'patient-examination-reports/segment-frame-selector/', {
            patientExaminationId: 42,
            reportId: 88,
            segmentId: 7,
            action: 'set',
            frameNumber: 19,
            findingId: 11
        });
        expect(wrapper.text()).toContain('Frame manuell gesetzt.');
    });
});
