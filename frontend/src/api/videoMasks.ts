import axiosInstance, { r, silentRequestConfig } from '@/api/axiosInstance'

export interface VideoMaskProfile {
  name: string
  label: string
  deviceName: string
  mask: {
    x: number
    y: number
    width: number
    height: number
    imageWidth: number
    imageHeight: number
  }
}

export async function fetchVideoMasks(): Promise<VideoMaskProfile[]> {
  const { data } = await axiosInstance.get<{ masks: VideoMaskProfile[] }>(
    r('media/videos/masks/'), silentRequestConfig({ timeout: 15000 })
  )
  return data.masks
}

export async function createVideoMask(profile: VideoMaskProfile): Promise<VideoMaskProfile> {
  const { data } = await axiosInstance.post<VideoMaskProfile>(
    r('media/videos/masks/'), profile, silentRequestConfig({ timeout: 15000 })
  )
  return data
}
