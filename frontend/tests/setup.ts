import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Remove global Pinia setup to avoid conflicts with createTestingPinia
// Each test will use its own testing Pinia instance

// ✅ jsdom polyfills for modern DOM APIs
if (typeof (global as any).PointerEvent === 'undefined') {
  (global as any).PointerEvent = class PointerEvent extends Event {
    clientX = 0
    clientY = 0
    pointerId = 1
    pressure = 0.5
    
    constructor(type: string, init?: any) {
      super(type, init)
      if (init) {
        if (typeof init.clientX === 'number') this.clientX = init.clientX
        if (typeof init.clientY === 'number') this.clientY = init.clientY
        if (typeof init.pointerId === 'number') this.pointerId = init.pointerId
        if (typeof init.pressure === 'number') this.pressure = init.pressure
      }
    }
  } as any
}

/**
 * Mock getBoundingClientRect for a DOM element with deterministic dimensions
 * @param el - The element to mock
 * @param rect - Partial rectangle to override defaults
 */
export function mockRect(el: Element, rect: Partial<DOMRectReadOnly> = {}) {
  const base = {
    x: 0, 
    y: 0, 
    top: 0, 
    left: 0,
    width: 1000, 
    height: 80,
    right: 1000, 
    bottom: 80,
    toJSON: () => ({})
  }
  
  const mockRect = { ...base, ...rect } as DOMRect
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect)
  
  return mockRect
}

/**
 * Helper to create pointer events with clientX/Y coordinates
 */
export function createPointerEvent(type: string, options: {
  clientX?: number
  clientY?: number
  pointerId?: number
  target?: Element
} = {}) {
  return new PointerEvent(type, {
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
    pointerId: options.pointerId ?? 1,
    bubbles: true,
    ...options
  })
}

/**
 * Helper to create mouse events with clientX/Y coordinates
 */
export function createMouseEvent(type: string, options: {
  clientX?: number
  clientY?: number
  target?: Element
} = {}) {
  return new MouseEvent(type, {
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
    bubbles: true,
    ...options
  })
}
