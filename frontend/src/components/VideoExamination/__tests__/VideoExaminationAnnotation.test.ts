import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import VideoExaminationAnnotation from '../VideoExaminationAnnotation.vue'
import { useVideoStore } from '@/stores/videoStore'
import { useAnonymizationStore } from '@/stores/anonymizationStore'
import { useMediaTypeStore } from '@/stores/mediaTypeStore'
import { useToastStore } from '@/stores/toastStore'

// Mock the child components
vi.mock('@/components/Examination/SimpleExaminationForm.vue', () => ({
  default: {
    name: 'SimpleExaminationForm',
    template: '<div data-testid="examination-form">Mock Examination Form</div>',
    emits: ['examination-saved'],
    props: ['video-timestamp', 'video-id']
  }
}))

vi.mock('@/components/VideoExamination/Timeline.vue', () => ({
  default: {
    name: 'Timeline',
    template: '<div data-testid="timeline">Mock Timeline</div>',
    props: [
      'video',
      'segments',
      'labels',
      'current-time',
      'is-playing',
      'active-segment-id',
      'show-waveform',
      'selection-mode',
      'fps'
    ],
    emits: [
      'seek',
      'play-pause',
      'segment-select',
      'segment-resize',
      'segment-move',
      'segment-create',
      'segment-delete',
      'time-selection'
    ]
  }
}))

// Mock axios
vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  },
  r: (path: string) => `/api/${path}`
}))

// Mock Vue Router
const mockRouter = {
  replace: vi.fn(),
  push: vi.fn()
}

const mockRoute = {
  query: { video: null }
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => mockRoute
}))

