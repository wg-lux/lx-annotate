// Export all services
export * from './api';
export * from './domain';

// Re-export service instances for convenience
export { apiService } from './api';
export { videoService, labelSegmentService, reportService } from './domain';

// Create convenient API aliases
export { videoService as videoApi } from './domain';
export { labelSegmentService as labelApi } from './domain';
export { reportService as reportApi } from './domain';