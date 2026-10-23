import { onMounted, onScopeDispose } from 'vue'

/** Component-owned polling: one request at a time, with explicit error ownership. */
export function usePolling(options: {
  intervalMs: number
  task: () => Promise<unknown>
  initialTask?: () => Promise<unknown>
  onError: (error: unknown) => void
}) {
  let timer: ReturnType<typeof setInterval> | undefined
  let disposed = false
  let pending = false

  async function run(task = options.task) {
    if (disposed || pending) return
    pending = true
    try {
      await task()
    } catch (error) {
      options.onError(error)
    } finally {
      pending = false
    }
  }

  onMounted(async () => {
    await run(options.initialTask)
    if (!disposed) {
      timer = setInterval(() => {
        void run()
      }, options.intervalMs)
    }
  })
  onScopeDispose(() => {
    disposed = true
    clearInterval(timer)
  })
}
