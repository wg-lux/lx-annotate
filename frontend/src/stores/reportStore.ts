import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Report, Annotation } from '@/types/reports';
import { reportApi } from '@/services';
import { useErrorHandler } from '@/composables/useErrorHandler';

export const useReportStore = defineStore('report', () => {
  // State
  const reports = ref<Report[]>([]);
  const currentReport = ref<Report | null>(null);
  const annotations = ref<Annotation[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Error handler
  const { handleError } = useErrorHandler();

  // Computed
  const hasReports = computed(() => reports.value.length > 0);
  const currentReportFileType = computed(() => {
    if (!currentReport.value?.secureFileUrl?.originalFilename) return 'unknown';
    return reportApi.getFileTypeFromFilename(currentReport.value.secureFileUrl.originalFilename);
  });

  // Actions
  const fetchReports = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await reportApi.getReports();
      reports.value = response.results;
    } catch (err) {
      error.value = handleError(err, 'fetchReports').message;
    } finally {
      loading.value = false;
    }
  };

  const fetchReportById = async (id: number, withSecureUrl = true) => {
    try {
      loading.value = true;
      error.value = null;
      
      const report = withSecureUrl 
        ? await reportApi.getReportWithSecureUrl(id)
        : await reportApi.getReport(id);
      
      currentReport.value = report;
      return report;
    } catch (err) {
      error.value = handleError(err, 'fetchReportById').message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchReportAnnotations = async (reportId: number) => {
    try {
      loading.value = true;
      const reportAnnotations = await reportApi.getReportAnnotations(reportId);
      annotations.value = reportAnnotations;
      return reportAnnotations;
    } catch (err) {
      error.value = handleError(err, 'fetchReportAnnotations').message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createAnnotation = async (annotationData: any) => {
    try {
      const newAnnotation = await reportApi.createAnnotation(annotationData);
      annotations.value.push(newAnnotation);
      return newAnnotation;
    } catch (err) {
      error.value = handleError(err, 'createAnnotation').message;
      throw err;
    }
  };

  const setCurrentReport = (report: Report | null) => {
    currentReport.value = report;
    if (!report) {
      annotations.value = [];
    }
  };

  const clearError = () => {
    error.value = null;
  };

  const reset = () => {
    reports.value = [];
    currentReport.value = null;
    annotations.value = [];
    loading.value = false;
    error.value = null;
  };

  return {
    // State
    reports,
    currentReport,
    annotations,
    loading,
    error,
    
    // Computed
    hasReports,
    currentReportFileType,
    
    // Actions
    fetchReports,
    fetchReportById,
    fetchReportAnnotations,
    createAnnotation,
    setCurrentReport,
    clearError,
    reset
  };
});