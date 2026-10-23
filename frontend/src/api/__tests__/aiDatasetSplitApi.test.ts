import { describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/axiosInstance', () => ({
  default: http,
  r: (path: string) => `/endoreg-api/${path}`
}))
import { createDatasetSplitPlan, fetchDatasetSplitPlans } from '../aiDatasetSplitApi'

describe('Dataset split API', () => {
  it('sends the exact snake_case creation contract and reads saved plans', async () => {
    http.post.mockResolvedValue({ data: { id: 9 } })
    http.get.mockResolvedValue({ data: [{ id: 9 }] })
    await createDatasetSplitPlan('7', { name: 'Study', k: 5, testPercent: 20, seed: 42 })
    expect(http.post).toHaveBeenCalledWith(
      '/endoreg-api/settings/application/ai_datasets/7/split_plans/',
      {
        name: 'Study',
        k: 5,
        test_percent: 20,
        seed: 42
      }
    )
    expect(await fetchDatasetSplitPlans('7')).toEqual([{ id: 9 }])
    expect(http.get).toHaveBeenCalledWith(
      '/endoreg-api/settings/application/ai_datasets/7/split_plans/'
    )
  })
})
