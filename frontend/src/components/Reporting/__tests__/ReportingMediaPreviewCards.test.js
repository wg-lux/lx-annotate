import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportingMediaPreviewCards from '../ReportingMediaPreviewCards.vue';
const { flowStore, buildPdfStreamUrl, buildVideoStreamUrl, } = vi.hoisted(() => ({
    flowStore: {
        mediaPreloadStatus: 'ready',
        mediaPreloadError: null,
        mediaPreload: {
            latestReport: {
                id: 99,
                rawPdfId: 12,
                anonymizedText: 'Extracted anonymized report text',
                documentType: 'colonoscopy',
                streamOptions: [
                    { type: 'raw', url: '/backend/report/raw' },
                    { type: 'processed', url: '/backend/report/processed' },
                    { type: 'audit', url: '/backend/report/audit' },
                ],
            },
            latestVideo: {
                id: 34,
                streamOptions: [
                    { type: 'raw', url: '/backend/video/raw' },
                    { type: 'processed', url: '/backend/video/processed' },
                    { type: 'poster', url: '/backend/video/poster' },
                ],
            },
        },
    },
    buildPdfStreamUrl: vi.fn(),
    buildVideoStreamUrl: vi.fn(),
}));
vi.mock('@/stores/reportingFlowStore', () => ({
    useReportingFlowStore: () => flowStore,
}));
vi.mock('@/utils/mediaUrls', () => ({
    buildPdfStreamUrl,
    buildVideoStreamUrl,
}));
describe('ReportingMediaPreviewCards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        flowStore.mediaPreloadStatus = 'ready';
        flowStore.mediaPreloadError = null;
        flowStore.mediaPreload = {
            latestReport: {
                id: 99,
                rawPdfId: 12,
                anonymizedText: 'Extracted anonymized report text',
                documentType: 'colonoscopy',
                streamOptions: [
                    { type: 'raw', url: '/backend/report/raw' },
                    { type: 'processed', url: '/backend/report/processed' },
                    { type: 'audit', url: '/backend/report/audit' },
                ],
            },
            latestVideo: {
                id: 34,
                streamOptions: [
                    { type: 'raw', url: '/backend/video/raw' },
                    { type: 'processed', url: '/backend/video/processed' },
                    { type: 'poster', url: '/backend/video/poster' },
                ],
            },
        };
        buildPdfStreamUrl.mockImplementation((fileId, type) => `/rebuilt/pdfs/${fileId}/${type}`);
        buildVideoStreamUrl.mockImplementation((fileId, type) => `/rebuilt/videos/${fileId}/${type}`);
    });
    it('rebuilds raw and processed preload URLs through mediaUrls', async () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        const wrapper = mount(ReportingMediaPreviewCards);
        const buttons = wrapper.findAll('button');
        expect(buttons).toHaveLength(6);
        await buttons[0].trigger('click');
        await buttons[1].trigger('click');
        await buttons[3].trigger('click');
        await buttons[4].trigger('click');
        expect(buildPdfStreamUrl).toHaveBeenCalledWith(12, 'raw');
        expect(buildPdfStreamUrl).toHaveBeenCalledWith(12, 'processed');
        expect(buildVideoStreamUrl).toHaveBeenCalledWith(34, 'raw');
        expect(buildVideoStreamUrl).toHaveBeenCalledWith(34, 'processed');
        expect(openSpy).toHaveBeenCalledWith('/rebuilt/pdfs/12/raw', '_blank', 'noopener,noreferrer');
        expect(openSpy).toHaveBeenCalledWith('/rebuilt/pdfs/12/processed', '_blank', 'noopener,noreferrer');
        expect(openSpy).toHaveBeenCalledWith('/rebuilt/videos/34/raw', '_blank', 'noopener,noreferrer');
        expect(openSpy).toHaveBeenCalledWith('/rebuilt/videos/34/processed', '_blank', 'noopener,noreferrer');
    });
    it('renders extracted report text in the preview card', () => {
        const wrapper = mount(ReportingMediaPreviewCards);
        expect(wrapper.text()).toContain('Text extraction');
        expect(wrapper.text()).toContain('Extracted anonymized report text');
    });
    it('preserves nonstandard preload stream options unchanged', async () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        const wrapper = mount(ReportingMediaPreviewCards);
        const buttons = wrapper.findAll('button');
        await buttons[2].trigger('click');
        await buttons[5].trigger('click');
        expect(buildPdfStreamUrl).not.toHaveBeenCalledWith(12, 'audit');
        expect(buildVideoStreamUrl).not.toHaveBeenCalledWith(34, 'poster');
        expect(openSpy).toHaveBeenCalledWith('/backend/report/audit', '_blank', 'noopener,noreferrer');
        expect(openSpy).toHaveBeenCalledWith('/backend/video/poster', '_blank', 'noopener,noreferrer');
    });
});
