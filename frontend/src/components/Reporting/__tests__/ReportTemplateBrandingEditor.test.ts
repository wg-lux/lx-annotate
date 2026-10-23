import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { ReportTemplateBuilderSection } from '@/api/reportTemplateBuilderApi'
import ReportTemplateBrandingEditor from '../ReportTemplateBrandingEditor.vue'

const logoDataUrl = 'data:image/png;base64,iVBORw0KGgo='

function section(
  sectionType: ReportTemplateBuilderSection['sectionType'],
  description = ''
): ReportTemplateBuilderSection {
  return {
    id: `section_${sectionType}`,
    sectionType,
    name: sectionType,
    description,
    fields: [],
    findings: []
  }
}

async function selectFile(wrapper: ReturnType<typeof mount>, file: File): Promise<void> {
  const input = wrapper.get<HTMLInputElement>('[data-testid="hospital-logo-upload"]')
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [file]
  })
  await input.trigger('change')
  await new Promise((resolve) => window.setTimeout(resolve, 0))
  await flushPromises()
}

function latestSections(wrapper: ReturnType<typeof mount>): ReportTemplateBuilderSection[] {
  const sections = wrapper.emitted('update:sections')?.at(-1)?.[0]
  if (!Array.isArray(sections)) throw new Error('Expected an update:sections payload.')
  return sections as ReportTemplateBuilderSection[]
}

describe('ReportTemplateBrandingEditor', () => {
  it('renders hospital identity and editable report sections in the page preview', () => {
    const findings = section('findings', 'Klinischer Befundtext')
    findings.name = 'Ösophagus und Magen'
    const wrapper = mount(ReportTemplateBrandingEditor, {
      props: {
        sections: [
          section('logo', logoDataUrl),
          section('clinic_address', 'Klinikum Beispiel\nEndoskopie\nMusterstraße 1\n12345 Berlin'),
          findings
        ],
        templateName: 'Gastroskopie Standard',
        examination: 'Gastroskopie'
      }
    })

    const preview = wrapper.get('[data-testid="branded-report-preview"]')
    expect(preview.get('img').attributes('src')).toBe(logoDataUrl)
    expect(preview.text()).toContain('Klinikum Beispiel')
    expect(preview.text()).toContain('Gastroskopie Standard')
    expect(preview.text()).toContain('Ösophagus und Magen')
    expect(preview.text()).toContain('Klinischer Befundtext')
  })

  it('adds address and uploaded logo values as existing typed template sections', async () => {
    const addressWrapper = mount(ReportTemplateBrandingEditor, {
      props: { sections: [], templateName: '', examination: '' }
    })
    await addressWrapper
      .get('[data-testid="hospital-address"]')
      .setValue('Klinikum Beispiel\nMusterstraße 1\n12345 Berlin')

    const addressSections = latestSections(addressWrapper)
    expect(addressSections).toEqual([
      expect.objectContaining({
        sectionType: 'clinic_address',
        name: 'clinic_address',
        description: 'Klinikum Beispiel\nMusterstraße 1\n12345 Berlin'
      })
    ])

    const logoWrapper = mount(ReportTemplateBrandingEditor, {
      props: { sections: [], templateName: '', examination: '' }
    })
    await selectFile(logoWrapper, new File(['png'], 'logo.png', { type: 'image/png' }))

    const logoSections = latestSections(logoWrapper)
    expect(logoSections[0]?.sectionType).toBe('logo')
    expect(logoSections[0]?.name).toBe('clinic_logo')
    expect(logoSections[0]?.description).toMatch(/^data:image\/png;base64,/)
  })

  it('removes an uploaded logo section without changing other report parts', async () => {
    const address = section('clinic_address', 'Klinikum Beispiel')
    const wrapper = mount(ReportTemplateBrandingEditor, {
      props: {
        sections: [section('logo', logoDataUrl), address],
        templateName: '',
        examination: ''
      }
    })

    await wrapper.get('[data-testid="remove-hospital-logo"]').trigger('click')

    const updatedSections = latestSections(wrapper)
    expect(updatedSections).toEqual([address])
  })

  it('rejects unsupported and oversized logo files without mutating sections', async () => {
    const wrapper = mount(ReportTemplateBrandingEditor, {
      props: { sections: [], templateName: '', examination: '' }
    })

    await selectFile(wrapper, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }))
    expect(wrapper.text()).toContain('Nicht unterstütztes Logoformat')
    expect(wrapper.emitted('update:sections')).toBeUndefined()

    await selectFile(
      wrapper,
      new File([new Uint8Array(1024 * 1024 + 1)], 'logo.png', { type: 'image/png' })
    )
    expect(wrapper.text()).toContain('größer als 1 MiB')
    expect(wrapper.emitted('update:sections')).toBeUndefined()
  })
})
