import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useExaminationStore } from '@/stores/examinationStore'
import { endpoints } from '@/types/api/endpoints'

const hoisted = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  r: (path: string) => path,
  endoregApi: (path: string) => path,
  dtypesApi: (path: string) => path,
  default: {
    get: hoisted.get
  }
}))

describe('examinationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('loads reporting choices from the canonical examination dropdown endpoint', async () => {
    hoisted.get.mockResolvedValue({
      data: [
        {
          id: 7,
          name: 'colonoscopy',
          displayName: 'Koloskopie'
        }
      ]
    })

    const store = useExaminationStore()
    await store.fetchExaminations()

    expect(hoisted.get).toHaveBeenCalledOnce()
    expect(hoisted.get).toHaveBeenCalledWith(endpoints.examination.examinationsDropdown)
    expect(store.examinationsDropdown).toEqual([
      { id: 7, name: 'colonoscopy', displayName: 'Koloskopie' }
    ])
    expect(store.error).toBeNull()
  })

  it('surfaces dropdown failures without requesting a removed legacy route', async () => {
    hoisted.get.mockRejectedValue({
      response: { data: { detail: 'Dropdown unavailable' } }
    })

    const store = useExaminationStore()
    store.exams = [{ id: 99, name: 'stale_examination' }]
    await store.fetchExaminations()

    expect(hoisted.get).toHaveBeenCalledOnce()
    expect(store.exams).toEqual([])
    expect(store.error).toBe('Dropdown unavailable')
  })
})
