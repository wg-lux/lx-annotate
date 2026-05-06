import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAnnotationQueueStore } from '@/stores/annotationQueue'

const hoisted = vi.hoisted(() => ({
  get: vi.fn(),
  fetchApplicationSettings: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.get
  },
  r: (path: string) => path
}))

vi.mock('@/api/applicationSettingsApi', () => ({
  fetchApplicationSettings: hoisted.fetchApplicationSettings
}))

function buildTask(frameId: number) {
  return {
    id: `task-${frameId}`,
    frameId,
    imageUrl: `/media/frame-${frameId}.jpg`,
    labelOptions: [{ id: 11, name: 'Polyp' }]
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

async function waitForGetCall(count: number): Promise<void> {
  for (let index = 0; index < 10; index += 1) {
    if (hoisted.get.mock.calls.length >= count) return
    await Promise.resolve()
  }
  expect(hoisted.get).toHaveBeenCalledTimes(count)
}

describe('annotationQueue store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
    hoisted.fetchApplicationSettings.mockResolvedValue({})
  })

  it('discards stale batch results after clearQueue invalidates the queue generation', async () => {
    const staleRequest = deferred<any>()
    hoisted.get
      .mockReturnValueOnce(staleRequest.promise)
      .mockResolvedValueOnce({ data: { tasks: [buildTask(202)] } })

    const store = useAnnotationQueueStore()
    store.setSelectedLabelGroupId('3')
    store.setAnnotatorPrincipal('old-annotator')

    const staleBatch = store.fetchBatch(10)
    await waitForGetCall(1)

    store.clearQueue()
    staleRequest.resolve({ data: { tasks: [buildTask(101)] } })

    await expect(staleBatch).resolves.toEqual([])
    expect(store.taskQueue).toHaveLength(0)

    const freshBatch = await store.fetchBatch(10)

    expect(freshBatch.map((task) => task.data.frameId)).toEqual([202])
    expect(store.taskQueue.map((task) => task.data.frameId)).toEqual([202])
  })

  it('discards stale batch results when the task query signature changes', async () => {
    const staleRequest = deferred<any>()
    hoisted.get
      .mockReturnValueOnce(staleRequest.promise)
      .mockResolvedValueOnce({ data: { tasks: [buildTask(303)] } })

    const store = useAnnotationQueueStore()
    store.setSelectedLabelGroupId('3')
    store.setAnnotatorPrincipal('old-annotator')

    const staleBatch = store.fetchBatch(10)
    await waitForGetCall(1)

    store.setAnnotatorPrincipal('new-annotator')
    staleRequest.resolve({ data: { tasks: [buildTask(101)] } })

    await expect(staleBatch).resolves.toEqual([])
    expect(store.taskQueue).toHaveLength(0)

    const freshBatch = await store.fetchBatch(10)

    expect(hoisted.get.mock.calls[0][1].params.annotator).toBe('old-annotator')
    expect(hoisted.get.mock.calls[1][1].params.annotator).toBe('new-annotator')
    expect(freshBatch.map((task) => task.data.frameId)).toEqual([303])
    expect(store.taskQueue.map((task) => task.data.frameId)).toEqual([303])
  })

  it('does not expose stale errors after the task query signature changes', async () => {
    const staleRequest = deferred<any>()
    hoisted.get.mockReturnValueOnce(staleRequest.promise)

    const store = useAnnotationQueueStore()
    store.setSelectedLabelGroupId('3')
    store.setAnnotatorPrincipal('old-annotator')

    const staleBatch = store.fetchBatch(10)
    await waitForGetCall(1)

    store.setAnnotatorPrincipal('new-annotator')
    staleRequest.reject({ message: 'old request failed' })

    await expect(staleBatch).resolves.toEqual([])
    expect(store.lastError).toBeNull()
    expect(store.taskQueue).toHaveLength(0)
  })
})
