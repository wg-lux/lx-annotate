import axiosInstance, { r } from '@/api/axiosInstance';
const MODEL_TRAINING_OPTIONS_PATH = 'settings/application/model_training/options/';
const MODEL_TRAINING_RUNS_PATH = 'settings/application/model_training/runs/';
export async function fetchModelTrainingOptions() {
    const { data } = await axiosInstance.get(r(MODEL_TRAINING_OPTIONS_PATH));
    return data;
}
export async function createModelTrainingRun(payload) {
    const { data } = await axiosInstance.post(r(MODEL_TRAINING_RUNS_PATH), payload);
    return data;
}
export async function fetchModelTrainingRuns() {
    const { data } = await axiosInstance.get(r(MODEL_TRAINING_RUNS_PATH));
    return data;
}
export async function fetchModelTrainingRun(runId) {
    const { data } = await axiosInstance.get(r(`${MODEL_TRAINING_RUNS_PATH}${runId}/`));
    return data;
}
