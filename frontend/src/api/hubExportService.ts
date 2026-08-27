import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import type {
  HubEligibleVideoOffloadResult,
  HubExportOverviewResponse,
  HubExportRetryResult,
  VideoExportReadinessCandidate
} from '@/stores/hubExportStore'

export interface HubExportResourceRef {
  id: number
  resourceKind: 'video' | 'report'
}

export const hubExportService = {
  async fetchOverview(targetNodeKey?: string | null): Promise<HubExportOverviewResponse> {
    const params = targetNodeKey ? { target_node_key: targetNodeKey } : undefined
    const { data } = await axiosInstance.get<HubExportOverviewResponse>(
      r(endpoints.hubExport.overview),
      { params }
    )
    return data
  },

  async markResources(targetNodeKey: string, resources: HubExportResourceRef[]): Promise<void> {
    await axiosInstance.post(r(endpoints.hubExport.mark), { targetNodeKey, resources })
  },

  async unmarkResources(targetNodeKey: string, resources: HubExportResourceRef[]): Promise<void> {
    await axiosInstance.post(r(endpoints.hubExport.unmark), { targetNodeKey, resources })
  },

  async offloadEligibleVideos(targetNodeKey: string): Promise<HubEligibleVideoOffloadResult> {
    const { data } = await axiosInstance.post<HubEligibleVideoOffloadResult>(
      r(endpoints.hubExport.offloadEligibleVideos),
      { targetNodeKey }
    )
    return data
  },

  async retryFailedJob(outboundJobId: string): Promise<HubExportRetryResult> {
    const { data } = await axiosInstance.post<HubExportRetryResult>(
      r(endpoints.hubExport.retry(outboundJobId))
    )
    return data
  },

  async checkVideoReadiness(video: VideoExportReadinessCandidate): Promise<void> {
    await axiosInstance.post(r(endpoints.media.videoMarkReadyForExport(video.id)), {
      centerKey: video.centerKey
    })
  }
}
