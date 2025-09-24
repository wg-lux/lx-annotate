import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';
import { vi, expect } from 'vitest';

// Mock router for testing
export const createMockRouter = () => {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/anonymisierung/korrektur/:fileId', name: 'AnonymisierungKorrektur', component: { template: '<div>Korrektur</div>' } },
      { path: '/anonymisierung/uebersicht', component: { template: '<div>Übersicht</div>' } }
    ]
  });
};

// Default store states
export const defaultStoreStates = {
  anonymization: {
    current: null,
    loading: false,
    error: null,
    processingFiles: [],
    isAnyFileProcessing: false
  },
  video: {
    videos: [],
    loading: false,
    error: null
  },
  patient: {
    patients: [],
    loading: false,
    error: null
  },
  toast: {
    toasts: []
  },
  pdf: {
    pdfStreamUrl: null,
    loading: false,
    error: null
  },
  mediaType: {
    currentItem: null,
    currentMediaUrl: null
  }
};

// Enhanced mount utility for anonymization components
export const mountAnonymizationComponent = (component: any, options: any = {}) => {
  const router = createMockRouter();
  
  const storeStates = {
    ...defaultStoreStates,
    ...options.storeStates
  };

  return mount(component, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: storeStates
        })
      ],
      ...options.global
    },
    ...options
  });
};

// Mock patient data factory
export const createMockPatientData = (overrides: any = {}) => ({
  id: 1,
  anonymizedText: 'Test anonymized text',
  originalFileName: 'test.pdf',
  fileType: '.pdf',
  reportMeta: {
    patientFirstName: 'John',
    patientLastName: 'Doe',
    patientGender: 'male',
    patientDob: '1990-01-01',
    casenumber: 'CASE001',
    examinationDate: '2023-01-15',
    centerName: 'Test Center'
  },
  ...overrides
});

// Specific mock data for different media types
export const createMockPdfData = (overrides: any = {}) => 
  createMockPatientData({
    originalFileName: 'document.pdf',
    fileType: '.pdf',
    ...overrides
  });

export const createMockVideoData = (overrides: any = {}) => 
  createMockPatientData({
    originalFileName: 'video.mp4',
    fileType: '.mp4',
    ...overrides
  });

// Helper to set store state after component mount
export const setStoreState = (wrapper: any, storeName: string, state: any) => {
  const store = wrapper.vm.$pinia.state.value[storeName];
  Object.assign(store, state);
};

// Helper to wait for store updates and DOM re-render
export const waitForStoreUpdate = async (wrapper: any) => {
  await wrapper.vm.$nextTick();
  await new Promise(resolve => setTimeout(resolve, 0));
};

// Common assertions for form validation
export const expectFormValidation = {
  toShowError: (wrapper: any, fieldName: string, errorMessage: string) => {
    expect(wrapper.find('.is-invalid').exists()).toBe(true);
    expect(wrapper.text()).toContain(errorMessage);
  },
  toBeValid: (wrapper: any) => {
    expect(wrapper.find('.is-invalid').exists()).toBe(false);
  },
  buttonToBeDisabled: (wrapper: any, buttonSelector: string) => {
    const button = wrapper.find(buttonSelector);
    expect(button.exists()).toBe(true);
    expect(button.element.disabled).toBe(true);
  },
  buttonToBeEnabled: (wrapper: any, buttonSelector: string) => {
    const button = wrapper.find(buttonSelector);
    expect(button.exists()).toBe(true);
    expect(button.element.disabled).toBe(false);
  }
};
