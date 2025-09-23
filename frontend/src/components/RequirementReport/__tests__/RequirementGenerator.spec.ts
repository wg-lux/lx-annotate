import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import RequirementGenerator from '@/components/RequirementReport/RequirementGenerator.vue';
import axiosInstance from '@/api/axiosInstance';

// Mock axios
vi.mock('@/api/axiosInstance', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

// Mock stores
const mockPatientStore = {
  loading: false as boolean,
  error: null as string | null,
  patientsWithDisplayName: [] as any[],
  currentPatient: null as any,
  fetchPatients: vi.fn(),
  getPatientById: vi.fn(),
  initializeLookupData: vi.fn(),
  clearCurrentPatient: vi.fn(),
  clearError: vi.fn(),
};

const mockExaminationStore = {
  loading: false as boolean,
  error: null as string | null,
  examinationsDropdown: [] as any[],
  fetchExaminations: vi.fn(),
  setSelectedExamination: vi.fn(),
  loadFindingsForExamination: vi.fn(),
};

const mockFindingStore = {
  loading: false as boolean,
  findings: [] as any[],
  fetchFindings: vi.fn(),
  getFindingIdsByPatientExaminationId: vi.fn(() => [] as number[]),
  getFindingById: vi.fn(),
};

const mockRequirementStore = {
  evaluateFromLookupData: vi.fn(),
  evaluateRequirementSet: vi.fn(),
  getRequirementSetEvaluationStatus: vi.fn(),
  getRequirementEvaluationStatus: vi.fn(),
  setCurrentRequirementSetIds: vi.fn(),
  loadRequirementSetsFromLookup: vi.fn(),
  reset: vi.fn(),
};

const mockPatientExaminationStore = {
  addPatientExamination: vi.fn(),
  setCurrentPatientExaminationId: vi.fn(),
};

vi.mock('@/stores/patientStore', () => ({
  usePatientStore: () => mockPatientStore,
}));

vi.mock('@/stores/examinationStore', () => ({
  useExaminationStore: () => mockExaminationStore,
}));

vi.mock('@/stores/findingStore', () => ({
  useFindingStore: () => mockFindingStore,
}));

vi.mock('@/stores/requirementStore', () => ({
  useRequirementStore: () => mockRequirementStore,
}));

vi.mock('@/stores/patientExaminationStore', () => ({
  usePatientExaminationStore: () => mockPatientExaminationStore,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

// Test fixtures
const mockPatients = [
  { id: 1, firstName: 'John', lastName: 'Doe', displayName: 'John Doe', patientHash: 'patient_1', dob: '1990-01-01', gender: 'M' },
  { id: 2, firstName: 'Jane', lastName: 'Smith', displayName: 'Jane Smith', patientHash: 'patient_2', dob: '1985-05-15', gender: 'F' },
];

const mockExaminations = [
  { id: 1, name: 'MRI Scan', displayName: 'MRI Scan - 2025-01-01' },
  { id: 2, name: 'CT Scan', displayName: 'CT Scan - 2025-01-02' },
];

const mockLookupData = {
  patientExaminationId: 80,
  requirementSets: [
    { id: 1, name: 'Basic Requirements', type: 'primary' },
    { id: 2, name: 'Advanced Requirements', type: 'secondary' },
  ],
  availableFindings: [1, 2, 3],
  requiredFindings: [1],
  requirementDefaults: {},
  classificationChoices: {},
  requirementsBySet: {},
  requirementStatus: {},
  requirementSetStatus: {},
  suggestedActions: {},
  selectedRequirementSetIds: [1],
};

const mockPatientExaminationResponse = {
  id: 80,
  patient: 'patient_1',
  examination: 'MRI Scan',
  date_start: '2025-09-23',
};

const mockLookupInitResponse = {
  token: 'test-token-123',
};

describe('RequirementGenerator', () => {
  let wrapper: VueWrapper<any>;
  let pinia: any;

  // Helper to create component wrapper
  const makeWrapper = (options: any = {}) => {
    return mount(RequirementGenerator, {
      global: {
        plugins: [pinia],
        stubs: {
          AddableFindingsDetail: {
            template: `
                    stubs: {
        AddableFindingsDetail: {
          template: '<div data-testid="addable-findings-detail"><button data-testid="add-finding-btn" @click="$emit(\'finding-added\', { id: 123 })">Add Finding</button><button data-testid="trigger-error-btn" @click="$emit(\'finding-error\', \'Test error\')">Trigger Error</button></div>',
        },
        FindingsDetail: {
          template: '<div :data-testid="\'findings-detail-\' + findingId"><button data-testid="add-to-exam-btn" @click="$emit(\'added-to-examination\', { id: findingId })">Add to Exam</button><button data-testid="update-classification-btn" @click="$emit(\'classification-updated\', { id: findingId, classification: \'updated\' })">Update Classification</button></div>',
          props: ['findingId', 'isAddedToExamination', 'patientExaminationId'],
        },
        PatientAdder: {
          template: '<div data-testid="patient-adder">Patient Adder Stub</div>',
        },
      },
            `,
            props: ['examination-id', 'patient-examination-id'],
            emits: ['finding-added', 'finding-error'],
          },
          FindingsDetail: {
            template: `
              <div :data-testid="'findings-detail-' + findingId">
                Finding {{ findingId }}
                <button data-testid="add-to-exam-btn" @click="$emit('added-to-examination', findingId, 'Test Finding')">
                  Add to Exam
                </button>
                <button data-testid="update-classification-btn" @click="$emit('classification-updated', findingId, 30, 106)">
                  Update Classification
                </button>
              </div>
            `,
            props: ['finding-id', 'is-added-to-examination', 'patient-examination-id'],
            emits: ['added-to-examination', 'classification-updated'],
          },
          PatientAdder: {
            template: `
              <div data-testid="patient-adder">
                <button @click="$emit('patient-created', { id: 3, firstName: 'New', lastName: 'Patient', displayName: 'New Patient' })">
                  Create Patient
                </button>
                <button @click="$emit('cancel')">
                  Cancel
                </button>
              </div>
            `,
            emits: ['patient-created', 'cancel'],
          },
        },
        ...options.global,
      },
      ...options,
    });
  };

  const advanceAll = async () => {
    vi.runAllTimers();
    await flushPromises();
    await nextTick();
  };

  // Helper to trigger component data changes by calling component methods
  const setComponentData = async (wrapper: VueWrapper<any>, data: Record<string, any>) => {
    const vm = wrapper.vm as any;
    Object.keys(data).forEach(key => {
      if (key in vm) {
        vm[key] = data[key];
      }
    });
    await nextTick();
  };

  // Helper to find button by text content
  const findButtonByText = (wrapper: VueWrapper<any>, text: string) => {
    const buttons = wrapper.findAll('button');
    return buttons.find(button => button.text().includes(text));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    pinia = createPinia();
    setActivePinia(pinia);

    // Reset all mocks
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Set default store states
    mockPatientStore.loading = false;
    mockPatientStore.error = null;
    mockPatientStore.patientsWithDisplayName = mockPatients;
    mockPatientStore.currentPatient = null;

    mockExaminationStore.loading = false;
    mockExaminationStore.error = null;
    mockExaminationStore.examinationsDropdown = mockExaminations;

    mockFindingStore.loading = false;
    mockFindingStore.findings = [];

    // Setup default axios mocks
    (axiosInstance.post as MockedFunction<any>).mockResolvedValue({ data: {} });
    (axiosInstance.get as MockedFunction<any>).mockResolvedValue({ data: {} });
    (axiosInstance.patch as MockedFunction<any>).mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Initial render and disabled states', () => {
    it('should disable "Anforderungsbericht erstellen" button when no selections', async () => {
      const wrapper = makeWrapper();
      await nextTick();

      const createButton = findButtonByText(wrapper, '2. Anforderungsbericht erstellen');
      expect(createButton?.attributes('disabled')).toBeDefined();
    });

    it('should enable patient select unless loading', async () => {
      const wrapper = makeWrapper();
      await nextTick();

      const patientSelect = wrapper.find('#patient-select');
      expect(patientSelect.attributes('disabled')).toBeUndefined();

      // Make loading state true through the component
      setComponentData(wrapper, { loading: true });
      await nextTick();

      // Check if disabled property is now present
      expect(patientSelect.attributes('disabled')).toBeDefined();
    });

    it('should disable examination select until patient is chosen', async () => {
      const wrapper = makeWrapper();
      await nextTick();

      const examinationSelect = wrapper.find('#examination-select');
      expect(examinationSelect.attributes('disabled')).toBeDefined();

      // Select a patient
      setComponentData(wrapper, { selectedPatientId: 1 });
      await nextTick();

      expect(examinationSelect.attributes('disabled')).toBeUndefined();
    });
  });

  describe('Loading flags', () => {
    it('should show loading text in selects when stores are loading', async () => {
      mockPatientStore.loading = true;
      mockExaminationStore.loading = true;

      wrapper = makeWrapper();
      await nextTick();

      const patientSelect = wrapper.find('#patient-select');
      const examSelect = wrapper.find('#examination-select');

      expect(patientSelect.text()).toContain('Lade Patienten...');
      expect(examSelect.text()).toContain('Lade Untersuchungen...');
    });
  });

  describe('Patient selection triggers reset', () => {
    it('should reset examination selection and session when patient changes', async () => {
      wrapper = makeWrapper();
      await nextTick();

      // Set initial values using component methods
      await setComponentData(wrapper, {
        selectedPatientId: 1,
        selectedExaminationId: 1,
        lookupToken: 'old-token',
        lookup: { patientExaminationId: 1 },
      });

      // Change patient by selecting in the UI
      const patientSelect = wrapper.find('#patient-select');
      await patientSelect.setValue(2);
      await nextTick();

      expect(wrapper.vm.selectedExaminationId).toBeNull();
      expect(mockRequirementStore.reset).toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('lookupToken');
    });
  });

  describe('Examination selection calls store methods', () => {
    it('should call store methods when examination is selected', async () => {
      wrapper = makeWrapper();
      await nextTick();

      // First select a patient to enable examination selection
      const patientSelect = wrapper.find('#patient-select');
      await patientSelect.setValue(1);
      await nextTick();

      const examSelect = wrapper.find('#examination-select');
      await examSelect.setValue(1);
      await nextTick();

      expect(mockExaminationStore.setSelectedExamination).toHaveBeenCalledWith(1);
      expect(mockExaminationStore.loadFindingsForExamination).toHaveBeenCalledWith(1);
    });
  });

  describe('Create PatientExamination + init lookup (happy path)', () => {
    it('should successfully create patient examination and initialize lookup', async () => {
      (axiosInstance.post as MockedFunction<any>)
        .mockResolvedValueOnce({ data: mockPatientExaminationResponse })
        .mockResolvedValueOnce({ data: mockLookupInitResponse });

      (axiosInstance.get as MockedFunction<any>)
        .mockResolvedValueOnce({ data: mockLookupData });

      mockPatientStore.getPatientById.mockReturnValue(mockPatients[0]);
      mockFindingStore.fetchFindings.mockResolvedValue(undefined);

      wrapper = makeWrapper();
      await nextTick();

      // Select patient and examination
      const patientSelect = wrapper.find('#patient-select');
      const examSelect = wrapper.find('#examination-select');
      
      await patientSelect.setValue(1);
      await examSelect.setValue(1);
      await nextTick();

      const buttons = wrapper.findAll('button');
      const createButton = buttons.find(button => 
        button.text().includes('2. Anforderungsbericht erstellen')
      );
      await createButton?.trigger('click');
      await advanceAll();

      expect(axiosInstance.post).toHaveBeenCalledWith('/api/patient-examinations/', expect.objectContaining({
        patient: 'patient_1',
        examination: 'MRI Scan',
        date_start: '2025-09-23',
        patient_birth_date: '1990-01-01',
        patient_gender: 'M',
      }));

      expect(axiosInstance.post).toHaveBeenCalledWith('/api/lookup/init/', {
        patientExaminationId: 80,
      });

      expect(mockPatientExaminationStore.addPatientExamination).toHaveBeenCalledWith(mockPatientExaminationResponse);
      expect(wrapper.vm.currentPatientExaminationId).toBe(80);
      expect(wrapper.vm.lookupToken).toBe('test-token-123');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('lookupToken', 'test-token-123');
    });
  });

  describe('Debug panel rendering', () => {
    it('should render debug info after lookup is available', async () => {
      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        selectedPatientId: 1,
        selectedExaminationId: 1,
        lookupToken: 'test-token',
        lookup: mockLookupData,
      });

      expect(wrapper.text()).toContain('Patient Examination ID: 80');
      expect(wrapper.text()).toContain('Token: test-token');
      expect(wrapper.text()).toContain('Requirement Sets: 2');
    });
  });

  describe('Available findings rendering', () => {
    it('should render FindingsDetail for each available finding', async () => {
      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        selectedPatientId: 1,
        selectedExaminationId: 1,
        lookup: mockLookupData,
      });

      expect(wrapper.find('[data-testid="findings-detail-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="findings-detail-2"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="findings-detail-3"]').exists()).toBe(true);
    });
  });

  describe('AddableFindingsDetail finding-added event', () => {
    it('should show success message and trigger evaluation when finding is added', async () => {
      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        selectedPatientId: 1,
        selectedExaminationId: 1,
        lookup: mockLookupData,
        lookupToken: 'test-token',
      });

      const addFindingButton = wrapper.find('[data-testid="add-finding-btn"]');
      await addFindingButton.trigger('click');
      await nextTick();

      expect(wrapper.text()).toContain('Befund "right_flexure" wurde erfolgreich hinzugefügt mit 1 Klassifikation!');

      // Wait for debounced evaluation
      await advanceAll();
      expect(mockRequirementStore.evaluateFromLookupData).toHaveBeenCalledWith(mockLookupData);
    });
  });

  describe('FindingsDetail classification-updated event', () => {
    it('should show success message and trigger evaluation when classification is updated', async () => {
      mockFindingStore.getFindingById.mockReturnValue({ name: 'Test Finding' });

      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        selectedPatientId: 1,
        selectedExaminationId: 1,
        lookup: mockLookupData,
        lookupToken: 'test-token',
      });

      const updateButton = wrapper.find('[data-testid="findings-detail-1"] [data-testid="update-classification-btn"]');
      await updateButton.trigger('click');
      await nextTick();

      expect(wrapper.text()).toContain('Klassifikation für "Test Finding" wurde erfolgreich ausgewählt!');

      // Wait for debounced evaluation
      await advanceAll();
      expect(mockRequirementStore.evaluateFromLookupData).toHaveBeenCalled();
    });
  });

  describe('Requirement set toggle and recompute', () => {
    it('should patch lookup and trigger recompute when requirement set is toggled', async () => {
      (axiosInstance.patch as MockedFunction<any>).mockResolvedValue({ data: {} });
      (axiosInstance.post as MockedFunction<any>).mockResolvedValue({ data: { updates: {} } });
      (axiosInstance.get as MockedFunction<any>).mockResolvedValue({ data: mockLookupData });

      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        selectedPatientId: 1,
        selectedExaminationId: 1,
        lookup: mockLookupData,
        lookupToken: 'test-token',
      });

      const checkbox = wrapper.find('.form-check-input');
      await checkbox.setValue(false);
      await advanceAll();

      expect(axiosInstance.patch).toHaveBeenCalledWith('/api/lookup/test-token/parts/', {
        updates: { selectedRequirementSetIds: [] },
      });
      expect(mockRequirementStore.setCurrentRequirementSetIds).toHaveBeenCalledWith([]);
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/lookup/test-token/recompute/');
    });
  });

  describe('Evaluation actions', () => {
    it('should evaluate all requirements when "Alle evaluieren" is clicked', async () => {
      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        lookup: mockLookupData,
        lookupToken: 'test-token',
      });

      const evaluateAllButton = findButtonByText(wrapper, 'Alle evaluieren');
      await evaluateAllButton?.trigger('click');
      await nextTick();

      expect(mockRequirementStore.evaluateFromLookupData).toHaveBeenCalledWith(mockLookupData);
    });

    it('should evaluate specific requirement set', async () => {
      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        lookup: mockLookupData,
        lookupToken: 'test-token',
      });

      const evaluateButton = wrapper.find('button[title="Anforderungsset evaluieren"]');
      await evaluateButton.trigger('click');
      await nextTick();

      expect(mockRequirementStore.evaluateRequirementSet).toHaveBeenCalledWith(1, 80);
    });
  });

  describe('Evaluation summary progress bar', () => {
    it('should display correct progress percentage', async () => {
      mockRequirementStore.getRequirementSetEvaluationStatus
        .mockReturnValueOnce({ met: true, metRequirementsCount: 5, totalRequirementsCount: 10 })
        .mockReturnValueOnce(null);

      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        lookup: mockLookupData,
      });

      expect(wrapper.text()).toContain('1 von 2 Sets evaluiert (50%)');
      
      const progressBar = wrapper.find('.progress-bar');
      expect(progressBar.attributes('style')).toContain('width: 50%');
    });
  });

  describe('Token validation on mount', () => {
    it('should validate existing token and fetch data on mount', async () => {
      mockLocalStorage.getItem.mockReturnValue('existing-token');
      (axiosInstance.get as MockedFunction<any>)
        .mockResolvedValueOnce({ data: { patientExaminationId: 80 } })
        .mockResolvedValueOnce({ data: mockLookupData });

      wrapper = makeWrapper();
      await advanceAll();

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/lookup/existing-token/parts/?keys=patientExaminationId');
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/lookup/existing-token/all/?skip_recompute=true');
    });

    it('should handle token validation 404 and trigger restart', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-token');
      (axiosInstance.get as MockedFunction<any>).mockRejectedValue({ response: { status: 404 } });

      wrapper = makeWrapper();
      await advanceAll();

      expect(wrapper.vm.lookupToken).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('lookupToken');
    });
  });

  describe('Manual session management', () => {
    it('should renew session manually', async () => {
      (axiosInstance.get as MockedFunction<any>).mockResolvedValue({ data: { patientExaminationId: 80 } });
      (axiosInstance.patch as MockedFunction<any>).mockResolvedValue({ data: {} });

      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        lookupToken: 'test-token',
        lookup: mockLookupData,
      });

      const renewButton = findButtonByText(wrapper, 'Session erneuern');
      await renewButton?.trigger('click');
      await advanceAll();

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/lookup/test-token/parts/?keys=patientExaminationId');
      expect(axiosInstance.patch).toHaveBeenCalledWith('/api/lookup/test-token/parts/', { updates: {} });
    });

    it('should reset session completely', async () => {
      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        lookupToken: 'test-token',
        lookup: mockLookupData,
        currentPatientExaminationId: 80,
      });

      const resetButton = findButtonByText(wrapper, 'Session zurücksetzen');
      await resetButton?.trigger('click');
      await nextTick();

      expect(wrapper.vm.lookupToken).toBeNull();
      expect(wrapper.vm.lookup).toBeNull();
      expect(wrapper.vm.currentPatientExaminationId).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('lookupToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('currentPatientExaminationId');
    });
  });

  describe('Error handling', () => {
    it('should display evaluation error', async () => {
      mockRequirementStore.evaluateFromLookupData.mockRejectedValue(new Error('boom'));

      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        lookup: mockLookupData,
        lookupToken: 'test-token',
      });

      const evaluateButton = findButtonByText(wrapper, 'Alle evaluieren');
      await evaluateButton?.trigger('click');
      await advanceAll();

      expect(wrapper.text()).toContain('Fehler bei der Evaluierung der Anforderungen: boom');
    });

    it('should show store errors', async () => {
      mockPatientStore.error = 'Patient loading failed';
      mockExaminationStore.error = 'Examination loading failed';

      wrapper = makeWrapper();
      await nextTick();

      expect(wrapper.text()).toContain('Patienten-Store Fehler: Patient loading failed');
      expect(wrapper.text()).toContain('Untersuchungs-Store Fehler: Examination loading failed');
    });
  });

  describe('Finding status logic', () => {
    it('should correctly identify added findings', async () => {
      mockFindingStore.getFindingIdsByPatientExaminationId.mockReturnValue([1, 3]);

      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        lookup: mockLookupData,
      });

      const findingDetail1 = wrapper.findComponent({ name: 'FindingsDetail', props: { 'finding-id': 1 } });
      const findingDetail2 = wrapper.findComponent({ name: 'FindingsDetail', props: { 'finding-id': 2 } });

      expect(findingDetail1.props('is-added-to-examination')).toBe(true);
      expect(findingDetail2.props('is-added-to-examination')).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist token and patient examination ID', async () => {
      wrapper = makeWrapper();
      await nextTick();

      // Test setting values
      await setComponentData(wrapper, {
        lookupToken: 'new-token',
        currentPatientExaminationId: 123,
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('lookupToken', 'new-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentPatientExaminationId', '123');

      // Test clearing
      await setComponentData(wrapper, {
        lookupToken: null,
        currentPatientExaminationId: null,
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('lookupToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('currentPatientExaminationId');
    });
  });

  describe('UI disabled states during loading', () => {
    it('should disable buttons when loading is true', async () => {
      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        loading: true,
        lookupToken: 'test-token',
        lookup: mockLookupData,
      });

      const recomputeButton = findButtonByText(wrapper, 'Neu berechnen');
      const renewButton = findButtonByText(wrapper, 'Session erneuern');
      const evaluateButton = findButtonByText(wrapper, 'Alle evaluieren');

      expect(recomputeButton?.attributes('disabled')).toBeDefined();
      expect(renewButton?.attributes('disabled')).toBeDefined();
      expect(evaluateButton?.attributes('disabled')).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing selected examination', async () => {
      mockExaminationStore.examinationsDropdown = [];

      wrapper = makeWrapper();
      
      // Select patient and invalid examination
      const patientSelect = wrapper.find('#patient-select');
      await patientSelect.setValue(1);
      await setComponentData(wrapper, {
        selectedExaminationId: 999,
      });

      const createButton = findButtonByText(wrapper, '2. Anforderungsbericht erstellen');
      await createButton?.trigger('click');
      await nextTick();

      expect(wrapper.text()).toContain('Ausgewählte Untersuchung nicht gefunden');
    });

    it('should handle missing patient', async () => {
      mockPatientStore.getPatientById.mockReturnValue(undefined);

      wrapper = makeWrapper();
      
      // Select invalid patient and examination
      await setComponentData(wrapper, {
        selectedPatientId: 999,
        selectedExaminationId: 1,
      });

      const createButton = findButtonByText(wrapper, '2. Anforderungsbericht erstellen');
      await createButton?.trigger('click');
      await nextTick();

      expect(wrapper.text()).toContain('Selected patient not found');
    });

    it('should load findings data only when store is empty', async () => {
      // First test: empty findings array
      mockFindingStore.findings = [];
      wrapper = makeWrapper();
      await advanceAll();

      expect(mockFindingStore.fetchFindings).toHaveBeenCalled();

      // Reset and test with existing findings
      vi.clearAllMocks();
      mockFindingStore.findings = [{ id: 1, name: 'Test' }];
      
      wrapper.unmount();
      wrapper = makeWrapper();
      await advanceAll();

      expect(mockFindingStore.fetchFindings).not.toHaveBeenCalled();
    });
  });

  describe('Success message auto-dismiss', () => {
    it('should auto-dismiss success messages after timeout', async () => {
      wrapper = makeWrapper();
      
      await setComponentData(wrapper, {
        selectedPatientId: 1,
        selectedExaminationId: 1,
        lookup: mockLookupData,
        lookupToken: 'test-token',
      });

      const addFindingButton = wrapper.find('[data-testid="add-finding-btn"]');
      await addFindingButton.trigger('click');
      await nextTick();

      expect(wrapper.text()).toContain('Befund "right_flexure" wurde erfolgreich hinzugefügt');

      // Advance timers to trigger auto-dismiss
      vi.advanceTimersByTime(5000);
      await nextTick();

      expect(wrapper.vm.successMessage).toBeNull();
    });
  });
});
