import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FrameAnnotation from '../FrameAnnotation.vue';
const hoisted = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    queueStore: null
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
vi.mock('@/stores/auth_kc', () => ({
    useAuthKcStore: () => ({
        user: {
            sub: 'kc-user-7',
            username: 'annotator'
        }
    })
}));
function buildQueueStore() {
    const nextTasks = [
        {
            id: 'task-1',
            data: {
                frameId: 101,
                imageUrl: '/media/frame-101.jpg',
                existingExternalId: 'external-101'
            }
        },
        null
    ];
    return {
        selectedLabelGroupId: '3',
        taskMode: 'random',
        targetLabelName: 'Polyp',
        filterLabelName: null,
        allowRandomFallback: true,
        informationSource: 'frame_annotation_frontend',
        taskQueue: [],
        taskQuerySignature: 'random|Polyp||frame_annotation_frontend|1',
        setSelectedLabelGroupId: vi.fn(),
        setTaskMode: vi.fn(),
        setTargetLabelName: vi.fn(),
        setFilterLabelName: vi.fn(),
        setAllowRandomFallback: vi.fn(),
        setInformationSource: vi.fn(),
        clearQueue: vi.fn(),
        fetchBatch: vi.fn().mockResolvedValue(undefined),
        popNextTask: vi.fn(() => nextTasks.shift() ?? null)
    };
}
describe('FrameAnnotation route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.queueStore = buildQueueStore();
        hoisted.get.mockResolvedValue({
            data: {
                results: [
                    { id: 3, name: 'Upper GI' },
                    { id: 4, name: 'Lower GI' }
                ]
            }
        });
    });
    it('loads label groups and submits frame annotations through the route API', async () => {
        hoisted.post.mockResolvedValue({ data: { ok: true } });
        const wrapper = mount(FrameAnnotation);
        await flushPromises();
        expect(hoisted.get).toHaveBeenCalledWith('media/videos/labels/list/');
        expect(hoisted.queueStore.fetchBatch).toHaveBeenCalledWith(10);
        expect(wrapper.text()).toContain('Frame #101');
        await wrapper.get('button.btn-success').trigger('click');
        await flushPromises();
        expect(hoisted.post).toHaveBeenCalledWith('media/annotations/frames/bulk-upsert/', [
            {
                frameId: 101,
                choiceName: 'Polyp: present',
                value: true,
                floatValue: null,
                informationSourceName: 'frame_annotation_frontend',
                annotator: 'oidc:kc-user-7',
                externalAnnotationId: 'external-101',
                modelMetaId: null
            }
        ]);
        expect(hoisted.queueStore.popNextTask).toHaveBeenCalledTimes(2);
        expect(wrapper.text()).toContain('No annotation tasks available.');
    });
    it('skips the current task via the frame-annotation route endpoint', async () => {
        hoisted.post.mockResolvedValue({ data: { ok: true } });
        const wrapper = mount(FrameAnnotation);
        await flushPromises();
        await wrapper.get('button.btn-outline-warning').trigger('click');
        await flushPromises();
        expect(hoisted.post).toHaveBeenCalledWith('media/annotations/frames/skip/', {
            frameId: 101,
            annotator: 'oidc:kc-user-7'
        });
    });
});
