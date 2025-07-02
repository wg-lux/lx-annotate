/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, unknown, unknown>
  export default component
}


interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_API_PREFIX: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
