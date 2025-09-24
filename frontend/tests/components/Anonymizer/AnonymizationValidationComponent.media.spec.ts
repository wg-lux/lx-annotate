import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import AnonymizationValidationComponent from '../../../src/components/Anonymizer/AnonymizationValidationComponent.vue';
import { 
  mountAnonymizationComponent, 
  createMockPdfData, 
  createMockVideoData,
  setStoreState,
  waitForStoreUpdate
} from '../../utils/anonymizationTestUtils';

describe('AnonymizationValidationComponent - Media Detection', () => {
  let wrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('PDF Media Detection', () => {
    beforeEach(async () => {
      const mockPdfData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: {
            current: mockPdfData,
            loading: false
          },
          mediaType: {
            currentType: 'pdf'
          }
        }
      });
      await waitForStoreUpdate(wrapper);
    });

    it('should detect PDF media type', () => {
      // Component should recognize PDF type
      expect(wrapper.vm.currentMediaType).toBe('pdf');
    });

    it('should display PDF-specific UI elements', () => {
      // Should show PDF-related controls
      expect(wrapper.text()).toContain('PDF');
    });

    it('should show patient information form for PDF', () => {
      // PDF should show patient form
      expect(wrapper.find('input[type="text"]').exists()).toBe(true);
      expect(wrapper.find('input[type="date"]').exists()).toBe(true);
      expect(wrapper.find('select').exists()).toBe(true);
    });
  });

  describe('Video Media Detection', () => {
    beforeEach(async () => {
      const mockVideoData = createMockVideoData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: {
            current: mockVideoData,
            loading: false
          },
          mediaType: {
            currentType: 'video'
          }
        }
      });
      await waitForStoreUpdate(wrapper);
    });

    it('should detect video media type', () => {
      expect(wrapper.vm.currentMediaType).toBe('video');
    });

    it('should display video-specific UI elements', () => {
      // Should show video-related controls
      expect(wrapper.text()).toContain('Video');
    });

    it('should show appropriate controls for video', () => {
      // Video might have different controls than PDF
      const hasVideoControls = wrapper.find('.video-controls').exists() || 
                               wrapper.text().includes('Frame') ||
                               wrapper.text().includes('Timeline');
      expect(hasVideoControls).toBe(true);
    });
  });

  describe('Media Type Switching', () => {
    it('should handle switching from PDF to video', async () => {
      // Start with PDF
      const mockPdfData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { current: mockPdfData },
          mediaType: { currentType: 'pdf' }
        }
      });
      await waitForStoreUpdate(wrapper);
      
      expect(wrapper.vm.currentMediaType).toBe('pdf');
      
      // Switch to video
      const store = wrapper.vm.$pinia._s.get('mediaType');
      store.currentType = 'video';
      await nextTick();
      
      expect(wrapper.vm.currentMediaType).toBe('video');
    });

    it('should handle switching from video to PDF', async () => {
      // Start with video
      const mockVideoData = createMockVideoData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { current: mockVideoData },
          mediaType: { currentType: 'video' }
        }
      });
      await waitForStoreUpdate(wrapper);
      
      expect(wrapper.vm.currentMediaType).toBe('video');
      
      // Switch to PDF
      const store = wrapper.vm.$pinia._s.get('mediaType');
      store.currentType = 'pdf';
      await nextTick();
      
      expect(wrapper.vm.currentMediaType).toBe('pdf');
    });
  });

  describe('Media-Specific Data Loading', () => {
    it('should load PDF metadata correctly', async () => {
      const mockPdfData = createMockPdfData({
        reportMeta: {
          patientFirstName: 'John',
          patientLastName: 'Doe',
          casenumber: 'PDF001'
        }
      });
      
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { current: mockPdfData },
          mediaType: { currentType: 'pdf' }
        }
      });
      await waitForStoreUpdate(wrapper);
      
      // Check if PDF metadata is displayed
      expect(wrapper.text()).toContain('John');
      expect(wrapper.text()).toContain('Doe');
      expect(wrapper.text()).toContain('PDF001');
    });

    it('should load video metadata correctly', async () => {
      const mockVideoData = createMockVideoData({
        metadata: {
          filename: 'test-video.mp4',
          duration: 120,
          frameCount: 3600
        }
      });
      
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { current: mockVideoData },
          mediaType: { currentType: 'video' }
        }
      });
      await waitForStoreUpdate(wrapper);
      
      // Check if video metadata is available
      expect(wrapper.vm.currentData).toMatchObject({
        metadata: {
          filename: 'test-video.mp4',
          duration: 120,
          frameCount: 3600
        }
      });
    });
  });

  describe('Media Type Error Handling', () => {
    it('should handle unknown media type gracefully', async () => {
      const mockData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { current: mockData },
          mediaType: { currentType: 'unknown' }
        }
      });
      await waitForStoreUpdate(wrapper);
      
      // Should not crash and might show error message or default state
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle null media type', async () => {
      const mockData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { current: mockData },
          mediaType: { currentType: null }
        }
      });
      await waitForStoreUpdate(wrapper);
      
      // Should handle null gracefully
      expect(wrapper.exists()).toBe(true);
    });
  });
});
