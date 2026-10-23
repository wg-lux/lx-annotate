import { defineComponent } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePolling } from '../usePolling'

enableAutoUnmount(afterEach)

function mountPoller(task: () => Promise<unknown>, onError = vi.fn(), initialTask = task) {
  return mount(
    defineComponent({
      setup() {
        usePolling({ task, initialTask, onError, intervalMs: 1000 })
        return () => null
      }
    })
  )
}

describe('usePolling', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('loads once and prevents overlapping periodic requests', async () => {
    let finish: (() => void) | undefined
    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const initial = vi.fn().mockResolvedValue(undefined)
    const wrapper = mountPoller(task, vi.fn(), initial)
    await flushPromises()
    expect(initial).toHaveBeenCalledTimes(1)
    expect(task).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(4000)
    expect(task).toHaveBeenCalledTimes(1)
    finish?.()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(task).toHaveBeenCalledTimes(2)
    wrapper.unmount()
    finish?.()
    await flushPromises()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports failures and continues polling after initial and periodic errors', async () => {
    const failure = new Error('offline')
    const task = vi.fn().mockRejectedValue(failure)
    const onError = vi.fn()
    mountPoller(task, onError)
    await flushPromises()
    expect(onError).toHaveBeenCalledWith(failure)
    await vi.advanceTimersByTimeAsync(1000)
    expect(onError).toHaveBeenCalledTimes(2)
    task.mockResolvedValue(undefined)
    await vi.advanceTimersByTimeAsync(1000)
    expect(task).toHaveBeenCalledTimes(3)
    expect(onError).toHaveBeenCalledTimes(2)
  })

  it('never starts a timer after disposal during the initial request', async () => {
    let finish: (() => void) | undefined
    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const wrapper = mountPoller(task)
    wrapper.unmount()
    finish?.()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    expect(task).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
