import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AiDatasetSettingsPage from '../AiDatasetSettingsPage.vue'
const hoisted = vi.hoisted(() => ({
  fetchAiDatasetOptions: vi.fn(),
  fetchAiDatasetLabelSets: vi.fn(),
  createAiDataset: vi.fn(),
  attachAiDatasetAnnotations: vi.fn(),
  buildAiDatasetTrainingManifest: vi.fn()
}))
vi.mock('@/api/aiDatasetApi', () => ({
  fetchAiDatasetOptions: hoisted.fetchAiDatasetOptions,
  fetchAiDatasetLabelSets: hoisted.fetchAiDatasetLabelSets,
  createAiDataset: hoisted.createAiDataset,
  attachAiDatasetAnnotations: hoisted.attachAiDatasetAnnotations,
  buildAiDatasetTrainingManifest: hoisted.buildAiDatasetTrainingManifest
}))
describe('AiDatasetSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    hoisted.createAiDataset.mockResolvedValue({
      id: 9,
      value: 'Neuer Datensatz',
      label: 'Neuer Datensatz',
      datasetType: 'image',
      aiModelType: 'image_multilabel_classification',
      isActive: true,
      nameCount: 1
    })
    hoisted.fetchAiDatasetLabelSets.mockResolvedValue([
      {
        id: 3,
        name: 'Colonoscopy Labels',
        version: 2,
        labelCount: 2,
        labels: [
          { id: 11, name: 'polyp' },
          { id: 12, name: 'blood' }
        ]
      }
    ])
    hoisted.attachAiDatasetAnnotations.mockResolvedValue({
      datasetId: 7,
      videoId: null,
      frameAnnotationCount: 12,
      videoAnnotationCount: 3,
      attachedFrameAnnotationIds: [],
      attachedSegmentIds: [],
      attachedFrameAnnotationCount: 12,
      attachedSegmentCount: 3
    })
    hoisted.buildAiDatasetTrainingManifest.mockResolvedValue({
      datasetId: 7,
      datasetName: 'Dataset A',
      datasetType: 'image',
      aiModelType: 'image_multilabel_classification',
      config: {
        labelSetId: 3,
        treatUnlabeledAsNegative: true,
        includeFilePaths: false,
        checkFrameFormat: true,
        preprocessingStrategy: 'crop_to_endoscope_roi',
        recommendedModelInputStrategy: 'crop_to_endoscope_roi',
        informationSourceNames: ['manual_annotation']
      },
      summary: {
        labelCount: 2,
        sampleCount: 5,
        classFrequencies: [0.2, 0.4],
        frameFormat: {
          checkRequired: true,
          status: 'passed',
          checkedFrameCount: 5,
          expectedImageFormat: 'JPEG',
          expectedWidth: 1920,
          expectedHeight: 1080,
          expectedMode: 'RGB',
          preprocessingStrategy: 'crop_to_endoscope_roi',
          recommendedModelInputStrategy: 'crop_to_endoscope_roi',
          cropTemplatesByVideoUuid: {
            'video-uuid': [0, 1080, 550, 1900]
          },
          notes: [],
          errors: []
        }
      },
      manifest: {},
      lxAiCoreManifest: {
        schemaVersion: '1.0',
        labels: ['blood', 'polyp']
      }
    })
  })
  it('loads options and builds a configurable training manifest preview', async () => {
    const wrapper = mount(AiDatasetSettingsPage)
    await flushPromises()
    expect(hoisted.fetchAiDatasetOptions).toHaveBeenCalledTimes(1)
    expect(hoisted.fetchAiDatasetLabelSets).toHaveBeenCalledTimes(1)
    await wrapper.get('[data-test="label-set-select"]').setValue('3')
    await wrapper
      .get('[data-test="preprocessing-strategy-select"]')
      .setValue('crop_to_endoscope_roi')
    await wrapper.get('[data-test="unknowns-negative-checkbox"]').setValue(true)
    await wrapper.get('[data-test="information-source-input"]').setValue('manual_annotation')
    await wrapper.get('[data-test="build-training-manifest"]').trigger('click')
    await flushPromises()
    expect(hoisted.buildAiDatasetTrainingManifest).toHaveBeenCalledWith('7', {
      labelSetId: '3',
      treatUnlabeledAsNegative: true,
      includeFilePaths: false,
      checkFrameFormat: true,
      preprocessingStrategy: 'crop_to_endoscope_roi',
      recommendedModelInputStrategy: 'crop_to_endoscope_roi',
      informationSourceNames: ['manual_annotation']
    })
    expect(wrapper.get('[data-test="manifest-summary"]').text()).toContain('5')
    expect(wrapper.get('[data-test="frame-format-summary"]').text()).toContain('JPEG')
    expect(wrapper.get('[data-test="lx-ai-core-manifest-json"]').text()).toContain('blood')
  })
  it('creates a named dataset and selects it', async () => {
    hoisted.fetchAiDatasetOptions
      .mockResolvedValueOnce([
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
      .mockResolvedValueOnce([
        {
          id: 9,
          value: 'Neuer Datensatz',
          label: 'Neuer Datensatz',
          datasetType: 'image',
          aiModelType: 'image_multilabel_classification',
          isActive: true,
          nameCount: 1
        }
      ])
    const wrapper = mount(AiDatasetSettingsPage)
    await flushPromises()
    await wrapper.get('[data-test="new-dataset-name-input"]').setValue('Neuer Datensatz')
    await wrapper.get('[data-test="create-dataset-form"]').trigger('submit')
    await flushPromises()
    expect(hoisted.createAiDataset).toHaveBeenCalledWith({
      name: 'Neuer Datensatz',
      datasetType: 'image',
      aiModelType: 'image_multilabel_classification',
      isActive: true
    })
    expect(wrapper.get('[data-test="dataset-select"]').element.value).toBe('9')
    expect(wrapper.text()).toContain('wurde erstellt und ausgewählt')
  })
  it('attaches existing annotations to the selected dataset', async () => {
    const wrapper = mount(AiDatasetSettingsPage)
    await flushPromises()
    await wrapper.get('[data-test="attach-annotations-form"]').trigger('submit')
    await flushPromises()
    expect(hoisted.attachAiDatasetAnnotations).toHaveBeenCalledWith('7', {
      includeAllAnnotations: true,
      includeFrameAnnotations: true,
      includeVideoAnnotations: true
    })
    expect(wrapper.text()).toContain('12 Frame-Annotationen')
    expect(wrapper.text()).toContain('3 Video-Segmente')
  })
})
