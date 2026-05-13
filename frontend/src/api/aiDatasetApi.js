import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
const AI_DATASETS_DROPDOWN_PATH = 'settings/application/dropdowns/ai_datasets/';
const frameBucketDistributionPath = (datasetId) => `settings/application/ai_datasets/${datasetId}/frame_bucket_distribution/`;
const trainingManifestPath = (datasetId) => `settings/application/ai_datasets/${datasetId}/training_manifest/`;
export async function fetchAiDatasetOptions() {
    const { data } = await axiosInstance.get(r(AI_DATASETS_DROPDOWN_PATH));
    return data;
}
export async function createAiDataset(payload) {
    const { data } = await axiosInstance.post(r(AI_DATASETS_DROPDOWN_PATH), payload);
    return data;
}
export async function fetchAiDatasetLabelSets() {
    const { data } = await axiosInstance.get(r(endpoints.media.videoLabelSetsList));
    return data;
}
export async function fetchAiDatasetFrameBucketDistribution(datasetId, params = {}) {
    const { data } = await axiosInstance.get(r(frameBucketDistributionPath(datasetId)), {
        params: {
            label_group_id: params.labelGroupId || undefined,
            target_label_id: params.targetLabelId || undefined,
            prediction_segments_only: params.predictionSegmentsOnly === undefined
                ? undefined
                : String(params.predictionSegmentsOnly)
        }
    });
    return data;
}
export async function buildAiDatasetTrainingManifest(datasetId, config) {
    const { data } = await axiosInstance.post(r(trainingManifestPath(datasetId)), config);
    return data;
}
