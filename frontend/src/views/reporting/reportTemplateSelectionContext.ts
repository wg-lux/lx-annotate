import { inject, type InjectionKey } from 'vue'

export type ReportTemplateSelectionContext = {
  selectTemplate: (name: string, select?: HTMLSelectElement) => Promise<void>
}

export const reportTemplateSelectionContextKey: InjectionKey<ReportTemplateSelectionContext> =
  Symbol('report-template-selection-context')

export function useReportTemplateSelection(): ReportTemplateSelectionContext {
  const context = inject(reportTemplateSelectionContextKey)
  if (!context) {
    throw new Error('Template selection requires the reporting shell context.')
  }
  return context
}
