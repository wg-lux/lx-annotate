declare module '@pareto-engineering/label-studio-mono' {
  class LabelStudio {
    constructor(root: string | HTMLElement, options: Record<string, unknown>)
    destroy?: () => void
  }

  export default LabelStudio
}

declare module '@pareto-engineering/label-studio-mono/libs/editor/src/index.js' {
  class LabelStudio {
    constructor(root: string | HTMLElement, options: Record<string, unknown>)
    destroy?: () => void
  }

  export default LabelStudio
}
