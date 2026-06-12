import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import FrameAnnotation from '../FrameAnnotation.vue';
const hoisted = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    queueStore: null,
    fetchAiDatasetOptions: vi.fn()
}));
vi.mock('uuid', () => ({
    v7: () => 'uuid-annotation-1'
}));
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: hoisted.get,
        post: hoisted.post
    },
    r: (path) => path
}));
vi.mock('@/stores/annotationQueue', () => ({
    useAnnotationQueueStore: () => hoisted.queueStore
}));
vi.mock('@/api/aiDatasetApi', () => ({
    fetchAiDatasetOptions: hoisted.fetchAiDatasetOptions
}));
vi.mock('@/stores/auth_kc', () => ({
    useAuthKcStore: () => ({
        user: {
            sub: 'kc-user-7',
            username: 'annotator'
        }
    })
}));
function buildQueueStore(overrides = {}) {
    const nextTasks = [
        {
            id: 'task-1',
            data: {
                frameId: 101,
                videoId: 55,
                frameNumber: 5000,
                relativePath: 'frames/frame_005000.jpg',
                datasetSelectionLabelId: 11,
                datasetSelectionLabelName: 'Polyp',
                datasetSelectionSource: 'segments',
                datasetBucket: 'positive',
                imageUrl: '/media/frame-101.jpg',
                existingExternalId: 'external-101',
                annotationMode: 'multilabel',
                labelOptions: [
                    { id: 11, name: 'Polyp' },
                    { id: 12, name: 'Bleeding' }
                ],
                manualAnnotations: [
                    {
                        labelId: 12,
                        labelName: 'Bleeding',
                        value: false,
                        externalAnnotationId: 'existing-bleeding'
                    }
                ],
                predictionAnnotations: [
                    {
                        labelId: 11,
                        labelName: 'Polyp',
                        value: true,
                        floatValue: 0.91,
                        modelMetaId: 5
                    }
                ],
                suggestedLabelIds: [11]
            }
        },
        null
    ];
    const store = reactive({
        selectedLabelGroupId: '3',
        taskMode: 'random',
        targetLabelName: 'Polyp',
        filterLabelName: null,
        allowRandomFallback: true,
        informationSource: 'frame_annotation_frontend',
        frameFileType: 'auto',
        aiDatasetId: null,
        aiDatasetName: null,
        aiDatasetType: null,
        annotatorPrincipal: null,
        taskQueue: [],
        taskQuerySignature: 'random|Polyp||frame_annotation_frontend|auto|1',
        setSelectedLabelGroupId: vi.fn(),
        setTaskMode: vi.fn(),
        setTargetLabelName: vi.fn(),
        setFilterLabelName: vi.fn(),
        setAllowRandomFallback: vi.fn(),
        setInformationSource: vi.fn(),
        setFrameFileType: vi.fn(),
        setAiDataset: vi.fn(),
        setAnnotatorPrincipal: vi.fn(),
        clearQueue: vi.fn(),
        fetchBatch: vi.fn().mockResolvedValue(undefined),
        popNextTask: vi.fn(() => nextTasks.shift() ?? null),
        ...overrides
    });
    store.setSelectedLabelGroupId = vi.fn((groupId) => {
        store.selectedLabelGroupId = groupId && groupId.trim() ? groupId : null;
    });
    store.setTaskMode = vi.fn((mode) => {
        store.taskMode = mode === 'filtered' ? 'filtered' : 'random';
    });
    store.setTargetLabelName = vi.fn((label) => {
        store.targetLabelName = label?.trim() ?? '';
    });
    store.setFilterLabelName = vi.fn((label) => {
        store.filterLabelName = label && label.trim() ? label.trim() : null;
    });
    store.setAllowRandomFallback = vi.fn((enabled) => {
        store.allowRandomFallback = !!enabled;
    });
    store.setInformationSource = vi.fn((source) => {
        store.informationSource = source?.trim() || 'manual_annotation';
    });
    store.setFrameFileType = vi.fn((fileType) => {
        store.frameFileType =
            fileType === 'raw' || fileType === 'processed' ? fileType : 'auto';
        store.taskQuerySignature = `random|Polyp||${store.informationSource}|${store.frameFileType}|1`;
    });
    store.setAiDataset = vi.fn((datasetName, datasetType, datasetId = null) => {
        store.aiDatasetId =
            datasetId !== null && datasetId !== undefined && String(datasetId).trim()
                ? String(datasetId).trim()
                : null;
        store.aiDatasetName = datasetName?.trim() || null;
        store.aiDatasetType = datasetType?.trim() || null;
    });
    store.setAnnotatorPrincipal = vi.fn((principal) => {
        store.annotatorPrincipal = principal?.trim() || null;
    });
    return store;
}
function mountFrameAnnotation() {
    return mount(FrameAnnotation, {
        global: {
            stubs: {
                RouterLink: {
                    props: ['to'],
                    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>'
                }
            }
        }
    });
}
async function expectTextEventually(wrapper, text) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        await flushPromises();
        if (wrapper.text().includes(text))
            return;
    }
    expect(wrapper.text()).toContain(text);
}
function installGetMock(options = {}) {
    const { streamStatus = 200, streamBody = new Blob(['frame'], { type: options.streamContentType ?? 'image/jpeg' }), streamContentType = 'image/jpeg' } = options;
    hoisted.get.mockImplementation((url) => {
        if (url === 'media/videos/label-sets/list/') {
            return Promise.resolve({
                data: {
                    results: [
                        { id: 3, name: 'Upper GI', version: 1, labelCount: 2 },
                        { id: 4, name: 'Lower GI', version: 2, labelCount: 4 }
                    ]
                }
            });
        }
        if (url === 'media/annotations/frames/boxes/') {
            return Promise.resolve({ data: { results: [] } });
        }
        if (url.startsWith('/media/frame-') || url.includes('/decoded-stream/')) {
            return Promise.resolve({
                status: streamStatus,
                data: streamBody,
                headers: { 'content-type': streamContentType }
            });
        }
        return Promise.resolve({ data: { results: [] } });
    });
}
describe('FrameAnnotation route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        window.history.pushState({}, '', '/frame-annotation');
        hoisted.fetchAiDatasetOptions.mockResolvedValue([
            {
                id: 7,
                value: 'Dataset A',
                label: 'Dataset A',
                datasetType: 'image',
                aiModelType: 'image_multilabel_classification',
                isActive: true,
                nameCount: 1
            },
            {
                id: 9,
                value: 'PHI Dataset',
                label: 'PHI Dataset',
                datasetType: 'image',
                aiModelType: 'phi_region_detector',
                isActive: true,
                nameCount: 1
            }
        ]);
        hoisted.queueStore = buildQueueStore();
        installGetMock();
    });
    it('loads label groups and submits multilabel frame annotations through the route API', async () => {
        hoisted.post.mockResolvedValue({ data: { ok: true } });
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        expect(hoisted.get).toHaveBeenCalledWith('media/videos/label-sets/list/');
        expect(hoisted.fetchAiDatasetOptions).toHaveBeenCalledTimes(1);
        expect(hoisted.queueStore.fetchBatch).toHaveBeenCalledWith(10);
        expect(wrapper.get('[data-test="frame-number-badge"]').text()).toContain('Frame 5000');
        expect(wrapper.get('[data-test="frame-id-badge"]').text()).toContain('Frame-ID 101');
        expect(wrapper.get('[data-test="video-id-badge"]').text()).toContain('Video-ID 55');
        expect(wrapper.get('[data-test="dataset-selection-badge"]').text()).toContain('Polyp');
        expect(wrapper.text()).toContain('Polyp');
        expect(wrapper.text()).toContain('Bleeding');
        expect(wrapper.text()).toContain('KI 91%');
        await wrapper.get('button.btn-success').trigger('click');
        await flushPromises();
        expect(hoisted.post).toHaveBeenCalledWith('media/annotations/frames/bulk-upsert/', {
            videoId: 55,
            annotations: [
                {
                    frameId: 101,
                    labelId: 11,
                    value: true,
                    floatValue: null,
                    informationSourceName: 'frame_annotation_frontend',
                    annotator: 'oidc:kc-user-7',
                    externalAnnotationId: 'external-101:11',
                    modelMetaId: null
                },
                {
                    frameId: 101,
                    labelId: 12,
                    value: false,
                    floatValue: null,
                    informationSourceName: 'frame_annotation_frontend',
                    annotator: 'oidc:kc-user-7',
                    externalAnnotationId: 'existing-bleeding',
                    modelMetaId: null
                }
            ]
        });
        expect(hoisted.queueStore.popNextTask).toHaveBeenCalledTimes(2);
        expect(wrapper.text()).toContain('Keine Annotationsaufgaben verfügbar.');
    });
    it('loads one initial task when the first label group is auto-selected', async () => {
        hoisted.queueStore = buildQueueStore({ selectedLabelGroupId: null });
        mountFrameAnnotation();
        await flushPromises();
        expect(hoisted.queueStore.setSelectedLabelGroupId).toHaveBeenCalledWith('4');
        expect(hoisted.queueStore.fetchBatch).toHaveBeenCalledTimes(1);
        expect(hoisted.queueStore.popNextTask).toHaveBeenCalledTimes(1);
    });
    it('includes the selected ai dataset id when saving frame labels', async () => {
        hoisted.queueStore = buildQueueStore({
            aiDatasetId: '7',
            aiDatasetName: 'Dataset A',
            aiDatasetType: 'image'
        });
        hoisted.post.mockResolvedValue({ data: { ok: true } });
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        await wrapper.get('[data-test="positive-example-button"]').trigger('click');
        await flushPromises();
        expect(hoisted.post).toHaveBeenCalledWith('media/annotations/frames/bulk-upsert/', expect.objectContaining({
            videoId: 55,
            aiDatasetId: 7
        }));
    });
    it('skips the current task via the frame-annotation route endpoint', async () => {
        hoisted.post.mockResolvedValue({ data: { ok: true } });
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        await wrapper.get('[data-test="exclude-dataset-button"]').trigger('click');
        await flushPromises();
        expect(hoisted.post).toHaveBeenCalledWith('media/annotations/frames/skip/', {
            frameId: 101,
            videoId: 55,
            annotator: 'oidc:kc-user-7',
            informationSourceName: 'frame_annotation_frontend'
        });
    });
    it('restarts the frame annotation queue with an override annotator and can revert it', async () => {
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        expect(hoisted.queueStore.setAnnotatorPrincipal).toHaveBeenLastCalledWith('oidc:kc-user-7');
        await wrapper.get('[data-test="annotator-override-input"]').setValue('reviewer-two');
        await wrapper.get('[data-test="annotator-override-apply"]').trigger('click');
        await flushPromises();
        expect(hoisted.queueStore.setAnnotatorPrincipal).toHaveBeenLastCalledWith('reviewer-two');
        expect(hoisted.queueStore.clearQueue).toHaveBeenCalled();
        expect(hoisted.queueStore.fetchBatch).toHaveBeenCalledTimes(2);
        expect(wrapper.text()).toContain('Aktiver Annotator: reviewer-two (Override)');
        await wrapper.get('[data-test="annotator-override-revert"]').trigger('click');
        await flushPromises();
        expect(hoisted.queueStore.setAnnotatorPrincipal).toHaveBeenLastCalledWith('oidc:kc-user-7');
        expect(wrapper.text()).toContain('Aktiver Annotator: oidc:kc-user-7');
    });
    it('lets the user switch the active dataset queue on the frame screen', async () => {
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        await wrapper.get('[data-test="frame-ai-dataset-select"]').setValue('9');
        await flushPromises();
        expect(hoisted.queueStore.setAiDataset).toHaveBeenCalledWith('PHI Dataset', 'image', 9);
        expect(wrapper.text()).toContain('Aktive KI-Datensatz-Warteschlange: PHI Dataset (image)');
        expect(wrapper.text()).toContain('ID 9');
        expect(wrapper.text()).toContain('Patienteninformationen-Datensätze verwenden nur Frames aus Videos mit vorhandenem Rohmaterial.');
    });
    it('lets the user switch the decoded frame source', async () => {
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        await wrapper.get('#frame-file-type').setValue('processed');
        await flushPromises();
        expect(hoisted.queueStore.setFrameFileType).toHaveBeenCalledWith('processed');
        expect(hoisted.queueStore.clearQueue).toHaveBeenCalled();
    });
    it('shows a visible extraction status while the backend reports pending frame extraction', async () => {
        installGetMock({
            streamStatus: 202,
            streamBody: new Blob([JSON.stringify({ status: 'frame_extraction_pending' })], {
                type: 'application/json'
            }),
            streamContentType: 'application/json'
        });
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        expect(wrapper.get('[data-test="frame-image-status"]').text()).toContain('Frame wird extrahiert');
    });
    it('shows decoded frame stream failures from the backend payload', async () => {
        installGetMock({
            streamStatus: 409,
            streamBody: new Blob([JSON.stringify({ status: 'frame_decode_failed', error: 'decode failed' })], {
                type: 'application/json'
            }),
            streamContentType: 'application/json'
        });
        const wrapper = mountFrameAnnotation();
        await expectTextEventually(wrapper, 'Frame konnte nicht dekodiert werden: decode failed');
    });
    it('offers a manual retry when frame loading fails', async () => {
        installGetMock({
            streamStatus: 500,
            streamBody: new Blob(['failed'], { type: 'text/plain' }),
            streamContentType: 'text/plain'
        });
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        expect(wrapper.get('[data-test="frame-image-status"]').text()).toContain('Frame konnte nicht geladen werden');
        const streamCallsBeforeRetry = hoisted.get.mock.calls.filter(([url]) => url === '/media/frame-101.jpg').length;
        await wrapper.get('[data-test="frame-image-retry-button"]').trigger('click');
        await flushPromises();
        const streamCallsAfterRetry = hoisted.get.mock.calls.filter(([url]) => url === '/media/frame-101.jpg').length;
        expect(streamCallsAfterRetry).toBe(streamCallsBeforeRetry + 1);
    });
    it('supports negative quick example action for the target label', async () => {
        hoisted.post.mockResolvedValue({ data: { ok: true } });
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        await wrapper.get('[data-test="negative-example-button"]').trigger('click');
        await flushPromises();
        expect(hoisted.post).toHaveBeenCalledWith('media/annotations/frames/bulk-upsert/', {
            videoId: 55,
            annotations: [
                {
                    frameId: 101,
                    labelId: 11,
                    value: false,
                    floatValue: null,
                    informationSourceName: 'frame_annotation_frontend',
                    annotator: 'oidc:kc-user-7',
                    externalAnnotationId: 'external-101:11',
                    modelMetaId: null
                },
                {
                    frameId: 101,
                    labelId: 12,
                    value: false,
                    floatValue: null,
                    informationSourceName: 'frame_annotation_frontend',
                    annotator: 'oidc:kc-user-7',
                    externalAnnotationId: 'existing-bleeding',
                    modelMetaId: null
                }
            ]
        });
    });
    it('supports positive quick example action for the target label', async () => {
        hoisted.post.mockResolvedValue({ data: { ok: true } });
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        await wrapper.get('[data-test="positive-example-button"]').trigger('click');
        await flushPromises();
        expect(hoisted.post).toHaveBeenCalledWith('media/annotations/frames/bulk-upsert/', {
            videoId: 55,
            annotations: [
                {
                    frameId: 101,
                    labelId: 11,
                    value: true,
                    floatValue: null,
                    informationSourceName: 'frame_annotation_frontend',
                    annotator: 'oidc:kc-user-7',
                    externalAnnotationId: 'external-101:11',
                    modelMetaId: null
                },
                {
                    frameId: 101,
                    labelId: 12,
                    value: false,
                    floatValue: null,
                    informationSourceName: 'frame_annotation_frontend',
                    annotator: 'oidc:kc-user-7',
                    externalAnnotationId: 'existing-bleeding',
                    modelMetaId: null
                }
            ]
        });
    });
    it('applies the PHI region route preset and saves empty background frames', async () => {
        window.history.pushState({}, '', '/frame-annotation?mode=phi_region&targetLabel=sensitive_region&informationSource=lx_anonymizer_evaluation&returnTo=/anonymisierung/validierung%3FfileId%3D5%26mediaType%3Dvideo');
        const nextTasks = [
            {
                id: 'task-phi',
                data: {
                    frameId: 202,
                    imageUrl: '/media/frame-202.jpg',
                    annotationMode: 'multilabel',
                    labelOptions: [
                        { id: 21, name: 'sensitive_region' },
                        { id: 22, name: 'safe_ui' }
                    ],
                    manualAnnotations: [],
                    predictionAnnotations: [],
                    suggestedLabelIds: []
                }
            },
            null
        ];
        hoisted.queueStore = buildQueueStore({
            targetLabelName: '',
            informationSource: 'manual_annotation',
            aiDatasetId: '9',
            aiDatasetName: 'PHI Dataset',
            aiDatasetType: 'image',
            popNextTask: vi.fn(() => nextTasks.shift() ?? null)
        });
        hoisted.post.mockResolvedValue({ data: { ok: true } });
        const wrapper = mountFrameAnnotation();
        await flushPromises();
        expect(hoisted.queueStore.setTaskMode).toHaveBeenCalledWith('random');
        expect(hoisted.queueStore.setTargetLabelName).toHaveBeenCalledWith('sensitive_region');
        expect(hoisted.queueStore.setInformationSource).toHaveBeenCalledWith('lx_anonymizer_evaluation');
        expect(wrapper.get('[data-test="box-label-select"]').element).toHaveProperty('disabled', true);
        expect(wrapper.text()).toContain('Boxen werden als sensitive_region gespeichert.');
        await wrapper.get('[data-test="phi-empty-background-button"]').trigger('click');
        await flushPromises();
        expect(hoisted.post).toHaveBeenCalledWith('media/annotations/frames/boxes/', {
            frame_id: 202,
            replace: true,
            information_source_name: 'lx_anonymizer_evaluation',
            annotator: 'oidc:kc-user-7',
            annotations: []
        });
    });
});
