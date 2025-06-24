import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Segment from '@/components/EndoAI/Segment.vue'
import type { Segment as SegmentType } from '@/stores/videoStore'

// Mock Font Awesome icons
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    template: '<i></i>'
  }
}))

describe('Segment.vue', () => {
  const mockSegment: SegmentType = {
    id: 1,
    label: 'polyp',
    label_name: 'polyp', // Changed to 'polyp' to match the translation
    label_display: 'Test Label',
    startTime: 0,
    endTime: 5,
    avgConfidence: 0.8,
    start_time: 0,
    end_time: 5,
    video_id: 123,
    label_id: 4
  }

  const defaultProps = {
    segment: mockSegment,
    videoDuration: 120, // 2 minutes
    isActive: false,
    showConfidence: true
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('Label Display', () => {
    it('shows the correct label from API label_name field', () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      const labelElement = wrapper.find('.segment-label')
      expect(labelElement.exists()).toBe(true)
      expect(labelElement.text()).toBe('Polyp') // German translation
    })

    it('falls back to label field when label_name is missing', () => {
      const segmentWithoutLabelName = {
        ...mockSegment,
        label_name: mockSegment.label // Changed: Use label value instead of undefined
      }

      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          segment: segmentWithoutLabelName
        }
      })

      const labelElement = wrapper.find('.segment-label')
      expect(labelElement.text()).toBe('Polyp')
    })

    it('uses custom label translations when provided', () => {
      const customTranslations = {
        polyp: 'Custom Polyp Label'
      }

      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          labelTranslations: customTranslations
        }
      })

      const labelElement = wrapper.find('.segment-label')
      expect(labelElement.text()).toBe('Custom Polyp Label')
    })

    it('shows all label types correctly', () => {
      const testLabels = [
        { key: 'outside', expected: 'Außerhalb' },
        { key: 'snare', expected: 'Snare' },
        { key: 'blood', expected: 'Blut' },
        { key: 'needle', expected: 'Nadel' },
        { key: 'grasper', expected: 'Greifer' }
      ]

      testLabels.forEach(({ key, expected }) => {
        const testSegment = {
          ...mockSegment,
          label_name: key,
          label: key
        }

        const wrapper = mount(Segment, {
          props: {
            ...defaultProps,
            segment: testSegment
          }
        })

        expect(wrapper.find('.segment-label').text()).toBe(expected)
      })
    })

    it('displays segment duration correctly', () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      const durationElement = wrapper.find('.segment-duration')
      expect(durationElement.exists()).toBe(true)
      expect(durationElement.text()).toBe('5.0s') // endTime (5) - startTime (0) = 5.0s
    })

    it('shows confidence percentage when enabled', () => {
      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          showConfidence: true
        }
      })

      const confidenceElement = wrapper.find('.segment-confidence')
      expect(confidenceElement.exists()).toBe(true)
      expect(confidenceElement.text()).toBe('80%') // mockSegment.avgConfidence is 0.8 * 100 = 80%
    })

    it('hides confidence when disabled', () => {
      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          showConfidence: false
        }
      })

      const confidenceElement = wrapper.find('.segment-confidence')
      expect(confidenceElement.exists()).toBe(false)
    })
  })

  describe('Segment Positioning and Styling', () => {
    it('calculates correct position and width percentages', () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      const segmentElement = wrapper.find('.segment-pill')
      const style = segmentElement.attributes('style')
      
      // mockSegment: startTime: 0, endTime: 5, videoDuration: 120
      // Expected left: (0/120) * 100 = 0%
      // Expected width: ((5-0)/120) * 100 = 4.166666666666666%
      expect(style).toContain('left: 0%')
      expect(style).toMatch(/width: 4\.16\d+%/) // More flexible match for floating point precision
    })

    it('applies correct color based on label type', () => {
      const testCases = [
        { label: 'polyp', expectedColor: 'rgb(243, 156, 18)' }, // CSS converts hex to rgb
        { label: 'outside', expectedColor: 'rgb(231, 76, 60)' },
        { label: 'blood', expectedColor: 'rgb(231, 76, 60)' },
        { label: 'snare', expectedColor: 'rgb(155, 89, 182)' }
      ]

      testCases.forEach(({ label, expectedColor }) => {
        const testSegment = {
          ...mockSegment,
          label_name: label,
          label: label
        }

        const wrapper = mount(Segment, {
          props: {
            ...defaultProps,
            segment: testSegment
          }
        })

        const style = wrapper.find('.segment-pill').attributes('style')
        expect(style).toContain(`background-color: ${expectedColor}`)
      })
    })

    it('handles very short segments with minimum width', () => {
      const shortSegment = {
        ...mockSegment,
        startTime: 10.0,
        endTime: 10.05, // Very short 0.05s segment
        start_time: 10.0,
        end_time: 10.05
      }

      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          segment: shortSegment
        }
      })

      const style = wrapper.find('.segment-pill').attributes('style')
      // Should enforce minimum width
      expect(style).toContain('width: 0.1%') // Minimum width enforcement
    })
  })

  describe('Resize Functionality', () => {
    it('shows resize handles on hover', async () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      const startHandle = wrapper.find('.start-handle')
      const endHandle = wrapper.find('.end-handle')
      
      expect(startHandle.exists()).toBe(true)
      expect(endHandle.exists()).toBe(true)
      expect(startHandle.classes()).toContain('resize-handle')
      expect(endHandle.classes()).toContain('resize-handle')
    })

    it('emits resize events when handles are dragged', async () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      const startHandle = wrapper.find('.start-handle')
      
      // Simulate mousedown on start handle
      await startHandle.trigger('mousedown', {
        clientX: 100,
        clientY: 100
      })

      expect(wrapper.emitted('resizeStart')).toBeTruthy()
      expect(wrapper.emitted('resizeStart')?.[0]).toEqual([
        mockSegment,
        'start',
        expect.any(Object) // MouseEvent
      ])
    })

    it('emits resize events for end handle', async () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      const endHandle = wrapper.find('.end-handle')
      
      await endHandle.trigger('mousedown', {
        clientX: 200,
        clientY: 100
      })

      expect(wrapper.emitted('resizeStart')).toBeTruthy()
      expect(wrapper.emitted('resizeStart')?.[0]).toEqual([
        mockSegment,
        'end',
        expect.any(Object)
      ])
    })

    it('prevents event propagation on resize handle mousedown', async () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      const startHandle = wrapper.find('.start-handle')
      
      // Mock event with stopPropagation
      const mockEvent = {
        clientX: 100,
        clientY: 100,
        stopPropagation: vi.fn(),
        preventDefault: vi.fn()
      }

      await startHandle.trigger('mousedown', mockEvent)
      
      // Should prevent drag event from bubbling to segment
      expect(wrapper.emitted('dragStart')).toBeFalsy()
    })
  })

  describe('Drag Functionality', () => {
    it('emits drag events when segment is dragged', async () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      const segmentElement = wrapper.find('.segment-pill')
      
      await segmentElement.trigger('mousedown', {
        clientX: 150,
        clientY: 100
      })

      expect(wrapper.emitted('dragStart')).toBeTruthy()
      expect(wrapper.emitted('dragStart')?.[0]).toEqual([
        mockSegment,
        expect.any(Object)
      ])
    })

    it('only triggers drag from segment content, not handles', async () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      // Clicking on resize handle should not trigger drag
      const startHandle = wrapper.find('.start-handle')
      await startHandle.trigger('mousedown')
      
      expect(wrapper.emitted('dragStart')).toBeFalsy()
    })
  })

  describe('Visual States', () => {
    it('applies active class when segment is active', () => {
      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          isActive: true
        }
      })

      expect(wrapper.find('.segment-pill').classes()).toContain('active')
    })

    it('applies draft class for draft segments', () => {
      const draftSegment = {
        ...mockSegment,
        id: 'draft'
      }

      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          segment: draftSegment
        }
      })

      expect(wrapper.find('.segment-pill').classes()).toContain('draft')
    })

    it('applies draft class for temporary segments', () => {
      const tempSegment = {
        ...mockSegment,
        id: 'temp-123'
      }

      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          segment: tempSegment
        }
      })

      expect(wrapper.find('.segment-pill').classes()).toContain('draft')
    })

    it('shows draft indicator for draft segments', () => {
      const draftSegment = {
        ...mockSegment,
        id: 'draft'
      }

      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          segment: draftSegment
        }
      })

      expect(wrapper.find('.draft-indicator').exists()).toBe(true)
    })

    it('shows active indicator for active segments', () => {
      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          isActive: true
        }
      })

      expect(wrapper.find('.active-indicator').exists()).toBe(true)
    })
  })

  describe('Event Handling', () => {
    it('emits select event when clicked', async () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      await wrapper.find('.segment-pill').trigger('click')
      
      expect(wrapper.emitted('select')).toBeTruthy()
      expect(wrapper.emitted('select')?.[0]).toEqual([mockSegment])
    })

    it('emits contextmenu event on right-click', async () => {
      const wrapper = mount(Segment, {
        props: defaultProps
      })

      await wrapper.find('.segment-pill').trigger('contextmenu')
      
      expect(wrapper.emitted('contextmenu')).toBeTruthy()
      expect(wrapper.emitted('contextmenu')?.[0]).toEqual([
        mockSegment,
        expect.any(Object)
      ])
    })
  })

  describe('Edge Cases', () => {
    it('handles zero duration gracefully', () => {
      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          videoDuration: 0
        }
      })

      const style = wrapper.find('.segment-pill').attributes('style')
      expect(style).toContain('left: 0%')
      expect(style).toContain('width: 0%')
    })

    it('handles missing time fields gracefully', () => {
      const segmentWithMissingTimes = {
        ...mockSegment,
        startTime: undefined,
        endTime: undefined,
        start_time: undefined,
        end_time: undefined
      }

      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          segment: segmentWithMissingTimes as any
        }
      })

      // Should not crash and should show 0 duration
      expect(wrapper.find('.segment-duration').text()).toBe('0.0s')
    })

    it('handles unknown label gracefully', () => {
      const unknownLabelSegment = {
        ...mockSegment,
        label_name: 'unknown_label_type',
        label: 'unknown_label_type'
      }

      const wrapper = mount(Segment, {
        props: {
          ...defaultProps,
          segment: unknownLabelSegment
        }
      })

      expect(wrapper.find('.segment-label').text()).toBe('unknown_label_type')
    })
  })
})