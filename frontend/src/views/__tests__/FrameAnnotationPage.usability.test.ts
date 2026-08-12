import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import type {
  AnnotationInformationSource,
  AnnotationTask,
  AnnotationTaskMode,
  FrameFileType
} from '@/stores/annotationQueue'
import FrameAnnotation from '../FrameAnnotation.vue'

const hoisted = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  queueStore: {} as BaseStore,
  fetchAiDatasetOptions: vi.fn()
}))

vi.mock('uuid', () => ({
  v7: () => 'uuid-annotation-1'
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.get,
    post: hoisted.post
  },
  r: (path: string) => path
}))

vi.mock('@/stores/annotationQueue', () => ({
  useAnnotationQueueStore: () => hoisted.queueStore
}))

vi.mock('@/api/aiDatasetApi', () => ({
  fetchAiDatasetOptions: hoisted.fetchAiDatasetOptions
}))

vi.mock('@/stores/auth_kc', () => ({
  useAuthKcStore: () => ({
    user: {
      sub: 'kc-user-7',
      username: 'annotator',
      canOverrideAnnotationPrincipal: true
    }
  })
}))

interface BaseStore {
  selectedLabelGroupId: string | null
  taskMode: AnnotationTaskMode
  targetLabelName: string
  filterLabelName: string | null
  allowRandomFallback: boolean
  informationSource: AnnotationInformationSource
  frameFileType: FrameFileType
  aiDatasetId?: string | null
  aiDatasetName?: string | null
  aiDatasetType?: string | null
  annotatorPrincipal: string | null
  taskQueue: AnnotationTask[]
  taskQuerySignature: string
  lastError: string | null
  setSelectedLabelGroupId: Mock
  setTaskMode: Mock
  setTargetLabelName: Mock
  setFilterLabelName: Mock
  setAllowRandomFallback: Mock
  setInformationSource: Mock
  setFrameFileType: Mock
  setAiDataset?: Mock
  setAnnotatorPrincipal: Mock
  clearQueue: Mock
  fetchBatch: Mock
  popNextTask: Mock
}

// 2. Use the interface for the overrides
type QueueStoreOverrides = Partial<BaseStore>

function buildQueueStore(overrides: QueueStoreOverrides = {}) {
  const baseStore: BaseStore = {
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
    lastError: null as string | null,
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
    popNextTask: vi.fn(() => nextTasks.shift() ?? null)
  }
  const task = {
    id: 'task-1',
    data: {
      frameId: 101,
      imageUrl: '/media/frame-101.jpg',
      existingExternalId: 'external-101',
      annotationMode: 'multilabel',
      labelOptions: [
        { id: 11, name: 'Polyp' },
        { id: 12, name: 'Blutung' }
      ],
      manualAnnotations: [],
      predictionAnnotations: [],
      suggestedLabelIds: [11]
    }
  }
  const nextTasks = [task, null]

  return { ...baseStore, ...overrides }
}

function installGetMock(
  options: { streamStatus?: number; streamBody?: Blob; streamContentType?: string } = {}
) {
  const {
    streamStatus = 200,
    streamBody = new Blob(['frame'], { type: options.streamContentType ?? 'image/jpeg' }),
    streamContentType = 'image/jpeg'
  } = options

  hoisted.get.mockImplementation((url: string) => {
    if (url === 'media/videos/label-sets/list/') {
      return Promise.resolve({
        data: {
          results: [{ id: 3, name: 'Upper GI' }]
        }
      })
    }
    if (url === 'media/annotations/frames/boxes/') {
      return Promise.resolve({ data: { results: [] } })
    }
    if (url.startsWith('/media/frame-') || url.includes('/decoded-stream/')) {
      return Promise.resolve({
        status: streamStatus,
        data: streamBody,
        headers: { 'content-type': streamContentType }
      })
    }
    return Promise.resolve({ data: { results: [] } })
  })
}

function mountFrameAnnotation() {
  return mount(FrameAnnotation, {
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>'
        }
      }
    }
  })
}

describe('FrameAnnotation usability audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    hoisted.queueStore = buildQueueStore()
    hoisted.fetchAiDatasetOptions.mockResolvedValue([
      {
        id: 7,
        value: 'Dataset A',
        label: 'Dataset A',
        datasetType: 'image',
        aiModelType: 'image_multilabel_classification',
        isActive: true,
        nameCount: 1
      }
    ])
    installGetMock()
    hoisted.post.mockResolvedValue({ data: { ok: true } })
  })

  it('zeigt zentrale UI-Texte und Primäraktionen auf Deutsch', async () => {
    const wrapper = mountFrameAnnotation()
    await flushPromises()
    await wrapper.get('img[alt="Zu annotierender Frame"]').trigger('load')

    const text = wrapper.text()
    expect(text).toContain('Frame-Annotation')
    expect(text).toContain('Aufgabenquelle')
    expect(text).toContain('Positives Beispiel')
    expect(text).toContain('Negatives Beispiel')
    expect(text).toContain('Aufgabe überspringen')
  })

  it('zeigt waehrend des Bildladens einen sichtbaren Status an', async () => {
    installGetMock({
      streamStatus: 202,
      streamBody: new Blob([JSON.stringify({ status: 'frame_extraction_pending' })], {
        type: 'application/json'
      }),
      streamContentType: 'application/json'
    })

    const wrapper = mountFrameAnnotation()
    await flushPromises()

    expect(wrapper.get('[data-test="frame-image-status"]').text()).toContain(
      'Frame wird extrahiert'
    )
  })

  it('zeigt eine verständliche Fehlermeldung, wenn das Ziel-Label im Task fehlt', async () => {
    hoisted.queueStore = buildQueueStore({
      targetLabelName: 'NichtVorhanden'
    })

    const wrapper = mountFrameAnnotation()
    await flushPromises()
    await wrapper.get('img[alt="Zu annotierender Frame"]').trigger('load')

    await wrapper.get('[data-test="positive-example-button"]').trigger('click')
    await flushPromises()

    expect(hoisted.post).not.toHaveBeenCalledWith(
      'media/annotations/frames/bulk-upsert/',
      expect.anything()
    )
    expect(wrapper.text()).toContain(
      'Ziel-Label "NichtVorhanden" ist für diesen Frame nicht verfügbar.'
    )
  })

  it('zeigt Backend-Fehler beim Task-Laden sichtbar an', async () => {
    const queueStore = buildQueueStore({
      popNextTask: vi.fn(() => null),
      lastError: null
    })
    queueStore.fetchBatch = vi.fn().mockImplementation(() => {
      queueStore.lastError = 'Backend nicht erreichbar'
      return Promise.resolve([])
    })
    hoisted.queueStore = queueStore

    const wrapper = mountFrameAnnotation()
    await flushPromises()

    expect(wrapper.text()).toContain('Backend nicht erreichbar')
  })
})
