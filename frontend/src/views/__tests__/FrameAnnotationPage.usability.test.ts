import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import FrameAnnotation from '../FrameAnnotation.vue'

const hoisted = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  queueStore: null as any
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
  taskQueue: any[];
  taskQuerySignature: string;
  lastError: string | null;
  setSelectedLabelGroupId: any;
  setTaskMode: any;
  setTargetLabelName: any;
  setFilterLabelName: any;
  setAllowRandomFallback: any;
  setInformationSource: any;
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
    taskQueue: [] as any[],
    taskQuerySignature: 'random|Polyp||frame_annotation_frontend|1',
    lastError: null as string | null,
    setSelectedLabelGroupId: vi.fn(),
    setTaskMode: vi.fn(),
    setTargetLabelName: vi.fn(),
    setFilterLabelName: vi.fn(),
    setAllowRandomFallback: vi.fn(),
    setInformationSource: vi.fn(),
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

describe('FrameAnnotation usability audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.queueStore = buildQueueStore()
    hoisted.get.mockResolvedValue({
      data: {
        results: [{ id: 3, name: 'Upper GI' }]
      }
    })
    hoisted.post.mockResolvedValue({ data: { ok: true } })
  })

  it('zeigt zentrale UI-Texte und Primäraktionen auf Deutsch', async () => {
    const wrapper = mount(FrameAnnotation)
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Frame-Annotation')
    expect(text).toContain('Aufgabenquelle')
    expect(text).toContain('Positives Beispiel')
    expect(text).toContain('Negatives Beispiel')
    expect(text).toContain('Nicht im Datensatz aufnehmen')
  })

  it('zeigt eine verständliche Fehlermeldung, wenn das Ziel-Label im Task fehlt', async () => {
    hoisted.queueStore = buildQueueStore({
      targetLabelName: 'NichtVorhanden'
    })

    const wrapper = mount(FrameAnnotation)
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

  it.fails(
    'sollte Backend-Fehler beim Task-Laden sichtbar machen (aktuell nicht umgesetzt)',
    async () => {
      hoisted.queueStore = buildQueueStore({
        fetchBatch: vi.fn().mockImplementation(async () => {
          hoisted.queueStore.lastError = 'Backend nicht erreichbar'
          return []
        }),
        popNextTask: vi.fn(() => null),
        lastError: null
      })

      const wrapper = mount(FrameAnnotation)
      await flushPromises()

      expect(wrapper.text()).toContain('Backend nicht erreichbar')
    }
  )
})
