import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import FrameAnnotation from '../FrameAnnotation.vue'

const hoisted = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  queueStore: null as any,
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
      username: 'annotator'
    }
  })
}))

interface BaseStore {
  selectedLabelGroupId: string;
  taskMode: string;
  targetLabelName: string;
  filterLabelName: string | null;
  allowRandomFallback: boolean;
  informationSource: string;
  aiDatasetId?: string | null;
  aiDatasetName?: string | null;
  aiDatasetType?: string | null;
  annotatorPrincipal: string | null;
  taskQueue: any[];
  taskQuerySignature: string;
  lastError: string | null;
  setSelectedLabelGroupId: any;
  setTaskMode: any;
  setTargetLabelName: any;
  setFilterLabelName: any;
  setAllowRandomFallback: any;
  setInformationSource: any;
  setAiDataset?: any;
  setAnnotatorPrincipal: any;
  clearQueue: any;
  fetchBatch: any;
  popNextTask: any;
}

// 2. Use the interface for the overrides
type QueueStoreOverrides = Partial<BaseStore>;

function buildQueueStore(overrides: QueueStoreOverrides = {}) {
  const baseStore: BaseStore = {
    selectedLabelGroupId: '3',
    taskMode: 'random',
    targetLabelName: 'Polyp',
    filterLabelName: null,
    allowRandomFallback: true,
    informationSource: 'frame_annotation_frontend',
    aiDatasetId: null,
    aiDatasetName: null,
    aiDatasetType: null,
    annotatorPrincipal: null,
    taskQueue: [] as any[],
    taskQuerySignature: 'random|Polyp||frame_annotation_frontend|1',
    lastError: null as string | null,
    setSelectedLabelGroupId: vi.fn(),
    setTaskMode: vi.fn(),
    setTargetLabelName: vi.fn(),
    setFilterLabelName: vi.fn(),
    setAllowRandomFallback: vi.fn(),
    setInformationSource: vi.fn(),
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

function installGetMock(options: { streamStatus?: number; streamBody?: Blob; streamContentType?: string } = {}) {
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
    if (url.startsWith('/media/frame-')) {
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

    const text = wrapper.text()
    expect(text).toContain('Frame-Annotation')
    expect(text).toContain('Aufgabenquelle')
    expect(text).toContain('Positives Beispiel')
    expect(text).toContain('Negatives Beispiel')
    expect(text).toContain('Nicht im Datensatz aufnehmen')
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

  it(
    'zeigt Backend-Fehler beim Task-Laden sichtbar an',
    async () => {
      hoisted.queueStore = buildQueueStore({
        fetchBatch: vi.fn().mockImplementation(async () => {
          hoisted.queueStore.lastError = 'Backend nicht erreichbar'
          return []
        }),
        popNextTask: vi.fn(() => null),
        lastError: null
      })

      const wrapper = mountFrameAnnotation()
      await flushPromises()

      expect(wrapper.text()).toContain('Backend nicht erreichbar')
    }
  )
})
