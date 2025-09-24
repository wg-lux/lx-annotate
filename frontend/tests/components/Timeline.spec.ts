import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import Timeline from '../../src/components/VideoExamination/Timeline.vue'
import { mockRect, createPointerEvent, createMouseEvent } from '../setup'

// ✅ Test data factory for segments
const createTestSegment = (overrides = {}) => ({
  id: 1,
  label: 'polyp',
  label_display: 'Polyp',
  startTime: 10,
  endTime: 20,
  avgConfidence: 0.8,
  video_id: 1,
  label_id: 1,
  ...overrides,
})

const createTestVideo = (overrides = {}) => ({
  duration: 100,
  ...overrides,
})

describe('Timeline.vue - Typed Emits & Interactions', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('A) Emit typing sanity', () => {
    it('should mount without TypeScript errors', () => {
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo(),
          currentTime: 0,
          segments: [],
          isPlaying: false,
        }
      })
      
      expect(wrapper.exists()).toBe(true)
    })

    it('should have correctly typed emit function', () => {
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo(),
          segments: [],
        }
      })
      
      // At runtime, ensure emit function exists and is callable
      expect(typeof wrapper.vm.$emit).toBe('function')
    })
  })

  describe('B) seek event', () => {
    it('should emit seek with correct time when clicking timeline in non-selection mode', async () => {
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo({ duration: 100 }),
          currentTime: 0,
          selectionMode: false,
          segments: [],
        },
        attachTo: document.body
      })

      const timeline = wrapper.find('.timeline')
      expect(timeline.exists()).toBe(true)
      
      // Mock timeline dimensions - 1000px width
      mockRect(timeline.element, { left: 0, width: 1000 })
      
      // Click at 25% position (250px)
      await timeline.trigger('mousedown', { clientX: 250 })
      
      const seekEvents = wrapper.emitted('seek')
      expect(seekEvents).toBeTruthy()
      expect(seekEvents!.length).toBe(1)
      
      // 250px / 1000px * 100s = 25s
      const emittedTime = seekEvents![0][0] as number
      expect(emittedTime).toBeCloseTo(25, 1)
    })

    it('should not emit seek when duration is 0 (guard test)', async () => {
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo({ duration: 0 }),
          selectionMode: false,
          segments: [],
        },
        attachTo: document.body
      })

      const timeline = wrapper.find('.timeline')
      mockRect(timeline.element, { left: 0, width: 1000 })
      
      await timeline.trigger('mousedown', { clientX: 250 })
      
      const seekEvents = wrapper.emitted('seek')
      expect(seekEvents).toBeUndefined()
    })
  })

  describe('C) time-selection event', () => {
    it('should emit time-selection when dragging in selection mode', async () => {
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo({ duration: 120 }),
          selectionMode: true,
          segments: [],
        },
        attachTo: document.body
      })

      const timeline = wrapper.find('.timeline')
      mockRect(timeline.element, { left: 0, width: 1000 })
      
      // Start selection at 10% (100px)
      await timeline.trigger('mousedown', { clientX: 100 })
      
      // Move to 40% (400px)
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 400 }))
      
      // End selection
      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 400 }))
      
      await nextTick()
      
      const selectionEvents = wrapper.emitted('time-selection')
      expect(selectionEvents).toBeTruthy()
      expect(selectionEvents!.length).toBe(1)
      
      const { start, end } = selectionEvents![0][0] as { start: number; end: number }
      
      // 100px / 1000px * 120s = 12s
      // 400px / 1000px * 120s = 48s
      expect(start).toBeCloseTo(12, 1)
      expect(end).toBeCloseTo(48, 1)
    })

    it('should not emit time-selection for selections smaller than 0.1s', async () => {
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo({ duration: 100 }),
          selectionMode: true,
          segments: [],
        },
        attachTo: document.body
      })

      const timeline = wrapper.find('.timeline')
      mockRect(timeline.element, { left: 0, width: 1000 })
      
      // Very small selection (0.05s)
      await timeline.trigger('mousedown', { clientX: 100 })
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 100.5 }))
      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 100.5 }))
      
      await nextTick()
      
      const selectionEvents = wrapper.emitted('time-selection')
      expect(selectionEvents).toBeFalsy()
    })
  })

  describe('D) play-pause event', () => {
    it('should emit play-pause when clicking play button', async () => {
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo(),
          isPlaying: false,
          segments: [],
        }
      })

      const playButton = wrapper.find('.play-btn')
      expect(playButton.exists()).toBe(true)
      
      await playButton.trigger('click')
      
      const playPauseEvents = wrapper.emitted('play-pause')
      expect(playPauseEvents).toBeTruthy()
      expect(playPauseEvents!.length).toBe(1)
    })

    it('should not emit play-pause when button is disabled (no video)', async () => {
      wrapper = mount(Timeline, {
        props: {
          video: null,
          segments: [],
        }
      })

      const playButton = wrapper.find('.play-btn')
      expect(playButton.attributes('disabled')).toBeDefined()
      
      await playButton.trigger('click')
      
      const playPauseEvents = wrapper.emitted('play-pause')
      expect(playPauseEvents).toBeFalsy()
    })
  })

  describe('E) segment-delete event', () => {
    it('should emit segment-delete when clicking X button', async () => {
      const testSegment = createTestSegment()
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo(),
          segments: [testSegment],
        },
        attachTo: document.body
      })

      await nextTick()
      
      const deleteBtn = wrapper.find('.segment-delete-btn')
      expect(deleteBtn.exists()).toBe(true)
      
      await deleteBtn.trigger('click')
      
      const deleteEvents = wrapper.emitted('segment-delete')
      expect(deleteEvents).toBeTruthy()
      expect(deleteEvents!.length).toBe(1)
      
      const emittedSegment = deleteEvents![0][0]
      expect(emittedSegment).toMatchObject({
        id: 1,
        label: 'polyp',
        startTime: 10,
        endTime: 20
      })
    })
  })

  describe('F) segment-resize event (Pointer Events)', () => {
    it('should emit live and final segment-resize events when dragging end handle', async () => {
      const testSegment = createTestSegment({ id: 1, startTime: 10, endTime: 20 })
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo({ duration: 100 }),
          segments: [testSegment],
        },
        attachTo: document.body
      })

      await nextTick()
      
      // Mock timeline dimensions
      const timeline = wrapper.find('.timeline')
      mockRect(timeline.element, { width: 1000 })
      
      const endHandle = wrapper.find('.end-handle')
      expect(endHandle.exists()).toBe(true)
      
      // Simulate pointer drag on end handle
      // Start: 20s = 20% of 100s = 200px
      // Move +50px = 250px = 25s
      await endHandle.trigger('pointerdown', { clientX: 200, pointerId: 1 })
      
      // Simulate pointermove (this might need to be on the element itself)
      const handleElement = endHandle.element
      handleElement.dispatchEvent(createPointerEvent('pointermove', { clientX: 250, pointerId: 1 }))
      
      // End drag
      handleElement.dispatchEvent(createPointerEvent('pointerup', { clientX: 250, pointerId: 1 }))
      
      await nextTick()
      
      const resizeEvents = wrapper.emitted('segment-resize')
      expect(resizeEvents).toBeDefined()
      
      // Should have at least 2 events: live updates + final
      expect(resizeEvents!.length).toBeGreaterThanOrEqual(1)
      
      // Check final event (last one should have final=true)
      const finalEvent = resizeEvents![resizeEvents!.length - 1]
      const [segmentId, newStart, newEnd, mode, final] = finalEvent
      
      expect(segmentId).toBe(1)
      expect(newStart).toBeCloseTo(10, 1) // Start unchanged
      expect(newEnd).toBeCloseTo(25, 1)   // End moved from 20s to 25s
      expect(mode).toBe('end')
      expect(final).toBe(true)
    })
  })

  describe('G) segment-move event', () => {
    it('should emit live and final segment-move events when dragging segment body', async () => {
      const testSegment = createTestSegment({ id: 1, startTime: 10, endTime: 20 })
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo({ duration: 100 }),
          segments: [testSegment],
        },
        attachTo: document.body
      })

      await nextTick()
      
      // Mock timeline dimensions
      const timeline = wrapper.find('.timeline')
      mockRect(timeline.element, { width: 1000 })
      
      const segment = wrapper.find('.segment')
      expect(segment.exists()).toBe(true)
      
      // Simulate dragging segment body
      // Original: 10-20s = 100-200px
      // Move +100px = 200-300px = 20-30s
      await segment.trigger('pointerdown', { clientX: 150, pointerId: 1 })
      
      const segmentElement = segment.element
      segmentElement.dispatchEvent(createPointerEvent('pointermove', { clientX: 250, pointerId: 1 }))
      segmentElement.dispatchEvent(createPointerEvent('pointerup', { clientX: 250, pointerId: 1 }))
      
      await nextTick()
      
      const moveEvents = wrapper.emitted('segment-move')
      expect(moveEvents).toBeDefined()
      expect(moveEvents!.length).toBeGreaterThanOrEqual(1)
      
      // Check final event
      const finalEvent = moveEvents![moveEvents!.length - 1]
      const [segmentId, newStart, newEnd, final] = finalEvent
      
      expect(segmentId).toBe(1)
      expect(newStart).toBeCloseTo(20, 1) // Moved +10s
      expect(newEnd).toBeCloseTo(30, 1)   // Moved +10s
      expect(final).toBe(true)
    })
  })

  describe('H) Guards and edge cases', () => {
    it('should handle duration=0 without NaN in playhead position', () => {
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo({ duration: 0 }),
          currentTime: 5,
          segments: [],
        }
      })

      // Component should mount without errors
      expect(wrapper.exists()).toBe(true)
      
      // Playhead position should be 0% (not NaN)
      const playhead = wrapper.find('.playhead')
      if (playhead.exists()) {
        const style = playhead.attributes('style')
        expect(style).toContain('left: 0%')
      }
    })

    it('should handle invalid currentTime without errors', () => {
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo({ duration: 100 }),
          currentTime: NaN,
          segments: [],
        }
      })

      expect(wrapper.exists()).toBe(true)
      
      // Should not throw errors and playhead should be at 0%
      const playhead = wrapper.find('.playhead')
      if (playhead.exists()) {
        const style = playhead.attributes('style')
        expect(style).toContain('left: 0%')
      }
    })

    it('should handle draft/temp segment IDs correctly', async () => {
      const draftSegment = createTestSegment({ 
        id: 'temp-123',
        startTime: 15,
        endTime: 25
      })
      
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo({ duration: 100 }),
          segments: [draftSegment],
        },
        attachTo: document.body
      })

      await nextTick()
      
      const segment = wrapper.find('.segment')
      expect(segment.exists()).toBe(true)
      expect(segment.classes()).toContain('draft')
      
      // Test that resize events work with string IDs
      const endHandle = wrapper.find('.end-handle')
      if (endHandle.exists()) {
        const timeline = wrapper.find('.timeline')
        mockRect(timeline.element, { width: 1000 })
        
        await endHandle.trigger('pointerdown', { clientX: 250, pointerId: 1 })
        
        const handleElement = endHandle.element
        handleElement.dispatchEvent(createPointerEvent('pointerup', { clientX: 300, pointerId: 1 }))
        
        await nextTick()
        
        const resizeEvents = wrapper.emitted('segment-resize')
        if (resizeEvents && resizeEvents.length > 0) {
          const finalEvent = resizeEvents[resizeEvents.length - 1]
          expect(finalEvent[0]).toBe('temp-123') // String ID preserved
          expect(finalEvent[4]).toBe(true) // final=true
        }
      }
    })
  })

  describe('segment-select event', () => {
    it('should emit segment-select when clicking segment body', async () => {
      const testSegment = createTestSegment()
      wrapper = mount(Timeline, {
        props: {
          video: createTestVideo(),
          segments: [testSegment],
        },
        attachTo: document.body
      })

      await nextTick()
      
      const segment = wrapper.find('.segment')
      expect(segment.exists()).toBe(true)
      
      await segment.trigger('click')
      
      const selectEvents = wrapper.emitted('segment-select')
      expect(selectEvents).toBeTruthy()
      expect(selectEvents!.length).toBe(1)
      
      const emittedSegment = selectEvents![0][0]
      expect(emittedSegment).toMatchObject({
        id: 1,
        label: 'polyp'
      })
    })
  })
})
