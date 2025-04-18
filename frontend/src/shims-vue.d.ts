declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Fix for vue-filepond
declare module 'vue-filepond' {
  import { DefineComponent } from 'vue';
  export default function (...plugins: any[]): DefineComponent<any, any, any>;
}
