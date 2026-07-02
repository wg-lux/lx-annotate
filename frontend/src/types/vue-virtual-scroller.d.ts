declare module 'vue-virtual-scroller' {
  import type { Plugin, Component } from 'vue'

  // Define types for component props (adjust these as needed)
  export interface RecycleScrollerProps {
    items: any[]
    itemSize: number | null
    keyField?: string
    // You can add further props here.
  }

  // Export the components (if you use them directly)
  export const RecycleScroller: Component<RecycleScrollerProps>
  export const DynamicScroller: Component<any>
  export const DynamicScrollerItem: Component<any>

  // Declare the plugin runtime value which will be used via app.use
  const VueVirtualScroller: Plugin
  export default VueVirtualScroller
}
