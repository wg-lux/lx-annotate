import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { vi, type MockedFunction } from 'vitest'

/**
 * Enhanced mount utility with proper Pinia testing setup
 * @param component - Vue component to mount
 * @param options - Additional mounting options
 * @returns Mounted wrapper with Pinia integration
 */
export function mountWithTestingPinia(component: any, options: any = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false, // Allow real action execution for better testing
  })

  return mount(component, {
    global: {
      plugins: [pinia],
      ...options.global,
    },
    ...options,
  })
}

/**
 * Create a mock store function that returns reactive refs
 * @param storeData - The store state and methods to mock
 * @returns Mock store function
 */
export function createMockStore<T extends Record<string, any>>(storeData: T): MockedFunction<() => T> {
  return vi.fn(() => storeData)
}

export { vi } from 'vitest'
