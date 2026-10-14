import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AiDatasetSplitBuilder from './AiDatasetSplitBuilder.vue'
import DatasetLabelHistogram from './DatasetLabelHistogram.vue'
import type { DatasetSplitPlan } from '@/api/aiDatasetSplitApi'

const FRAMES_PER_PATIENT = 10
const FOLD_PATIENT_COUNT = 4
const TEST_PATIENT_COUNT = 2
const SPLIT_FOLD_COUNT = 2
const SPLIT_TEST_PERCENT = 20
const SPLIT_SEED = 42

const splitApi = vi.hoisted(() => ({
  fetchDatasetSplitPlans: vi.fn(),
  createDatasetSplitPlan: vi.fn()
}))
vi.mock('@/api/aiDatasetSplitApi', () => splitApi)
const bucket = (patientCount: number) => ({
  patientCount,
  videoCount: patientCount * 2,
  frameCount: patientCount * FRAMES_PER_PATIENT,
  imageAnnotationCount: patientCount * FRAMES_PER_PATIENT,
  segmentCount: patientCount
})
const plan: DatasetSplitPlan = {
  id: 1,
  datasetId: 7,
  createdAt: '2026-09-11T10:00:00Z',
  config: { name: 'Plan', k: SPLIT_FOLD_COUNT, testPercent: SPLIT_TEST_PERCENT, seed: SPLIT_SEED },
  total: bucket(10),
  test: bucket(TEST_PATIENT_COUNT),
  folds: [
    { index: 0, training: bucket(FOLD_PATIENT_COUNT), validation: bucket(FOLD_PATIENT_COUNT) },
    { index: 1, training: bucket(FOLD_PATIENT_COUNT), validation: bucket(FOLD_PATIENT_COUNT) }
  ]
}
describe('Dataset split builder', () => {
  beforeEach(() => {
    splitApi.fetchDatasetSplitPlans.mockResolvedValue([])
    splitApi.createDatasetSplitPlan.mockResolvedValue(plan)
  })
  it('creates a plan and renders three proportional buckets', async () => {
    const wrapper = mount(AiDatasetSplitBuilder, { props: { datasetId: '7' } })
    await flushPromises()
    await wrapper.get('#split-name').setValue('Plan')
    await wrapper.get('#split-k').setValue(SPLIT_FOLD_COUNT)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(splitApi.createDatasetSplitPlan).toHaveBeenCalledWith('7', {
      name: 'Plan',
      k: SPLIT_FOLD_COUNT,
      testPercent: SPLIT_TEST_PERCENT,
      seed: SPLIT_SEED
    })
    expect(wrapper.findAll('[role="progressbar"]')).toHaveLength(3)
    expect(wrapper.get('[data-test="split-buckets"]').text()).toContain('20.0 %')
    await wrapper.get('#split-fold').setValue(1)
    expect(wrapper.get('[data-test="split-buckets"]').text()).toContain('Test (fest)')
    expect(wrapper.get('[role="status"]').text()).toContain('gespeichert')
  })
  it('rejects invalid inputs without a request', async () => {
    const wrapper = mount(AiDatasetSplitBuilder, { props: { datasetId: '7' } })
    await flushPromises()
    await wrapper.get('#split-name').setValue('Plan')
    await wrapper.get('#split-k').setValue(1)
    await wrapper.get('form').trigger('submit')
    expect(splitApi.createDatasetSplitPlan).not.toHaveBeenCalled()
  })
  it('ignores a stale load after switching datasets', async () => {
    let finish: (plans: DatasetSplitPlan[]) => void = () => {
      throw new Error('Pending load not initialized')
    }
    splitApi.fetchDatasetSplitPlans.mockImplementationOnce(
      () =>
        new Promise<DatasetSplitPlan[]>((resolve) => {
          finish = resolve
        })
    )
    const wrapper = mount(AiDatasetSplitBuilder, { props: { datasetId: '7' } })
    await wrapper.setProps({ datasetId: '8' })
    await flushPromises()
    finish([plan])
    await flushPromises()
    expect(wrapper.find('[data-test="split-buckets"]').exists()).toBe(false)
  })
  it('shows save errors and permits retry', async () => {
    splitApi.createDatasetSplitPlan.mockRejectedValueOnce(new Error('failed'))
    const wrapper = mount(AiDatasetSplitBuilder, { props: { datasetId: '7' } })
    await flushPromises()
    await wrapper.get('#split-name').setValue('Plan')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('nicht erstellt')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })
  it('does not show a stale save under another dataset', async () => {
    let finish: (value: DatasetSplitPlan) => void = () => {
      throw new Error('Save not started')
    }
    splitApi.createDatasetSplitPlan.mockImplementationOnce(
      () =>
        new Promise<DatasetSplitPlan>((resolve) => {
          finish = resolve
        })
    )
    const wrapper = mount(AiDatasetSplitBuilder, { props: { datasetId: '7' } })
    await flushPromises()
    await wrapper.get('#split-name').setValue('Plan')
    await wrapper.get('form').trigger('submit')
    await wrapper.setProps({ datasetId: '8' })
    await flushPromises()
    finish(plan)
    await flushPromises()
    expect(wrapper.find('[data-test="split-buckets"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Split-Plan gespeichert.')
  })
  it('loads saved plans and resets the fold when changing plans', async () => {
    splitApi.fetchDatasetSplitPlans.mockResolvedValue([plan, { ...plan, id: 2 }])
    const wrapper = mount(AiDatasetSplitBuilder, { props: { datasetId: '7' } })
    await flushPromises()
    await wrapper.get('#split-fold').setValue(1)
    await wrapper.get('#split-plan').setValue(2)
    expect((wrapper.get('#split-fold').element as HTMLSelectElement).value).toBe('0')
  })
  it('renders label counts including zero without invalid widths', () => {
    const wrapper = mount(DatasetLabelHistogram, {
      props: {
        rows: [
          { labelId: 1, labelName: 'Polyp', frameCount: 8 },
          { labelId: 2, labelName: 'Blood', frameCount: 0 }
        ]
      }
    })
    expect(wrapper.text()).toContain('8 Frames')
    expect(wrapper.findAll('.progress-bar')[1]?.attributes('style')).toContain('width: 0%')
  })
})
