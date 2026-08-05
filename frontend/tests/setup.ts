import { afterEach, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Ensure Pinia exists before test modules import stores at file scope.
setActivePinia(createPinia())

function hasCallableProperty(target: object, property: string): boolean {
  return typeof Reflect.get(target, property) === 'function'
}

if (!hasCallableProperty(globalThis, 'ResizeObserver')) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock
}

if (!hasCallableProperty(window, 'matchMedia')) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
}

if (!hasCallableProperty(window, 'scrollTo')) {
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: vi.fn()
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.clearAllTimers()
  vi.clearAllMocks()
})
