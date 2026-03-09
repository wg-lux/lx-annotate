/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, unknown, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_PREFIX?: string
  readonly VITE_FINDINGS_BACKEND?: 'endoreg' | 'dtypes_read' | 'dtypes'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
