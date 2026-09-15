import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VideoTranscodeJob, VideoTranscodeOverview, VideoTranscodeStartResponse } from '@/api/anonymizationOperations'
import OverviewTranscodePanel from '../OverviewTranscodePanel.vue'

const { fetchJobs, startJob } = vi.hoisted(() => ({
  fetchJobs: vi.fn<(signal?: AbortSignal) => Promise<VideoTranscodeOverview>>(),
  startJob: vi.fn<(videoId: number, option: string, key: string) => Promise<VideoTranscodeStartResponse>>()
}))
vi.mock('@/api/anonymizationOperations', () => ({
  fetchVideoTranscodeJobs: fetchJobs,
  startVideoTranscode: startJob
}))

enableAutoUnmount(afterEach)
afterEach(() => vi.useRealTimers())

function job(overrides: Partial<VideoTranscodeJob> = {}): VideoTranscodeJob {
  return {
    id: 'transcode-job', videoId: 17, option: 'replace_processed', status: 'running',
    stage: 'transcoding', progressPercent: null, beforeBytes: null, afterBytes: null,
    savedBytes: null, errorCode: '', createdAt: '2026-09-14T09:00:00Z',
    updatedAt: '2026-09-14T09:00:00Z', ...overrides
  }
}

function overview(jobs: VideoTranscodeJob[] = []): VideoTranscodeOverview {
  return {
    jobs, options: ['replace_processed'],
    candidates: [{ videoId: 17, filename: 'processed.mp4', options: ['replace_processed'] }]
  }
}