// Mock utils
vi.mock('@/utils/videoUtils', () => ({
  formatTime: vi.fn(
    (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(0).padStart(2, '0')}`
  ),
  getTranslationForLabel: vi.fn((label: string) => `Translated ${label}`),
  getColorForLabel: vi.fn((label: string) => '#ff0000')
}))

describe('VideoExaminationAnnotation.vue', () => {
  let wrapper: VueWrapper
  let pinia: any
  let videoStore: any
  let anonymizationStore: any
  let mediaStore: any
  let toastStore: any

  const mockVideos = [
    {
      id: 6,
      original_file_name: 'test_video.mp4',
      centerName: 'Test Center',
      processorName: 'Test Processor'
    },
    {
      id: 8,
      original_file_name: 'test_outside.mp4',
      centerName: 'Another Center',
      processorName: 'Another Processor'
    }
  ]

  const mockSegments = [
    {
      id: 1,
      label: 'outside',
      startTime: 10.0,
      endTime: 15.0,
      avgConfidence: 0.95,
      videoID: 6,
      labelID: 1
    },
    {
      id: 2,
      label: 'polyp',
      startTime: 45.0,
      endTime: 52.0,
      avgConfidence: 0.88,
      videoID: 6,
      labelID: 2
    },
    {
      id: 3,
      label: 'outside',
      startTime: 78.0,
      endTime: 83.0,
      avgConfidence: 0.92,
      videoID: 8,
      labelID: 1
    }
  ]

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    // Setup stores
    videoStore = useVideoStore()
    anonymizationStore = useAnonymizationStore()
    mediaStore = useMediaTypeStore()
    toastStore = useToastStore()

    // Mock store data
    videoStore.videoList = { videos: mockVideos }
    videoStore.allSegments = mockSegments
    videoStore.labels = [
      { name: 'outside', color: '#ff0000' },
      { name: 'polyp', color: '#00ff00' }
    ]

    anonymizationStore.overview = [
      { id: 6, mediaType: 'video', anonymizationStatus: 'done_processing_anonymization' },
      { id: 8, mediaType: 'video', anonymizationStatus: 'done_processing_anonymization' }
    ]

    // Mock store methods
    videoStore.fetchAllVideos = vi.fn()
    videoStore.loadVideo = vi.fn()
    videoStore.fetchAllSegments = vi.fn()
    videoStore.clearVideo = vi.fn()
    videoStore.createSegment = vi.fn()
    videoStore.updateSegmentInMemory = vi.fn()
    videoStore.deleteSegment = vi.fn()
    videoStore.removeSegment = vi.fn()
    videoStore.patchSegmentLocally = vi.fn()
    videoStore.startDraft = vi.fn()
    videoStore.updateDraftEnd = vi.fn()
    videoStore.commitDraft = vi.fn()
    videoStore.cancelDraft = vi.fn()

    mediaStore.setCurrentItem = vi.fn()
    mediaStore.getVideoUrl = vi.fn().mockReturnValue('http://test.com/video.mp4')

    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('CRITICAL TEST: Video-specific segment filtering', () => {
    it('should filter segments by selected video ID', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      // Set selected video ID
      await wrapper.setData({ selectedVideoId: 6 })
      await nextTick()

      const vm = wrapper.vm as any
      const timelineSegments = vm.timelineSegmentsForSelectedVideo

      // Should only show segments for video ID 6
      expect(timelineSegments).toHaveLength(2)
      expect(timelineSegments.every((s: any) => s.video_id === 6)).toBe(true)
      expect(timelineSegments.map((s: any) => s.label)).toEqual(['outside', 'polyp'])
    })

    it('should return empty array when no video selected', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      const vm = wrapper.vm as any
      expect(vm.timelineSegmentsForSelectedVideo).toEqual([])
    })

    it('should normalize segment field names for Timeline compatibility', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.setData({ selectedVideoId: 6 })
      await nextTick()

      const vm = wrapper.vm as any
      const segment = vm.timelineSegmentsForSelectedVideo[0]

      // Check normalized fields
      expect(segment).toHaveProperty('id', 1)
      expect(segment).toHaveProperty('label', 'outside')
      expect(segment).toHaveProperty('label_display', 'outside')
      expect(segment).toHaveProperty('name', 'outside')
      expect(segment).toHaveProperty('startTime', 10.0)
      expect(segment).toHaveProperty('endTime', 15.0)
      expect(segment).toHaveProperty('avgConfidence', 0.95)
      expect(segment).toHaveProperty('video_id', 6)
      expect(segment).toHaveProperty('label_id', 1)
    })
  })

  describe('CRITICAL TEST: Play/Pause state tracking', () => {
    it('should initialize with isPlaying = false', () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      const vm = wrapper.vm as any
      expect(vm.isPlaying).toBe(false)
    })

    it('should update isPlaying when video play event fires', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      const vm = wrapper.vm as any

      // Mock video element
      const mockVideo = {
        addEventListener: vi.fn(),
        duration: 120,
        readyState: 4,
        networkState: 1,
        videoWidth: 640,
        videoHeight: 480
      }

      vm.videoRef = mockVideo
      await vm.onVideoLoaded()

      // Simulate play event
      const playCall = mockVideo.addEventListener.mock.calls.find((call) => call[0] === 'play')
      const playListener = playCall?.[1]
      playListener?.()

      expect(vm.isPlaying).toBe(true)
    })

    it('should update isPlaying when video pause event fires', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      const vm = wrapper.vm as any
      vm.isPlaying = true

      // Mock video element
      const mockVideo = {
        addEventListener: vi.fn(),
        duration: 120,
        readyState: 4,
        networkState: 1
      }

      vm.videoRef = mockVideo
      await vm.onVideoLoaded()

      // Simulate pause event
      const pauseCall = mockVideo.addEventListener.mock.calls.find((call) => call[0] === 'pause')
      const pauseListener = pauseCall?.[1]
      pauseListener()

      expect(vm.isPlaying).toBe(false)
    })
  })

  describe('CRITICAL TEST: Timeline event handlers', () => {
    beforeEach(async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.setData({
        selectedVideoId: 6,
        duration: 120,
        selectedLabelType: 'polyp'
      })
      await nextTick()
    })

    it('should handle play/pause events correctly', async () => {
      const vm = wrapper.vm as any

      // Mock video element
      const mockVideo = {
        paused: true,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn()
      }
      vm.videoRef = mockVideo

      // Test play
      await vm.handlePlayPause()
      expect(mockVideo.play).toHaveBeenCalled()

      // Test pause
      mockVideo.paused = false
      await vm.handlePlayPause()
      expect(mockVideo.pause).toHaveBeenCalled()
    })

    it('should handle segment selection', async () => {
      const vm = wrapper.vm as any

      vm.handleSegmentSelect(123)
      expect(vm.selectedSegmentId).toBe(123)
    })

    it('should handle time selection for segment creation', async () => {
      const vm = wrapper.vm as any

      // Mock createSegment
      const createSpy = vi.spyOn(vm, 'handleCreateSegment').mockResolvedValue(undefined)

      vm.handleTimeSelection({ start: 20, end: 30 })

      expect(createSpy).toHaveBeenCalledWith({
        label: 'polyp',
        start: 20,
        end: 30
      })
    })

    it('should show error when trying to create segment without label', async () => {
      const vm = wrapper.vm as any
      vm.selectedLabelType = ''

      const errorSpy = vi.spyOn(vm, 'showErrorMessage')

      vm.handleTimeSelection({ start: 20, end: 30 })

      expect(errorSpy).toHaveBeenCalledWith(
        'Bitte wählen Sie ein Label aus, bevor Sie ein Segment erstellen.'
      )
    })
  })

  describe('CRITICAL TEST: Segment CRUD operations', () => {
    beforeEach(async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.setData({
        selectedVideoId: 6,
        selectedLabelType: 'polyp'
      })
      await nextTick()
    })

    it('should create segment correctly', async () => {
      const vm = wrapper.vm as any

      await vm.handleCreateSegment({
        label: 'polyp',
        start: 20,
        end: 30
      })

      expect(videoStore.createSegment).toHaveBeenCalledWith('6', 'polyp', 20, 30)
    })

    it('should handle segment resize with preview and final save', async () => {
      const vm = wrapper.vm as any

      // Test preview (final = false)
      vm.handleSegmentResize(1, 10, 20, 'resize', false)

      expect(videoStore.patchSegmentLocally).toHaveBeenCalledWith(1, {
        startTime: 10,
        endTime: 20
      })
      expect(videoStore.updateSegmentInMemory).not.toHaveBeenCalled()

      // Test final save (final = true)
      vm.handleSegmentResize(1, 10, 20, 'resize', true)

      expect(videoStore.updateSegmentInMemory).toHaveBeenCalledWith(1, {
        startTime: 10,
        endTime: 20
      })
    })

    it('should ignore operations on draft/temp segments', async () => {
      const vm = wrapper.vm as any

      vm.handleSegmentResize('draft', 10, 20, 'resize', true)
      vm.handleSegmentResize('temp-123', 10, 20, 'resize', true)

      expect(videoStore.patchSegmentLocally).not.toHaveBeenCalled()
      expect(videoStore.updateSegmentInMemory).not.toHaveBeenCalled()
    })

    it('should delete segment correctly', async () => {
      const vm = wrapper.vm as any

      const mockSegment = {
        id: 1,
        label: 'polyp',
        startTime: 10,
        endTime: 20
      }

      await vm.handleSegmentDelete(mockSegment)

      expect(videoStore.removeSegment).toHaveBeenCalledWith(1)
      expect(videoStore.deleteSegment).toHaveBeenCalledWith(1)
    })

    it('should not delete draft segments', async () => {
      const vm = wrapper.vm as any

      const mockDraftSegment = {
        id: 'draft',
        label: 'polyp',
        startTime: 10,
        endTime: 20
      }

      await vm.handleSegmentDelete(mockDraftSegment)

      expect(videoStore.removeSegment).not.toHaveBeenCalled()
      expect(videoStore.deleteSegment).not.toHaveBeenCalled()
    })
  })

  describe('CRITICAL TEST: Timeline component binding', () => {
    it('should pass correct props to Timeline component', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.setData({
        selectedVideoId: 6,
        duration: 120,
        currentTime: 45,
        isPlaying: true,
        selectedSegmentId: 1,
        fps: 50
      })
      await nextTick()

      const timeline = wrapper.findComponent({ name: 'Timeline' })
      expect(timeline.exists()).toBe(true)

      const props = timeline.props()
      expect(props.video).toEqual({ duration: 120 })
      expect(props.segments).toHaveLength(2) // 2 segments for video ID 6
      expect(props['current-time']).toBe(45)
      expect(props['is-playing']).toBe(true)
      expect(props['active-segment-id']).toBe(1)
      expect(props['selection-mode']).toBe(true)
      expect(props.fps).toBe(50)
    })

    it('should emit correct events to Timeline component', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.setData({
        selectedVideoId: 6,
        duration: 120
      })
      await nextTick()

      const timeline = wrapper.findComponent({ name: 'Timeline' })
      const emittedEvents = timeline.vm.$options.emits

      // Check all required events are bound
      expect(emittedEvents).toContain('seek')
      expect(emittedEvents).toContain('play-pause')
      expect(emittedEvents).toContain('segment-select')
      expect(emittedEvents).toContain('segment-resize')
      expect(emittedEvents).toContain('segment-move')
      expect(emittedEvents).toContain('segment-create')
      expect(emittedEvents).toContain('segment-delete')
      expect(emittedEvents).toContain('time-selection')
    })
  })

  describe('CRITICAL TEST: Video loading and state management', () => {
    it('should load video data correctly when video changes', async () => {
      const axiosInstance = await import('@/api/axiosInstance')
      const getMock = axiosInstance.default.get as any

      getMock.mockResolvedValueOnce({
        data: {
          video_url: 'http://test.com/video.mp4',
          duration: 120,
          fps: 50
        }
      })

      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      const vm = wrapper.vm as any
      await vm.loadVideoDetail(6)

      expect(vm.videoDetail).toEqual({ video_url: 'http://test.com/video.mp4' })
      expect(vm.videoMeta).toEqual({ duration: 120, fps: 50 })
      expect(vm.duration).toBe(120)
      expect(mediaStore.setCurrentItem).toHaveBeenCalled()
    })

    it('should clear video state when no video selected', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      const vm = wrapper.vm as any
      await vm.loadSelectedVideo()

      expect(videoStore.clearVideo).toHaveBeenCalled()
      expect(vm.videoDetail).toBeNull()
      expect(vm.videoMeta).toBeNull()
    })
  })

  describe('CRITICAL TEST: Draft segment workflow', () => {
    beforeEach(async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.setData({
        selectedVideoId: 6,
        duration: 120,
        currentTime: 30,
        selectedLabelType: 'polyp'
      })
      await nextTick()
    })

    it('should start draft segment correctly', async () => {
      const vm = wrapper.vm as any

      vm.startLabelMarking()

      expect(vm.isMarkingLabel).toBe(true)
      expect(vm.labelMarkingStart).toBe(30)
      expect(videoStore.startDraft).toHaveBeenCalledWith('polyp', 30)
    })

    it('should finish draft segment correctly', async () => {
      const vm = wrapper.vm as any
      vm.isMarkingLabel = true
      vm.currentTime = 45

      await vm.finishLabelMarking()

      expect(videoStore.updateDraftEnd).toHaveBeenCalledWith(45)
      expect(videoStore.commitDraft).toHaveBeenCalled()
      expect(vm.isMarkingLabel).toBe(false)
      expect(vm.selectedLabelType).toBe('')
    })

    it('should cancel draft segment correctly', async () => {
      const vm = wrapper.vm as any
      vm.isMarkingLabel = true

      vm.cancelLabelMarking()

      expect(videoStore.cancelDraft).toHaveBeenCalled()
      expect(vm.isMarkingLabel).toBe(false)
      expect(vm.selectedLabelType).toBe('')
    })
  })

  describe('CRITICAL TEST: Error handling', () => {
    it('should handle video loading errors gracefully', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      const vm = wrapper.vm as any
      const mockVideoEvent = {
        target: {
          error: { code: 4, message: 'Network error' },
          networkState: 3,
          readyState: 0,
          currentSrc: 'http://test.com/video.mp4'
        }
      }

      const errorSpy = vi.spyOn(vm, 'showErrorMessage')

      vm.onVideoError(mockVideoEvent)

      expect(errorSpy).toHaveBeenCalledWith(
        'Fehler beim Laden des Videos. Bitte versuchen Sie es erneut.'
      )
    })

    it('should handle API errors in guarded function', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      const vm = wrapper.vm as any
      const mockError = {
        response: {
          data: {
            detail: 'API Error message'
          }
        }
      }

      const result = await vm.guarded(Promise.reject(mockError))

      expect(result).toBeUndefined()
      expect(vm.errorMessage).toBe('API Error message')
    })
  })

  describe('CRITICAL TEST: Video URL resolution', () => {
    it('should resolve video URL through MediaStore first', async () => {
      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.setData({ selectedVideoId: 6 })
      await nextTick()

      const vm = wrapper.vm as any
      const videoUrl = vm.videoStreamSrc

      expect(mediaStore.setCurrentItem).toHaveBeenCalled()
      expect(mediaStore.getVideoUrl).toHaveBeenCalled()
      expect(videoUrl).toBe('http://test.com/video.mp4')
    })

    it('should fallback to videoDetail URL when MediaStore fails', async () => {
      mediaStore.getVideoUrl.mockReturnValue(null)

      wrapper = mount(VideoExaminationAnnotation, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.setData({
        selectedVideoId: 6,
        videoDetail: { video_url: 'http://fallback.com/video.mp4' }
      })
      await nextTick()

      const vm = wrapper.vm as any
      expect(vm.videoStreamSrc).toBe('http://fallback.com/video.mp4')
    })
  })
})
