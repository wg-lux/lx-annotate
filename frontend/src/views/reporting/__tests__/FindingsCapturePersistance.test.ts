// @vitest-environment jsdom
/**
 * Place beside FindingsCapturePage.test.ts, in src/views/reporting/__tests__/.
 *
 * Integration boundary: the actual component and reportingFlowStore run together.
 * Catalog/template providers, child presentation components and remote APIs are
 * isolated. In particular, DO NOT mock reportingFlowStore or use a testing Pinia
 * that stubs its actions: these tests need the real autosave watcher and queue.
 *
 * Baseline: lx-annotate d4a0a0b + the intermediate-save component patch.
 * Prerequisite: manual save must use persistencePolicy, not reject every draft
 * whose verificationStatus is 'unverified'. See the annotation-only regression.
 *
 * API responses are mocked. These tests do not prove backend validation,
 * authorization, database writes, or restoration through a real HTTP GET.
 * All fixtures below are synthetic.
 */
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { computed, nextTick, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Finding } from '@/api/findings.contract'
import type { CoreConceptCollection } from '@/types/coreConcepts'
import type {
  ReportTemplateFinding,
  ReportTemplateIdentity,
  ReportTemplatePayload,
  ReportTemplateRuntimeValidationResult,
  ReportTemplateSectionBlock
} from '@/types/reportTemplate'
import {
  useReportingFlowStore,
  type ReportingRuntimeDraft
} from '@/stores/reportingFlowStore'
import FindingsCapturePage from '../FindingsCapturePage.vue'
import { reportTemplateSelectionContextKey } from '../reportTemplateSelectionContext'

type SaveDraft = typeof import('@/api/reportDraftApi').savePatientExaminationDraft
type SaveRequest = Parameters<SaveDraft>[0]
type SaveResponse = Awaited<ReturnType<SaveDraft>>
type ValidateRuntime = typeof import('@/api/reportTemplatesApi').validateReportTemplateRuntime

type ContextProjection = {
  concepts: CoreConceptCollection
  reportTemplates: ReportTemplatePayload[]
}

const mocks = vi.hoisted(() => ({
  saveDraft: vi.fn<SaveDraft>(),
  validateRuntime: vi.fn<ValidateRuntime>(),
  fetchContext: vi.fn<() => Promise<ContextProjection>>(),
  ensureCatalogLoaded: vi.fn<() => Promise<Finding[]>>(),
  selectTemplate: vi.fn<() => Promise<void>>()
}))

vi.mock('@/api/reportDraftApi', () => ({
  savePatientExaminationDraft: mocks.saveDraft
}))

vi.mock('@/api/reportTemplatesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/reportTemplatesApi')>()),
  validateReportTemplateRuntime: mocks.validateRuntime
}))

vi.mock('@/api/knowledgeBaseGraphApi', () => ({
  fetchExaminationReportingContext: mocks.fetchContext
}))

// These factories defer accessing fixture variables until component setup.
vi.mock('@/composables/reporting/useFindingSelectors', () => ({
  useFindingSelectors: () => ({
    catalogFindings: computed(() => [makeCatalogFinding()]),
    loading: ref(false),
    ensureCatalogLoaded: mocks.ensureCatalogLoaded
  })
}))

vi.mock('@/stores/terminologyStore', () => ({
  useTerminologyStore: () => terminologyFixture
}))

