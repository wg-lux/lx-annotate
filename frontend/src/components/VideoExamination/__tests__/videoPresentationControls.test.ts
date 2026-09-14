import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import VideoAnnotatorControls from '../VideoAnnotatorControls.vue'
import VideoPredictionControls from '../VideoPredictionControls.vue'
import type { PredictionModelMeta } from '@/stores/videoStore'

const model: PredictionModelMeta = {
  id: 4,
  name: 'Release',
  version: '2',
  modelName: 'Segmenter',
  aiModelId: 1,
  labelsetName: 'Colon',
  labelsetVersion: 1,
  labelsetId: 1,
  weightsAvailable: true,
  isActive: true
}

const predictionProps = {
  models: [model],
  running: false,
  canRerun: true,
  buttonLabel: 'KI neu berechnen',
  modelMode: 'local' as const,
  modelMetaId: null,
  huggingFaceModelId: ''
}

describe('Video prediction controls', () => {
  it('emits numeric local model selections and an explicit rerun request', async () => {
    const wrapper = mount(VideoPredictionControls, { props: predictionProps })
    expect(wrapper.find('.prediction-model-select').text()).toContain(
      'Segmenter / Release v2 · aktiv'
    )
    await wrapper.get('.prediction-model-select').setValue('4')
    expect(wrapper.emitted('update:modelMetaId')).toEqual([[4]])
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('rerun')).toEqual([[]])
  })

  it('preserves the denied permission and busy state provided by the workflow', async () => {
    const wrapper = mount(VideoPredictionControls, {
      props: { ...predictionProps, canRerun: false, running: true }
    })
    expect(wrapper.get('.prediction-model-select').attributes('disabled')).toBeDefined()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('rerun')).toBeUndefined()
    await wrapper.setProps({ modelMode: 'huggingface' })
    expect(wrapper.get('.huggingface-model-input').attributes('disabled')).toBeDefined()
  })

  it('emits trimmed remote model input and disables an empty local model list', async () => {
    const wrapper = mount(VideoPredictionControls, { props: predictionProps })
    await wrapper.get('.model-mode-select').setValue('huggingface')
    expect(wrapper.emitted('update:modelMode')).toEqual([['huggingface']])
    await wrapper.setProps({ modelMode: 'huggingface' })
    await wrapper.get('.huggingface-model-input').setValue('  team/segmenter  ')
    expect(wrapper.emitted('update:huggingFaceModelId')).toEqual([['team/segmenter']])
    await wrapper.setProps({ modelMode: 'local', models: [] })
    expect(wrapper.get('.prediction-model-select').attributes('disabled')).toBeDefined()
  })
})

describe('Video annotator controls', () => {
  it('keeps denied restart inert, emits trimmed input, and exposes explicit restart/revert actions', async () => {
    const wrapper = mount(VideoAnnotatorControls, {
      props: {
        principalInput: '',
        basePrincipal: 'alice',
        activeLabel: 'alice',
        canApply: false,
        overrideActive: false
      }
    })
    expect(wrapper.text()).toContain('Aktiver Annotator: alice')
    expect(wrapper.get('input').attributes('placeholder')).toBe('alice')
    expect(wrapper.find('[data-test="video-annotator-override-revert"]').exists()).toBe(false)
    await wrapper.get('[data-test="video-annotator-override-apply"]').trigger('click')
    expect(wrapper.emitted('restart')).toBeUndefined()
    await wrapper.get('input').setValue('  bob  ')
    expect(wrapper.emitted('update:principalInput')).toEqual([['bob']])
    await wrapper.setProps({ canApply: true })
    await wrapper.get('[data-test="video-annotator-override-apply"]').trigger('click')
    expect(wrapper.emitted('restart')).toEqual([[]])
    await wrapper.setProps({ overrideActive: true, activeLabel: 'bob' })
    expect(wrapper.text()).toContain('Aktiver Annotator: bob')
    await wrapper.get('[data-test="video-annotator-override-revert"]').trigger('click')
    expect(wrapper.emitted('revert')).toEqual([[]])
  })
})
