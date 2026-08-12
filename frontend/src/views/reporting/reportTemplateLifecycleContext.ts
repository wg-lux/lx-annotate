import type { ComputedRef, InjectionKey } from 'vue'

import type { ReportTemplateLifecycleStatus } from '@/types/reportTemplate'

export type ReportTemplateLifecycleChange = {
  moduleName: string
  templateName: string
  examination: string
  lifecycleStatus: ReportTemplateLifecycleStatus
}

export type ReportTemplateLifecycleContext = {
  activeModuleName: ComputedRef<string>
  notifyLifecycleChanged: (change: ReportTemplateLifecycleChange) => Promise<void>
}

export const reportTemplateLifecycleContextKey: InjectionKey<ReportTemplateLifecycleContext> =
  Symbol('report-template-lifecycle-context')
