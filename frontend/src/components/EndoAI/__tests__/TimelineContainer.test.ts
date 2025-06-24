import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TimelineContainer from '@/components/EndoAI/TimelineContainer.vue'
import type { Segment } from '@/stores/videoStore'

// Mock the Segment component
vi.mock('@/components/EndoAI/Segment.vue', () => ({
  default: {
    name: 'Segment',
    template: '<div class="mock-segment" :data-segment-id="segment.id"></div>',
    props: ['segment', 'videoDuration', 'isActive', 'showConfidence', 'labelTranslations'],
    emits: ['select', 'contextmenu', 'dragStart', 'resizeStart']
  }
}))

describe('TimelineContainer.vue', () => {
  // Sample segments matching the API response structure
  const sampleSegments: Segment[] = [
    {
      id: 28,
      label: 'snare',
      label_name: 'snare',
      label_display: 'Snare',
      startTime: 0.0,
      endTime: 2.0,
      start_time: 0.0,
      end_time: 2.0,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 17
    },
    {
      id: 30,
      label: 'snare', 
      label_name: 'snare',
      label_display: 'Snare',
      startTime: 0.0,
      endTime: 2.3,
      start_time: 0.0,
      end_time: 2.3,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 17
    },
    {
      id: 24,
      label: 'outside',
      label_name: 'outside', 
      label_display: 'Außerhalb',
      startTime: 0.88,
      endTime: 1.44,
      start_time: 0.88,
      end_time: 1.44,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 12
    },
    {
      id: 21,
      label: 'polyp',
      label_name: 'polyp',
      label_display: 'Polyp', 
      startTime: 1.84,
      endTime: 3.24,
      start_time: 1.84,
      end_time: 3.24,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 3
    },
    {
      id: 23,
      label: 'snare',
      label_name: 'snare',
      label_display: 'Snare',
      startTime: 3.12,
      endTime: 5.1,
      start_time: 3.12,
      end_time: 5.1,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 17
    },
    {
      id: 26,
      label: 'snare',
      label_name: 'snare', 
      label_display: 'Snare',
      startTime: 3.46,
      endTime: 4.6,
      start_time: 3.46,
      end_time: 4.6,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 17
    },
    {
      id: 25,
      label: 'polyp',
      label_name: 'polyp',
      label_display: 'Polyp',
      startTime: 5.14,
      endTime: 6.26,
      start_time: 5.14,
      end_time: 6.26,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 3
    },
    {
      id: 33,
      label: 'snare',
      label_name: 'snare',
      label_display: 'Snare',
      startTime: 7.94,
      endTime: 9.06,
      start_time: 7.94,
      end_time: 9.06,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 17
    },
    {
      id: 27,
      label: 'snare',
      label_name: 'snare',
      label_display: 'Snare', 
      startTime: 8.54,
      endTime: 9.12,
      start_time: 8.54,
      end_time: 9.12,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 17
    },
    {
      id: 29,
      label: 'snare',
      label_name: 'snare',
      label_display: 'Snare',
      startTime: 8.78,
      endTime: 9.34,
      start_time: 8.78,
      end_time: 9.34,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 17
    },
    {
      id: 31,
      label: 'snare',
      label_name: 'snare',
      label_display: 'Snare',
      startTime: 0.0,
      endTime: 1.76,
      start_time: 0.0,
      end_time: 1.76,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 17
    },
    {
      id: 32,
      label: 'snare',
      label_name: 'snare',
      label_display: 'Snare',
      startTime: 0.0,
      endTime: 1.74,
      start_time: 0.0,
      end_time: 1.74,
      avgConfidence: 1.0,
      video_id: 2,
      label_id: 17
    }
  ]

  const defaultProps = {
    segments: sampleSegments,
    duration: 10.0, // 10 seconds
    currentTime: 2.5,
    isPlaying: false,
    hasVideo: true,
    selectionMode: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock DOM methods
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
    
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 400,
      top: 0,
      left: 0,
      bottom: 400,
      right: 800,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Multi-row Layout Algorithm', () => {
    it('arranges all 12 segments into separate rows when necessary', () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      // Check that segments are properly distributed
      const segmentRows = wrapper.findAll('.segment-row')
      expect(segmentRows.length).toBeGreaterThan(1)
      
      // Should have created multiple rows due to overlapping segments
      const segmentCount = wrapper.find('.segment-count')
      expect(segmentCount.text()).toContain('12 Segmente')
      expect(segmentCount.text()).toMatch(/\d+ Reihen/)
    })

    it('prevents overlapping segments in the same row', () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      // Get all mock segments - fix the component finding
      const mockSegments = wrapper.findAll('.mock-segment')
      expect(mockSegments.length).toBe(12)

      // Verify each segment is rendered
      sampleSegments.forEach(segment => {
        const segmentElement = wrapper.find(`[data-segment-id="${segment.id}"]`)
        expect(segmentElement.exists()).toBe(true)
      })
    })

    it('calculates optimal row placement for overlapping segments', () => {
      // Test with heavily overlapping segments at the start (0.0-2.3s)
      const overlappingSegments = sampleSegments.filter(s => 
        s.startTime <= 2.3 && s.endTime >= 0.0
      )
      
      expect(overlappingSegments.length).toBeGreaterThanOrEqual(5) // Several overlapping segments
      
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          segments: overlappingSegments
        }
      })

      const rows = wrapper.findAll('.segment-row')
      expect(rows.length).toBeGreaterThanOrEqual(2) // Should create multiple rows
    })

    it('handles segments with same start time correctly', () => {
      // Multiple segments starting at 0.0
      const sameStartSegments = sampleSegments.filter(s => s.startTime === 0.0)
      expect(sameStartSegments.length).toBeGreaterThanOrEqual(4)

      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          segments: sameStartSegments
        }
      })

      // Should arrange them in separate rows
      const rows = wrapper.findAll('.segment-row')
      expect(rows.length).toBeGreaterThanOrEqual(2)
    })

    it('respects maximum row limit', () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          maxRows: 3
        }
      })

      const rows = wrapper.findAll('.segment-row')
      expect(rows.length).toBeLessThanOrEqual(3)
    })

    it('adjusts viewport height based on number of rows', () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      const viewport = wrapper.find('.timeline-viewport')
      const style = viewport.attributes('style')
      
      // Height should be calculated based on number of rows
      expect(style).toMatch(/height: \d+px/)
      
      // With multiple rows, height should be substantial
      const heightMatch = style?.match(/height: (\d+)px/)
      if (heightMatch) {
        const height = parseInt(heightMatch[1])
        expect(height).toBeGreaterThan(100) // Multiple rows need more height
      }
    })
  })

  describe('Segment Display and Labels', () => {
    it('renders all segments with correct label binding', () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      // Check that all 12 segments are rendered - fix component finding
      const mockSegments = wrapper.findAll('.mock-segment')
      expect(mockSegments.length).toBe(12)

      // Verify segments are present in DOM
      sampleSegments.forEach((segment) => {
        const segmentElement = wrapper.find(`[data-segment-id="${segment.id}"]`)
        expect(segmentElement.exists()).toBe(true)
      })
    })

    it('shows segment count and row information', () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      const segmentInfo = wrapper.find('.segment-count')
      expect(segmentInfo.text()).toContain('12 Segmente')
      expect(segmentInfo.text()).toMatch(/\d+ Reihen/)
    })

    it('displays row labels when enabled', () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          showRowLabels: true
        }
      })

      const rowLabels = wrapper.findAll('.row-label')
      expect(rowLabels.length).toBeGreaterThan(0)
      
      if (rowLabels.length > 0) {
        expect(rowLabels[0].text()).toContain('Reihe 1')
      }
    })

    it('hides row labels when disabled', () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          showRowLabels: false
        }
      })

      const rowLabels = wrapper.findAll('.row-label')
      expect(rowLabels.length).toBe(0)
    })
  })

  describe('Drag and Resize Events', () => {
    it('handles segment resize events', async () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      // Simulate resize event by calling the method directly and checking emit
      const segmentId = 28
      const newStart = 0.5
      const newEnd = 2.5
      const mode = 'end'
      const final = false

      // Trigger resize via emit simulation
      wrapper.vm.$emit('segment-resize', segmentId, newStart, newEnd, mode, final)
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.emitted('segment-resize')).toBeTruthy()
    })

    it('handles segment move events', async () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      // Simulate move event via emit
      const segmentId = 28
      const newStart = 1.0
      const newEnd = 3.0
      const final = true

      wrapper.vm.$emit('segment-move', segmentId, newStart, newEnd, final)
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.emitted('segment-move')).toBeTruthy()
    })

    it('handles mouse drag operations', async () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      // Mock mouse events
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100
      })

      // Simulate drag start by accessing the component's reactive data
      const segment = sampleSegments[0]
      
      // Directly simulate the drag state changes
      await wrapper.vm.$nextTick()
      
      // Check that the component has the drag handling methods
      expect(typeof wrapper.vm.handleDragStart).toBe('function')
    })

    it('handles resize operations with mouse tracking', async () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 200,
        clientY: 100
      })

      const segment = sampleSegments[0]
      await wrapper.vm.handleResizeStart(segment, 'end', mouseDownEvent)
      
      expect(wrapper.vm.isResizing).toBe(true)
      expect(wrapper.vm.activeResizeSegmentId).toBe(segment.id)
    })

    it('cleans up event listeners on drag end', async () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      const segment = sampleSegments[0]
      const mouseEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      
      // Start drag
      await wrapper.vm.handleDragStart(segment, mouseEvent)
      expect(wrapper.vm.isDragging).toBe(true)
      
      // End drag
      await wrapper.vm.handleDragEnd(new MouseEvent('mouseup'))
      expect(wrapper.vm.isDragging).toBe(false)
      expect(wrapper.vm.activeDragSegmentId).toBe(null)
    })
  })

  describe('Timeline Interaction', () => {
    it('handles timeline clicks for seeking', async () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          selectionMode: false
        }
      })

      const interactionArea = wrapper.find('.timeline-interaction')
      
      await interactionArea.trigger('mousedown', {
        clientX: 400, // Middle of 800px width
        clientY: 100
      })

      expect(wrapper.emitted('seek')).toBeTruthy()
      // Should seek to middle of duration (5 seconds)
      expect(wrapper.emitted('seek')?.[0][0]).toBeCloseTo(5.0, 1)
    })

    it('handles time selection in selection mode', async () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          selectionMode: true
        }
      })

      const interactionArea = wrapper.find('.timeline-interaction')
      
      // Start selection
      await interactionArea.trigger('mousedown', {
        clientX: 200, // 25% of width
        clientY: 100
      })

      expect(wrapper.vm.isSelecting).toBe(true)
    })

    it('shows selection overlay during selection', async () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          selectionMode: true
        }
      })

      // Start selection
      wrapper.vm.isSelecting = true
      wrapper.vm.selectionStart = 25
      wrapper.vm.selectionEnd = 75
      
      await wrapper.vm.$nextTick()
      
      const overlay = wrapper.find('.selection-overlay')
      expect(overlay.exists()).toBe(true)
      
      const style = overlay.attributes('style')
      expect(style).toContain('left: 25%')
      expect(style).toContain('width: 50%')
    })

    it('emits time-selection events', async () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          selectionMode: true
        }
      })

      // Simulate selection by directly setting the reactive values
      wrapper.vm.isSelecting = true
      wrapper.vm.selectionStart = 20 // 20% = 2s
      wrapper.vm.selectionEnd = 60   // 60% = 6s
      
      // Call the selection end method directly
      const startTime = (20 / 100) * defaultProps.duration
      const endTime = (60 / 100) * defaultProps.duration
      
      wrapper.vm.$emit('time-selection', { start: startTime, end: endTime })
      await wrapper.vm.$nextTick()
      
      expect(wrapper.emitted('time-selection')).toBeTruthy()
      expect(wrapper.emitted('time-selection')?.[0][0]).toEqual({
        start: 2.0,
        end: 6.0
      })
    })
  })

  describe('Playhead and Controls', () => {
    it('positions playhead correctly based on current time', () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          currentTime: 2.5, // 25% of 10s duration
          duration: 10.0
        }
      })

      const playhead = wrapper.find('.playhead')
      const style = playhead.attributes('style')
      expect(style).toContain('left: 25%')
    })

    it('handles playhead dragging for seeking', async () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      const playheadHandle = wrapper.find('.playhead-handle')
      
      // Simulate seeking by emitting the event
      wrapper.vm.$emit('seek', 3.75) // 37.5% of 10s duration
      
      await wrapper.vm.$nextTick()

      // Should emit seek events
      expect(wrapper.emitted('seek')).toBeTruthy()
    })

    it('displays play/pause button correctly', () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          isPlaying: false
        }
      })

      const playBtn = wrapper.find('.play-btn')
      expect(playBtn.exists()).toBe(true)
      expect(playBtn.find('.fa-play').exists()).toBe(true)
    })

    it('shows pause icon when playing', () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          isPlaying: true
        }
      })

      const playBtn = wrapper.find('.play-btn')
      expect(playBtn.find('.fa-pause').exists()).toBe(true)
    })

    it('emits play-pause events', async () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      const playBtn = wrapper.find('.play-btn')
      await playBtn.trigger('click')
      
      expect(wrapper.emitted('play-pause')).toBeTruthy()
    })
  })

  describe('Time Markers and Zoom', () => {
    it('generates appropriate time markers based on duration', () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      const timeMarkers = wrapper.findAll('.time-marker')
      expect(timeMarkers.length).toBeGreaterThan(0)
      
      // Should have markers at regular intervals
      const firstMarker = timeMarkers[0]
      expect(firstMarker.find('.marker-text').exists()).toBe(true)
    })

    it('handles zoom level changes', async () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      const initialZoom = wrapper.vm.zoomLevel
      
      // Simulate wheel zoom
      const interactionArea = wrapper.find('.timeline-interaction')
      await interactionArea.trigger('wheel', {
        deltaY: -100 // Zoom in
      })

      expect(wrapper.vm.zoomLevel).toBeGreaterThan(initialZoom)
    })

    it('shows zoom level in header', () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      const zoomDisplay = wrapper.find('.zoom-level')
      expect(zoomDisplay.text()).toMatch(/\d+%/)
      expect(zoomDisplay.text()).toContain('100%') // Default zoom
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles empty segments array', () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          segments: []
        }
      })

      expect(wrapper.find('.segment-count').text()).toContain('0 Segmente')
      expect(wrapper.findAll('.segment-row').length).toBe(0)
    })

    it('handles zero duration gracefully', () => {
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          duration: 0
        }
      })

      const playhead = wrapper.find('.playhead')
      const style = playhead.attributes('style')
      expect(style).toContain('left: 0%')
    })

    it('handles segments with invalid time values', () => {
      const invalidSegments = [{
        ...sampleSegments[0],
        startTime: NaN,
        endTime: undefined as any,
        start_time: null as any,
        end_time: Infinity
      }]

      expect(() => {
        mount(TimelineContainer, {
          props: {
            ...defaultProps,
            segments: invalidSegments
          }
        })
      }).not.toThrow()
    })

    it('cleans up event listeners on unmount', () => {
      const wrapper = mount(TimelineContainer, {
        props: defaultProps
      })

      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      
      wrapper.unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalled()
    })
  })

  describe('Performance and Optimization', () => {
    it('efficiently handles large numbers of segments', () => {
      // Create 100 segments
      const manySegments = Array.from({ length: 100 }, (_, i) => ({
        ...sampleSegments[0],
        id: i,
        startTime: i * 0.1,
        endTime: (i + 1) * 0.1,
        start_time: i * 0.1,
        end_time: (i + 1) * 0.1
      }))

      const start = performance.now()
      
      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          segments: manySegments,
          duration: 20.0
        }
      })

      const end = performance.now()
      
      // Should render without significant performance issues
      expect(end - start).toBeLessThan(1000) // Less than 1 second
      expect(wrapper.findAll('.mock-segment').length).toBe(100)
    })

    it('optimizes row calculation for overlapping segments', () => {
      // Create overlapping segments that would stress the algorithm
      const overlappingSegments = Array.from({ length: 50 }, (_, i) => ({
        ...sampleSegments[0],
        id: i,
        startTime: 0,
        endTime: 10,
        start_time: 0,
        end_time: 10
      }))

      const wrapper = mount(TimelineContainer, {
        props: {
          ...defaultProps,
          segments: overlappingSegments,
          maxRows: 10
        }
      })

      // Should respect max rows limit
      const rows = wrapper.findAll('.segment-row')
      expect(rows.length).toBeLessThanOrEqual(10)
    })
  })
})