vi.mock('@/stores/examinationStore', () => ({
  useExaminationStore: () => ({
    exams: [{ id: EXAMINATION_ID, name: EXAMINATION_NAME, displayName: 'Gastroskopie' }],
    examinationsDropdown: [
      { id: EXAMINATION_ID, name: EXAMINATION_NAME, displayName: 'Gastroskopie' }
    ],
    fetchExaminations: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('@/composables/reporting/useReportTemplates', () => ({
  useReportTemplates: () => {
    // This is the real store. Only the template-provider composable is replaced.
    const flow = useReportingFlowStore()
    const selectedTemplate = computed(() =>
      flow.selectedTemplateName ? makeTemplate(flow.selectedTemplateName) : null
    )
    return {
      moduleName: computed(() => flow.selectedKbModule),
      selectedTemplateName: computed(() => flow.selectedTemplateName),
      selectedTemplate,
      templateOptions: computed(() => (selectedTemplate.value ? [selectedTemplate.value] : [])),
      sectionBlocks: computed(() => (selectedTemplate.value ? [makeSectionBlock()] : [])),
      loading: ref(false),
      errorMessage: ref<string | null>(null),
      // Selection is established by seedDraft(), not by simulated catalog fetches.
      applyTemplateOptions: vi.fn(),
      selectTemplateByName: vi.fn().mockResolvedValue(undefined),
      setModuleName: vi.fn()
    }
  }
}))

const MODULE = 'report_template_examples'
const VERSION = '1.0.0'
const TEMPLATE = 'star_upper_gi_main'
const FINDING = 'esophagus_polyp'
const EXAMINATION_ID = 7
const EXAMINATION_NAME = 'gastroscopy'
const PATIENT_EXAMINATION_ID = 42
const INITIAL_REVISION = 3
const INITIAL_TIMESTAMP = '2026-10-01T08:00:00.000Z'
const AUTOSAVE_MS = 1500
const VALIDATION_SETTLE_MS = 400 // The component debounces validation for 350 ms.

const SAVE_BUTTON = '[data-testid="save-intermediate-draft"]'
const SAVE_STATUS = '[data-testid="intermediate-draft-status"]'
const SAVE_ERROR = '[data-testid="intermediate-draft-error"]'
const VALIDATION_PANEL = '[data-testid="validation-panel-stub"]'

let pinia: Pinia
let flow: ReturnType<typeof useReportingFlowStore>
let terminologyFixture: {
  activeBundle: { moduleName: string; version: string } | null
  activeModuleName: string
  activeBundleKey: string
}
const mounted: VueWrapper[] = []

function requireDefined<T>(value: T | null | undefined, description: string): T {
  if (value === null || value === undefined) throw new Error(`Expected ${description}.`)
  return value
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function makeIdentity(): ReportTemplateIdentity {
  return {
    moduleName: MODULE,
    knowledgeBaseVersion: VERSION,
    templateVersion: '1.0.0',
    templateHash: `sha256:${'a'.repeat(64)}`,
    lifecycleStatus: 'published',
    readiness: null
  }
}

function makeTemplateFinding(): ReportTemplateFinding {
  return {
    finding: FINDING,
    required: true,
    multipleAllowed: true,
    classifications: [
      {
        classification: 'size_mm',
        required: true,
        input: {
          choices: [
            {
              name: 'size_mm',
              descriptors: [
                {
                  name: 'length_mm_descriptor',
                  type: 'numeric',
                  unit: 'milimeter',
                  unitAbbreviation: 'mm',
                  numericMin: 0,
                  numericMax: 200
                }
              ]
            }
          ]
        }
      }
    ]
  }
}

function makeTemplate(name = TEMPLATE): ReportTemplatePayload {
  return {
    name,
    nameDe: 'Synthetische Testvorlage',
    examination: EXAMINATION_NAME,
    identity: makeIdentity(),
    reportSections: [
      {
        name: 'baseline',
        titleDe: 'Befunde',
        titleEn: 'Findings',
        position: 0,
        sectionKind: 'findings',
        fields: [],
        types: [],
        findings: [makeTemplateFinding()]
      }
    ],
    validators: { examinationValidators: [], findingsValidators: [] },
    conceptCoverage: null
  }
}

function makeSectionBlock(): ReportTemplateSectionBlock {
  return {
    name: 'baseline',
    position: 0,
    title: 'Befunde',
    subtitle: 'Synthetic capture fixture',
    findings: [makeTemplateFinding()],
    requiredFindingsCount: 1,
    optionalFindingsCount: 0,
    requiredClassificationsCount: 1
  }
}

function makeCatalogFinding(): Finding {
  const classifications = [
    {
      id: 101,
      name: 'size_mm',
      displayName: 'Size (mm)',
      required: true,
      classificationTypes: [],
      choices: [
        {
          id: 1001,
          name: 'size_mm',
          displayName: 'Size (mm)',
          subcategories: {},
          numericalDescriptors: {}
        }
      ]
    }
  ]
  return {
    id: 11,
    name: FINDING,
    displayName: 'Oesophagus Polyp',
    description: 'Synthetic finding',
    examinations: [EXAMINATION_NAME],
    classifications,
    FindingClassifications: classifications,
    locationClassifications: [],
    morphologyClassifications: [],
    findingTypes: [],
    findingInterventions: [] // Exercise the graph-based intervention option path.
  }
}

function makeConcepts(): CoreConceptCollection {
  return {
    moduleName: MODULE,
    knowledgeBaseModule: MODULE,
    knowledgeBaseVersion: VERSION,
    examination: [
      { name: EXAMINATION_NAME, tags: [], examinationTypes: [], findings: [FINDING], indications: [] }
    ],
    examinationType: [],
    finding: [
      {
        name: FINDING,
        tags: [],
        findingTypes: [],
        classifications: ['size_mm'],
        interventions: ['biopsy'],
        causedByInterventions: []
      }
    ],
    findingType: [],
    classification: [
      { name: 'size_mm', tags: [], classificationTypes: [], classificationChoices: ['size_mm'] }
    ],
    classificationType: [],
    classificationChoice: [
      { name: 'size_mm', tags: [], classificationChoiceDescriptors: ['length_mm_descriptor'] }
    ],
    classificationChoiceDescriptor: [
      {
        name: 'length_mm_descriptor',
        tags: [],
        classificationChoiceDescriptorType: 'numeric',
        unit: 'milimeter',
        numericMin: 0,
        numericMax: 200,
        numericDistributionParams: {},
        selectionOptions: [],
        selectionDefaultOptions: {}
      }
    ],
    intervention: [
      { name: 'biopsy', nameDe: 'Biopsie', nameEn: 'Biopsy', tags: [], interventionTypes: [] }
    ],
    interventionType: [],
    indication: [],
    indicationType: [],
    unit: [{ name: 'milimeter', tags: [], abbreviation: 'mm', unitTypes: [] }],
    unitType: [],
    informationSource: [],
    informationSourceType: [],
    citation: []
  }
}

function validationResult(ok = true): ReportTemplateRuntimeValidationResult {
  return {
    templateName: TEMPLATE,
    ok,
    evaluatedFindingsCount: 1,
    classificationValidators: [],
    interventionValidators: [],
    findingsValidators: [],
    examinationValidators: [],
    unitValidators: [],
    issues: ok
      ? []
      : [
          {
            code: 'classification_value_not_present',
            level: 'error',
            message: 'Synthetic missing size.'
          }
        ]
  }
}

function acknowledge(request: SaveRequest): SaveResponse {
  return {
    patientExaminationId: request.patientExaminationId,
    revision: request.expectedRevision + 1,
    draft: {}, // The save queue consumes revision/timestamp; this is not a GET fixture.
    updatedAt: new Date().toISOString()
  }
}

type DraftOptions = {
  withTemplate?: boolean
  verificationStatus?: ReportingRuntimeDraft['verificationStatus']
  persistencePolicy?: ReportingRuntimeDraft['persistencePolicy']
}

async function seedDraft(options: DraftOptions = {}): Promise<void> {
  const withTemplate = options.withTemplate ?? true
  flow.bindAuthSubject('synthetic-test-author')
  flow.setPatientExaminationContext({
    patientExaminationId: PATIENT_EXAMINATION_ID,
    selectedPatientId: 8,
    selectedExaminationId: EXAMINATION_ID
  })
  flow.setTemplateSelection({
    moduleName: MODULE,
    templateName: withTemplate ? TEMPLATE : null,
    templateIdentity: withTemplate ? makeIdentity() : null
  })
  flow.setRuntimeDraft({
    draftId: 'synthetic-draft-42',
    patientExaminationId: PATIENT_EXAMINATION_ID,
    moduleName: MODULE,
    templateName: withTemplate ? TEMPLATE : null,
    templateIdentity: withTemplate ? makeIdentity() : null,
    verificationStatus: options.verificationStatus ?? 'verified',
    persistencePolicy: options.persistencePolicy ?? 'persistable',
    hydratedFrom: 'draft_api',
    revision: INITIAL_REVISION,
    updatedAt: INITIAL_TIMESTAMP,
    payload: {
      patient: 'synthetic_patient_8',
      examiners: [],
      examination: EXAMINATION_NAME,
      knowledgeBaseModule: MODULE,
      knowledgeBaseVersion: VERSION,
      patientFindings: []
    }
  })
  // Establish a clean acknowledged baseline before edits. Otherwise a test can
  // accidentally pass by observing a save caused by fixture initialization.
  flow.markDraftPersistenceHydrated(INITIAL_TIMESTAMP, INITIAL_REVISION)
  await nextTick()
  expect(mocks.saveDraft).not.toHaveBeenCalled()
}

async function openPage(options: DraftOptions = {}): Promise<VueWrapper> {
  await seedDraft(options)
  const wrapper = mount(FindingsCapturePage, {
    global: {
      plugins: [pinia],
      provide: {
        [reportTemplateSelectionContextKey as symbol]: { selectTemplate: mocks.selectTemplate }
      },
      stubs: {
        MedicalBlock: {
          props: ['isComplete'],
          template: `
            <section data-testid="capture-block" :data-complete="String(isComplete)">
              <slot />
            </section>
          `
        },
        ReportTemplateValidationPanel: {
          props: ['loading', 'errorMessage', 'result', 'findingAnchors'],
          template: `
            <section data-testid="validation-panel-stub" :data-loading="String(loading)">
              <span data-testid="validation-error">{{ errorMessage }}</span>
              <span data-testid="validation-result">{{ result ? String(result.ok) : 'none' }}</span>
            </section>
          `
        },
        ReportingMediaPreviewCards: true
      }
    }
  })
  mounted.push(wrapper)
  await flushPromises()
  await nextTick()
  return wrapper
}

async function addFinding(wrapper: VueWrapper): Promise<string> {
  const card = wrapper.get(`#finding-${FINDING}`)
  const button = requireDefined(
    card.findAll<HTMLButtonElement>('button').find((entry) =>
      /Befund hinzufügen|Weitere Instanz hinzufügen/.test(entry.text())
    ),
    'the add-finding button'
  )
  await button.trigger('click')
  await nextTick()
  return requireDefined(
    flow.currentRuntimeDraft?.payload.patientFindings.at(-1)?.localId,
    'a finding local ID'
  )
}

function instance(wrapper: VueWrapper, index = 0): DOMWrapper<Element> {
  return requireDefined(wrapper.findAll('.runtime-finding-instance')[index], `finding instance ${index.toString()}`)
}

async function selectSize(wrapper: VueWrapper, index = 0): Promise<void> {
  const select = requireDefined(
    instance(wrapper, index).findAll<HTMLSelectElement>('select').find((entry) =>
      entry.find('option[value="size_mm"]').exists()
    ),
    'the size classification selector'
  )
  await select.setValue('size_mm')
  await nextTick()
}

async function advance(milliseconds: number): Promise<void> {
  // Let Vue schedule its watchers before moving the fake clock. setImmediate is
  // deliberately not faked, so Vue Test Utils' flushPromises can complete.
  await nextTick()
  await vi.advanceTimersByTimeAsync(milliseconds)
  await flushPromises()
  await nextTick()
}

function latestSave(): SaveRequest {
  return requireDefined(mocks.saveDraft.mock.calls.at(-1)?.[0], 'a draft API call')
}

function latestValidationPayload() {
  return requireDefined(mocks.validateRuntime.mock.calls.at(-1)?.[3], 'a validation API call')
}

describe('FindingsCapturePage with the real reporting draft store', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    vi.setSystemTime(new Date(INITIAL_TIMESTAMP))
    // Reset only this suite's API doubles; leave shared setup mocks intact.
    for (const mock of Object.values(mocks)) mock.mockReset()
    sessionStorage.clear()
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    flow = useReportingFlowStore(pinia)
    terminologyFixture = reactive({
      activeBundle: { moduleName: MODULE, version: VERSION },
      activeModuleName: MODULE,
      activeBundleKey: `${MODULE}@@${VERSION}`
    })
    mocks.saveDraft.mockImplementation((request) => Promise.resolve(acknowledge(request)))
    mocks.validateRuntime.mockResolvedValue(validationResult())
    mocks.ensureCatalogLoaded.mockResolvedValue([makeCatalogFinding()])
    mocks.fetchContext.mockResolvedValue({ concepts: makeConcepts(), reportTemplates: [] })
    mocks.selectTemplate.mockResolvedValue(undefined)
  })

  afterEach(async () => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount()
    // Cancel timers and invalidate pending persistence before disposing Pinia.
    flow.clearAll()
    await nextTick()
    disposePinia(pinia)
    setActivePinia(undefined)
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
    sessionStorage.clear()
    localStorage.clear()
  })

  it.each(['pending', 'rejected'] as const)(
    'autosaves an incomplete classification while validation is %s, without an explicit flush',
    async (outcome) => {
      const pending = deferred<ReportTemplateRuntimeValidationResult>()
      if (outcome === 'pending') {
        mocks.validateRuntime.mockImplementation(() => pending.promise)
      } else {
        mocks.validateRuntime.mockRejectedValue(new Error('Synthetic validator unavailable'))
      }
      const wrapper = await openPage()
      const flushSpy = vi.spyOn(flow, 'flushDraftAutosave') // Call-through, not a stub.
      const localId = await addFinding(wrapper)
      await selectSize(wrapper) // Deliberately leave the numeric descriptor empty.

      await advance(VALIDATION_SETTLE_MS)
      expect(mocks.validateRuntime).toHaveBeenCalledTimes(1)
      expect(latestValidationPayload().patientFindings[0]).toMatchObject({
        localId,
        finding: FINDING,
        classificationChoices: [{ classification: 'size_mm', descriptors: [] }]
      })
      expect(mocks.saveDraft).not.toHaveBeenCalled()
      if (outcome === 'pending') {
        expect(wrapper.get(VALIDATION_PANEL).attributes('data-loading')).toBe('true')
      } else {
        expect(wrapper.get('[data-testid="validation-error"]').text()).toContain('unavailable')
      }

      await advance(AUTOSAVE_MS - VALIDATION_SETTLE_MS + 100)
      expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
      expect(flushSpy).not.toHaveBeenCalled()
      expect(latestSave()).toMatchObject({
        patientExaminationId: PATIENT_EXAMINATION_ID,
        expectedRevision: INITIAL_REVISION,
        payload: {
          patientFindings: [{ localId, classificationChoices: [{ descriptors: [] }] }]
        }
      })
      expect(flow.draftPersistenceStatus).toBe('saved')
      expect(flow.hasUnpersistedDraftChanges).toBe(false)
      expect(wrapper.get(SAVE_STATUS).text()).toContain('Entwurf gespeichert')

      if (outcome === 'pending') {
        pending.resolve(validationResult(false))
        await flushPromises()
        expect(flow.lastTemplateValidation?.ok).toBe(false)
        expect(flow.draftPersistenceStatus).toBe('saved')
      }
      // Receiving validation results and save revisions must not trigger a loop.
      await advance(AUTOSAVE_MS + 100)
      expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
      expect(mocks.validateRuntime).toHaveBeenCalledTimes(1)
    }
  )

  it('manually flushes before the debounce and reports saved only after acknowledgement', async () => {
    const pendingSave = deferred<SaveResponse>()
    mocks.saveDraft.mockImplementationOnce(() => pendingSave.promise)
    const wrapper = await openPage()
    await addFinding(wrapper)
    const button = wrapper.get<HTMLButtonElement>(SAVE_BUTTON)

    expect(button.element.disabled).toBe(false)
    await button.trigger('click')
    await flushPromises()
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
    expect(mocks.validateRuntime).not.toHaveBeenCalled()
    expect(flow.draftPersistenceStatus).toBe('saving')
    expect(flow.hasUnpersistedDraftChanges).toBe(true)
    expect(wrapper.get(SAVE_STATUS).text()).toContain('wird gespeichert')
    expect(button.element.disabled).toBe(true)
    await button.trigger('click')
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1)

    pendingSave.resolve(acknowledge(latestSave()))
    await flushPromises()
    await nextTick()
    expect(flow.currentRuntimeDraft?.revision).toBe(INITIAL_REVISION + 1)
    expect(flow.hasUnpersistedDraftChanges).toBe(false)
    expect(wrapper.get(SAVE_STATUS).text()).toContain('Entwurf gespeichert')
    expect(wrapper.find(SAVE_ERROR).exists()).toBe(false)
    await advance(AUTOSAVE_MS + 100)
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
  })

  it('manually saves an unverified but persistable draft without a report template', async () => {
    const wrapper = await openPage({
      withTemplate: false,
      verificationStatus: 'unverified',
      persistencePolicy: 'persistable'
    })
    await addFinding(wrapper)
    const button = wrapper.get<HTMLButtonElement>(SAVE_BUTTON)

    // This assertion catches the overly broad verificationStatus save guard.
    expect(button.element.disabled).toBe(false)
    await button.trigger('click')
    await flushPromises()
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
    expect(latestSave().templateName).toBeNull()
    expect(latestSave().payload.patientFindings).toHaveLength(1)
    expect(flow.draftPersistenceStatus).toBe('saved')
    expect(flow.currentRuntimeDraft?.verificationStatus).toBe('unverified')
    await advance(AUTOSAVE_MS + 100)
    expect(mocks.validateRuntime).not.toHaveBeenCalled()
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
  })

  it('blocks manual save and autosave when the draft policy requires verification', async () => {
    const wrapper = await openPage({
      verificationStatus: 'unverified',
      persistencePolicy: 'blocked_until_verified'
    })
    const localId = await addFinding(wrapper)
    const button = wrapper.get<HTMLButtonElement>(SAVE_BUTTON)
    expect(button.element.disabled).toBe(true)
    expect(wrapper.get(SAVE_STATUS).text()).toContain('verifiziert')
    await button.trigger('click')
    await advance(AUTOSAVE_MS + 100)
    expect(mocks.saveDraft).not.toHaveBeenCalled()
    expect(mocks.validateRuntime).not.toHaveBeenCalled()
    expect(flow.currentRuntimeDraft?.payload.patientFindings[0]?.localId).toBe(localId)
  })

  it('keeps save errors separate from validation and permits an explicit retry', async () => {
    mocks.saveDraft.mockRejectedValueOnce({
      response: { status: 503, data: { detail: 'Synthetic draft endpoint unavailable' } }
    })
    const wrapper = await openPage()
    const localId = await addFinding(wrapper)
    await wrapper.get(SAVE_BUTTON).trigger('click')
    await flushPromises()
    expect(flow.draftPersistenceStatus).toBe('error')
    expect(flow.hasUnpersistedDraftChanges).toBe(true)
    expect(wrapper.get(SAVE_ERROR).text()).toContain('unavailable')
    expect(flow.currentRuntimeDraft?.payload.patientFindings[0]?.localId).toBe(localId)

    await advance(VALIDATION_SETTLE_MS)
    expect(flow.lastTemplateValidation?.ok).toBe(true)
    expect(wrapper.get('[data-testid="validation-error"]').text()).toBe('')
    expect(flow.draftPersistenceStatus).toBe('error')
    // A validation result must not silently retry a failed save.
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1)

    await wrapper.get(SAVE_BUTTON).trigger('click')
    await flushPromises()
    await nextTick()
    expect(mocks.saveDraft).toHaveBeenCalledTimes(2)
    expect(latestSave().expectedRevision).toBe(INITIAL_REVISION)
    expect(flow.draftPersistenceStatus).toBe('saved')
    expect(flow.hasUnpersistedDraftChanges).toBe(false)
    expect(wrapper.find(SAVE_ERROR).exists()).toBe(false)
  })

  it('preserves local edits and stops subsequent saves after a revision conflict', async () => {
    mocks.saveDraft.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          detail: 'The report draft was modified by another writer.',
          current_revision: 9,
          updated_at: INITIAL_TIMESTAMP
        }
      }
    })
    const wrapper = await openPage()
    const localId = await addFinding(wrapper)
    await wrapper.get(SAVE_BUTTON).trigger('click')
    await flushPromises()
    expect(flow.draftPersistenceStatus).toBe('conflict')
    expect(flow.draftConflict).toMatchObject({
      patientExaminationId: PATIENT_EXAMINATION_ID,
      expectedRevision: INITIAL_REVISION,
      currentRevision: 9
    })
    expect(flow.currentRuntimeDraft?.revision).toBe(INITIAL_REVISION)
    expect(flow.hasUnpersistedDraftChanges).toBe(true)
    expect(wrapper.get<HTMLButtonElement>(SAVE_BUTTON).element.disabled).toBe(true)

    await instance(wrapper).get<HTMLInputElement>('input[type="checkbox"]').setValue(true)
    await advance(AUTOSAVE_MS + 100)
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
    expect(flow.currentRuntimeDraft?.payload.patientFindings[0]).toMatchObject({
      localId,
      interventions: [{ intervention: 'biopsy' }]
    })
    expect(flow.currentRuntimeDraft?.revision).toBe(INITIAL_REVISION)
  })

  it('pauses draft saves during final persistence and resumes the dirty draft afterwards', async () => {
    const wrapper = await openPage()
    flow.setSavingFinalReport(true)
    await addFinding(wrapper)
    expect(wrapper.get<HTMLButtonElement>(SAVE_BUTTON).element.disabled).toBe(true)
    await advance(AUTOSAVE_MS + 100)
    expect(mocks.saveDraft).not.toHaveBeenCalled()
    expect(flow.hasUnpersistedDraftChanges).toBe(true)

    flow.setSavingFinalReport(false)
    await advance(AUTOSAVE_MS + 100)
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
    expect(flow.hasUnpersistedDraftChanges).toBe(false)
  })

  it('saves descriptors and interventions without filling another finding instance', async () => {
    const wrapper = await openPage()
    const firstId = await addFinding(wrapper)
    const secondId = await addFinding(wrapper)
    await selectSize(wrapper, 0)
    await instance(wrapper, 0).get<HTMLInputElement>('input[type="number"]').setValue('7')
    const intervention = instance(wrapper, 0).get<HTMLInputElement>('input[type="checkbox"]')
    await intervention.setValue(true)
    await intervention.setValue(true)
    await advance(AUTOSAVE_MS + 100)

    expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
    const findings = latestSave().payload.patientFindings
    expect(findings).toHaveLength(2)
    expect(findings[0]).toMatchObject({
      localId: firstId,
      classificationChoices: [
        {
          classification: 'size_mm',
          classificationChoice: 'size_mm',
          descriptors: [
            { classificationChoiceDescriptor: 'length_mm_descriptor', descriptorValue: 7 }
          ]
        }
      ],
      interventions: [{ intervention: 'biopsy' }]
    })
    expect(findings[1]).toMatchObject({ localId: secondId, classificationChoices: [] })
    expect(findings[1]?.interventions ?? []).toEqual([])
    expect(latestSave().payload.knowledgeBaseModule).toBe(MODULE)
    expect(latestSave().payload.knowledgeBaseVersion).toBe(VERSION)
    expect(latestValidationPayload().patientFindings[0]?.interventions).toEqual(
      findings[0]?.interventions
    )
  })

  it.each(['result', 'error'] as const)(
    'ignores an obsolete validation %s and does not revalidate on the save acknowledgement',
    async (lateOutcome) => {
      const older = deferred<ReportTemplateRuntimeValidationResult>()
      const currentResult = validationResult(true)
      mocks.validateRuntime
        .mockImplementationOnce(() => older.promise)
        .mockResolvedValueOnce(currentResult)
      const wrapper = await openPage()
      await addFinding(wrapper)
      await advance(VALIDATION_SETTLE_MS)
      expect(mocks.validateRuntime).toHaveBeenCalledTimes(1)
      const originalRequestPayload = latestValidationPayload()
      expect(originalRequestPayload.patientFindings[0]?.classificationChoices).toEqual([])

      await selectSize(wrapper)
      // Editing must not mutate the already-dispatched validation snapshot.
      expect(originalRequestPayload.patientFindings[0]?.classificationChoices).toEqual([])
      await advance(VALIDATION_SETTLE_MS)
      expect(mocks.validateRuntime).toHaveBeenCalledTimes(2)
      expect(flow.lastTemplateValidation).toEqual(currentResult)
      expect(mocks.saveDraft).not.toHaveBeenCalled()

      if (lateOutcome === 'result') older.resolve(validationResult(false))
      else older.reject(new Error('Obsolete validation failure'))
      await flushPromises()
      expect(flow.lastTemplateValidation).toEqual(currentResult)
      expect(wrapper.get('[data-testid="validation-error"]').text()).toBe('')

      await advance(AUTOSAVE_MS + 100)
      expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
      expect(flow.currentRuntimeDraft?.revision).toBe(INITIAL_REVISION + 1)
      expect(mocks.validateRuntime).toHaveBeenCalledTimes(2)
      expect(flow.lastTemplateValidation).toEqual(currentResult)
    }
  )

  it('ignores validation after unmount while the live store still autosaves', async () => {
    const pending = deferred<ReportTemplateRuntimeValidationResult>()
    mocks.validateRuntime.mockImplementationOnce(() => pending.promise)
    const wrapper = await openPage()
    await addFinding(wrapper)
    await advance(VALIDATION_SETTLE_MS)
    expect(mocks.validateRuntime).toHaveBeenCalledTimes(1)
    expect(flow.lastTemplateValidation).toBeNull()

    wrapper.unmount()
    mounted.splice(mounted.indexOf(wrapper), 1)
    pending.resolve(validationResult(false))
    await flushPromises()
    expect(flow.lastTemplateValidation).toBeNull()

    await advance(AUTOSAVE_MS + 100)
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1)
    expect(flow.draftPersistenceStatus).toBe('saved')
  })
})
