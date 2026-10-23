import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AnnotationComparisons from '../AnnotationComparisons.vue'

const get = vi.hoisted(() => vi.fn())
vi.mock('@/api/axiosInstance', () => ({
  default: { get },
  r: (path: string) => `/endoreg-api/${path}`
}))

const response = () => ({
  practitioner: 'alice',
  total: 6,
  count: 6,
  page: 1,
  pages: 2,
  results: [
    {
      video: 7,
      predictions: [],
      conflicts: 0,
      unmapped: [],
      unavailable: [],
      annotations: [
        {
          practitioner: 'bob',
          shared: 2,
          agreeing: 1,
          agreement: 50,
          intersection: 0.1,
          union: 0.4,
          overlap: 25,
          missing: 0
        }
      ],
      findings: [
        {
          practitioner: 'carol',
          kind: 'report',
          report: 12,
          matching: ['polyp'],
          own: [],
          other: ['bleeding'],
          overlap: 50
        }
      ]
    }
  ]
})

describe('AnnotationComparisons', () => {
  beforeEach(() => get.mockReset())

  it('shows named practitioners, weighted time overlap and finalized findings', async () => {
    get.mockResolvedValue({ data: response() })
    const wrapper = mount(AnnotationComparisons)
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/endoreg-api/media/annotations/comparisons/', {
      params: { page: 1 }
    })
    for (const text of [
      'alice',
      'bob',
      'carol',
      '25.0 %',
      '0.10 s / 0.40 s',
      'Finalisierter Bericht 12',
      'polyp',
      'bleeding'
    ])
      expect(wrapper.text()).toContain(text)
    get.mockResolvedValue({ data: { ...response(), page: 2 } })
    const next = wrapper.findAll('button').find((button) => button.text() === 'Weiter')
    await next?.trigger('click')
    await flushPromises()
    expect(get).toHaveBeenLastCalledWith('/endoreg-api/media/annotations/comparisons/', {
      params: { page: 2 }
    })
    expect(wrapper.text()).toContain('Seite 2 von 2')
  })

  it('weights peer overlap by duration and scopes it to the current page', async () => {
    const data = response()
    data.results[0].annotations.push({
      practitioner: 'dave',
      shared: 2,
      agreeing: 2,
      agreement: 100,
      intersection: 0.9,
      union: 1.6,
      overlap: 56.25,
      missing: 0
    })
    get.mockResolvedValue({ data })
    const wrapper = mount(AnnotationComparisons)
    await flushPromises()
    expect(wrapper.get('[data-test="peer-overlap"]').text()).toBe('50.0 %')
    expect(wrapper.text()).toContain('2 auswertbare Video-Annotator-Paare · Seite 1 von 2')
    expect(wrapper.get('progress').attributes()).toMatchObject({ value: '6', max: '10' })
    expect(wrapper.text()).toContain('4 weitere Annotationen')
  })

  it.each([
    [0, 10],
    [10, 50],
    [100, 500]
  ])('keeps the next milestone ahead of %i annotations', async (count, target) => {
    get.mockResolvedValue({ data: { ...response(), count, total: count, results: [] } })
    const wrapper = mount(AnnotationComparisons)
    await flushPromises()
    expect(wrapper.get('progress').attributes()).toMatchObject({
      value: String(count),
      max: String(target)
    })
    expect(wrapper.get('[data-test="peer-overlap"]').text()).toBe('Nicht auswertbar')
  })

  it.each([
    [0, 0, 10],
    [10, 1, 50],
    [1000, 5, 2000],
    [2000, 6, 3000]
  ])('derives levels and the active milestone from %i annotations', async (total, level, next) => {
    get.mockResolvedValue({ data: { ...response(), total } })
    const wrapper = mount(AnnotationComparisons)
    await flushPromises()
    expect(wrapper.get('[data-test="annotation-level"]').text()).toBe(`Stufe ${String(level)}`)
    const track = wrapper.get('[aria-label="Annotationsmeilensteine"]')
    expect(track.get('[aria-current="step"]').text()).toContain(next.toLocaleString('de-DE'))
    expect(track.get('[aria-current="step"]').text()).toContain('Nächstes Ziel')
    expect(track.findAll('.is-earned')).toHaveLength(level)
    expect(wrapper.text()).not.toContain('Ihr Beitrag')
  })

  it('displays measured zero overlap as zero', async () => {
    const data = response()
    data.results[0].annotations[0].intersection = 0
    data.results[0].annotations[0].overlap = 0
    get.mockResolvedValue({ data })
    const wrapper = mount(AnnotationComparisons)
    await flushPromises()
    expect(wrapper.get('[data-test="peer-overlap"]').text()).toBe('0.0 %')
  })

  it('shows AI separately and rejects an outdated contract instead of inventing totals', async () => {
    const data = response()
    get.mockResolvedValue({
      data: {
        ...data,
        results: [
          {
            ...data.results[0],
            predictions: [{ ...data.results[0].annotations[0], practitioner: 'KI-Lauf 12' }]
          }
        ]
      }
    })
    const wrapper = mount(AnnotationComparisons)
    await flushPromises()
    expect(wrapper.get('[data-test="ai-overlap"]').text()).toBe('25.0 %')
    expect(wrapper.text()).toContain('KI-Lauf 12')
    get.mockResolvedValue({ data: { ...data, total: undefined } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('progress').exists()).toBe(false)
  })

  it('distinguishes unavailable timing from zero overlap', async () => {
    const data = response()
    get.mockResolvedValue({
      data: {
        ...data,
        results: [
          {
            ...data.results[0],
            annotations: [
              {
                practitioner: 'bob',
                shared: 0,
                agreeing: 0,
                agreement: null,
                intersection: null,
                union: null,
                overlap: null,
                missing: 2
              }
            ],
            unavailable: ['missing_mapping']
          }
        ]
      }
    })
    const wrapper = mount(AnnotationComparisons)
    await flushPromises()
    expect(wrapper.text()).toContain('Nicht auswertbar')
    expect(wrapper.text()).toContain('2 ohne Zeitnachweis')
    expect(wrapper.text()).toContain('Keine Label-zu-Befund-Zuordnung vorhanden.')
  })

  it('shows empty and failed requests explicitly and permits retry', async () => {
    get.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mount(AnnotationComparisons)
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('konnten nicht geladen werden')
    get.mockResolvedValue({
      data: { practitioner: 'alice', count: 0, total: 0, page: 1, pages: 1, results: [] }
    })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Noch keine zugeordneten')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
