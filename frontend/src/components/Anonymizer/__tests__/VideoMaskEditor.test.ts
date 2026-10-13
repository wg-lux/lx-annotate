import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VideoMaskEditor from '../VideoMaskEditor.vue'

const pause = vi.fn()
const context = { clearRect: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn() }

function video(): HTMLVideoElement {
  const element = document.createElement('video')
  Object.defineProperties(element, {
    readyState: { value: 2 }, videoWidth: { value: 1920 }, videoHeight: { value: 1080 }
  })
  element.pause = pause
  return element
}

function pointer(target: Element, type: string, x: number, y: number) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  target.dispatchEvent(event)
}

describe('video mask drawing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    HTMLCanvasElement.prototype.setPointerCapture = vi.fn()
    HTMLCanvasElement.prototype.releasePointerCapture = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 10, top: 20, width: 960, height: 540, right: 970, bottom: 560, x: 10, y: 20, toJSON: () => ({})
    })
  })
  it('freezes one frame and maps a reversed drag to source pixel coordinates', async () => {
    const source = video()
    const wrapper = mount(VideoMaskEditor, { props: { video: source, sourceKey: '7:raw' } })
    await wrapper.get('button').trigger('click')
    expect(pause).toHaveBeenCalledOnce()
    const canvas = wrapper.get('canvas').element
    pointer(canvas, 'pointerdown', 810, 420)
    pointer(canvas, 'pointermove', 110, 70)
    pointer(canvas, 'pointerup', 110, 70)
    expect(wrapper.emitted('selected')).toEqual([[{
      x: 200, y: 100, width: 1400, height: 700, imageWidth: 1920, imageHeight: 1080
    }]])
    await wrapper.setProps({ sourceKey: '8:raw' })
    expect(wrapper.get('canvas').isVisible()).toBe(false)
    wrapper.unmount()
  })
  it('rejects missing frames, tiny selections, and cancelled drags', async () => {
    const wrapper = mount(VideoMaskEditor, { props: { video: null, sourceKey: '7:raw' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toContain('Originalvideos')
    await wrapper.setProps({ video: video() })
    await wrapper.get('button').trigger('click')
    const canvas = wrapper.get('canvas').element
    pointer(canvas, 'pointerdown', 20, 30)
    pointer(canvas, 'pointerup', 20, 30)
    pointer(canvas, 'pointerdown', 20, 30)
    pointer(canvas, 'pointercancel', 100, 100)
    pointer(canvas, 'pointerup', 100, 100)
    expect(wrapper.emitted('selected')).toBeUndefined()
    wrapper.unmount()
  })
  it('clamps a drag to the image bounds', async () => {
    const wrapper = mount(VideoMaskEditor, { props: { video: video(), sourceKey: '7:raw' } })
    await wrapper.get('button').trigger('click')
    const canvas = wrapper.get('canvas').element
    pointer(canvas, 'pointerdown', 110, 70)
    pointer(canvas, 'pointerup', 2000, 1000)
    expect(wrapper.emitted('selected')).toEqual([[{
      x: 200, y: 100, width: 1720, height: 980, imageWidth: 1920, imageHeight: 1080
    }]])
    wrapper.unmount()
  })
})