describe('OverviewTranscodePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchJobs.mockResolvedValue(overview())
    startJob.mockResolvedValue({ job: job(), created: true })
  })

  it('uses server candidates and requires a video choice before shrinking the processed video', async () => {
    const wrapper = mount(OverviewTranscodePanel)
    await flushPromises()
    expect(wrapper.get('[data-test="start-transcode"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="transcode-video"]').text()).toContain('processed.mp4 (Video-ID: 17)')
    expect(wrapper.text()).toContain('HLS-Wiedergabe wird erneuert')
    expect(wrapper.find('[data-test="transcode-option"]').exists()).toBe(false)
    await wrapper.get('[data-test="transcode-video"]').setValue(17)
    await wrapper.get('[data-test="start-transcode"]').trigger('click')
    await flushPromises()
    expect(startJob).toHaveBeenCalledWith(17, 'replace_processed', expect.stringMatching(/^[0-9a-f-]{36}$/))
    expect(wrapper.text()).toContain('Transkodierungsauftrag angelegt')
  })

  it('makes replacement explicit and emits bulk repair scope independently of selected video', async () => {
    const wrapper = mount(OverviewTranscodePanel)
    await flushPromises()
    expect(wrapper.get('[data-test="replacement-notice"]').text()).toContain('Rohvideo bleibt erhalten')
    expect(wrapper.text()).toContain('unabhängig von Videoauswahl und Tabellenfiltern')
    await wrapper.get('[data-test="repair-and-transcode"]').trigger('click')
    expect(wrapper.emitted('repair')).toEqual([['replace_processed']])
    expect(startJob).not.toHaveBeenCalled()
    await wrapper.setProps({ repairing: true })
    expect(wrapper.get('[data-test="repair-and-transcode"]').attributes('disabled')).toBeDefined()
  })

  it('does not infer candidates or unsupported replacement options', async () => {
    fetchJobs.mockResolvedValueOnce({ jobs: [], candidates: [], options: [] })
    const wrapper = mount(OverviewTranscodePanel)
    await flushPromises()
    expect(wrapper.get('[data-test="repair-and-transcode"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="start-transcode"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="no-transcode-candidates"]').text()).toContain('keine geeigneten')
  })

  it('shows indeterminate stage progress and stops polling on measured completion', async () => {
    vi.useFakeTimers()
    fetchJobs.mockResolvedValueOnce(overview([job()]))
    fetchJobs.mockResolvedValueOnce(overview([job({
      status: 'completed', stage: 'completed', progressPercent: 100,
      beforeBytes: 4096, afterBytes: 1024, savedBytes: 0
    })]))
    const wrapper = mount(OverviewTranscodePanel)
    await flushPromises()
    expect(wrapper.get('progress').attributes('value')).toBeUndefined()
    expect(wrapper.text()).toContain('Video wird transkodiert')
    expect(wrapper.text()).not.toContain('50 %')
    await vi.advanceTimersByTimeAsync(5000)
    expect(wrapper.find('progress').exists()).toBe(false)
    expect(wrapper.text()).toContain('Vorher: 4 KiB · Nachher: 1 KiB')
    expect(wrapper.text()).toContain('Eingespart: 0 B')
    await vi.advanceTimersByTimeAsync(15000)
    expect(fetchJobs).toHaveBeenCalledTimes(2)
  })

  it('shows retained storage and server cleanup guidance when cleanup remains pending', async () => {
    fetchJobs.mockResolvedValueOnce(overview([job({
      status: 'failed', stage: 'cleanup', errorCode: 'transcode_cleanup_pending', savedBytes: 0
    })]))
    const wrapper = mount(OverviewTranscodePanel)
    await flushPromises()
    const notice = wrapper.get('[data-test="cleanup-pending"]').text()
    expect(notice).toContain('Bereinigung ausstehend')
    expect(notice).toContain('Dateien belegen weiterhin Speicher')
    expect(notice).toContain('Server beheben')
    expect(notice).toContain('danach erneut anfordern')
    expect(wrapper.text()).not.toContain('Transkodierung fehlgeschlagen')
  })

  it('recovers a failed observation without manufacturing available controls', async () => {
    vi.useFakeTimers()
    fetchJobs.mockRejectedValueOnce(new Error('unavailable'))
    const wrapper = mount(OverviewTranscodePanel)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('erneut versuchen')
    expect(wrapper.find('[data-test="start-transcode"]').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(5000)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="start-transcode"]').exists()).toBe(true)
  })

  it('retains idempotency identity and visible errors when a POST outcome is uncertain', async () => {
    startJob.mockRejectedValueOnce(new Error('timeout'))
    const wrapper = mount(OverviewTranscodePanel)
    await flushPromises()
    await wrapper.get('[data-test="transcode-video"]').setValue(17)
    await wrapper.get('[data-test="start-transcode"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('erneut versuchen')
    await wrapper.get('[data-test="start-transcode"]').trigger('click')
    await flushPromises()
    expect(startJob.mock.calls[0]).toEqual(startJob.mock.calls[1])
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('submits the explicitly selected replacement mode and ignores late acceptance after unmount', async () => {
    vi.useFakeTimers()
    let finishStart: ((response: VideoTranscodeStartResponse) => void) | undefined
    startJob.mockReturnValueOnce(new Promise((resolve) => { finishStart = resolve }))
    const wrapper = mount(OverviewTranscodePanel)
    await flushPromises()
    await wrapper.get('[data-test="transcode-video"]').setValue(17)
    await wrapper.get('[data-test="start-transcode"]').trigger('click')
    expect(startJob).toHaveBeenCalledWith(17, 'replace_processed', expect.any(String))
    expect(wrapper.get('[data-test="start-transcode"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
    finishStart?.({ job: job({ option: 'replace_processed' }), created: true })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(fetchJobs).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('coalesces external refresh triggers and aborts observation on unmount', async () => {
    vi.useFakeTimers()
    let finishRequest: ((response: VideoTranscodeOverview) => void) | undefined
    fetchJobs.mockReturnValueOnce(new Promise((resolve) => { finishRequest = resolve }))
    const wrapper = mount(OverviewTranscodePanel)
    await wrapper.setProps({ refreshToken: 1 })
    await wrapper.setProps({ refreshToken: 2 })
    expect(fetchJobs).toHaveBeenCalledTimes(1)
    const signal = fetchJobs.mock.calls[0][0]
    wrapper.unmount()
    expect(signal?.aborted).toBe(true)
    finishRequest?.(overview([job()]))
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(fetchJobs).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('refreshes jobs when the parent completes a bulk operation', async () => {
    const wrapper = mount(OverviewTranscodePanel)
    await flushPromises()
    fetchJobs.mockResolvedValueOnce(overview([job()]))
    await wrapper.setProps({ refreshToken: 1 })
    await flushPromises()
    expect(fetchJobs).toHaveBeenCalledTimes(2)
    expect(wrapper.find('progress').exists()).toBe(true)
  })
})
