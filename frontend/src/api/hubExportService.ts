import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import type {
  HubEligibleVideoOffloadResult,
  HubRecoveryAssessment,
  HubCleanupInspection,
  HubExportOverviewResponse,
  HubExportRetryResult,
  VideoExportReadinessCandidate
} from '@/stores/hubExportStore'

export interface HubExportResourceRef {
  id: number
  resourceKind: 'video' | 'report'
}

export const hubExportService = {
  async preflightVideo(id: number): Promise<HubRecoveryAssessment> {
    const { data } = await axiosInstance.post<HubRecoveryAssessment>(r(endpoints.hubExport.preflight(id)))
    return data
  },
  async inspectRecovery(id: number): Promise<HubCleanupInspection> {
    const { data } = await axiosInstance.post<HubCleanupInspection>(r(endpoints.hubExport.inspectRecovery(id)))
    return data
  },
  async fetchOverview(targetNodeKey?: string | null): Promise<HubExportOverviewResponse> {
    const params = targetNodeKey ? { target_node_key: targetNodeKey } : undefined
    const { data } = await axiosInstance.get<HubExportOverviewResponse>(
      r(endpoints.hubExport.overview),
      { params }
    )
    return data
  },

  async markResources(targetNodeKey: string, resources: HubExportResourceRef[], retainLocalProcessedMedia?: boolean): Promise<void> {
    await axiosInstance.post(r(endpoints.hubExport.mark), { targetNodeKey, resources, retainLocalProcessedMedia })
  },

  async unmarkResources(targetNodeKey: string, resources: HubExportResourceRef[]): Promise<void> {
    await axiosInstance.post(r(endpoints.hubExport.unmark), { targetNodeKey, resources })
  },

  async offloadEligibleVideos(targetNodeKey: string, retainLocalProcessedMedia?: boolean): Promise<HubEligibleVideoOffloadResult> {
    const { data } = await axiosInstance.post<HubEligibleVideoOffloadResult>(
      r(endpoints.hubExport.offloadEligibleVideos),
      { targetNodeKey, retainLocalProcessedMedia }
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
