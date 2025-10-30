import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
/* ------------------------------------------------------------------ */
/* Store Definition                                                   */
/* ------------------------------------------------------------------ */
export const useMediaTypeStore = defineStore('mediaType', () => {
    /* ---------------------------------------------------------------- */
    /* State                                                            */
    /* ---------------------------------------------------------------- */
    const currentItem = ref(null);
    /* ---------------------------------------------------------------- */
    /* Media Type Configuration                                         */
    /* ---------------------------------------------------------------- */
    const mediaTypeConfigs = {
        pdf: {
            icon: 'fas fa-file-pdf text-danger',
            badgeClass: 'bg-danger',
            displayName: 'PDF',
            supportedExtensions: ['.pdf']
        },
        video: {
            icon: 'fas fa-video text-primary',
            badgeClass: 'bg-primary',
            displayName: 'Video',
            supportedExtensions: ['.mp4', '.avi', '.mov', '.mkv', '.webm']
        },
        unknown: {
            icon: 'fas fa-question-circle text-muted',
            badgeClass: 'bg-secondary',
            displayName: 'Unbekannt',
            supportedExtensions: []
        }
    };
    /* ---------------------------------------------------------------- */
    /* Computed Properties                                              */
    /* ---------------------------------------------------------------- */
    /**
     * Determines the media type of the current item based on available properties
     */
    const currentMediaType = computed(() => {
        if (!currentItem.value)
            return 'unknown';
        return detectMediaType(currentItem.value);
    });
    /**
     * Whether current item is a PDF
     */
    const isPdf = computed(() => currentMediaType.value === 'pdf');
    /**
     * Whether current item is a video
     */
    const isVideo = computed(() => currentMediaType.value === 'video');
    /**
     * Whether current item has unknown media type
     */
    const isUnknown = computed(() => currentMediaType.value === 'unknown');
    /**
     * Get the appropriate source URL for the current media type
     */
    const currentMediaUrl = computed(() => {
        if (!currentItem.value)
            return undefined;
        if (isPdf.value) {
            return getPdfUrl(currentItem.value);
        }
        if (isVideo.value) {
            return getVideoUrl(currentItem.value);
        }
        return undefined;
    });
    /**
     * Get the configuration for the current media type
     */
    const currentMediaConfig = computed(() => {
        return mediaTypeConfigs[currentMediaType.value];
    });
    /* ---------------------------------------------------------------- */
    /* Methods                                                          */
    /* ---------------------------------------------------------------- */
    /**
     * Detect media type from item properties with correct priority order
     */
    function detectMediaType(item) {
        // 1. Explicit mediaType property check
        if (item.mediaType && item.mediaType !== 'unknown') {
            return item.mediaType;
        }
        // 2. Video indicators first (to fix the priority issue)
        if (item.videoUrl || (item.reportMeta?.file && !item.reportMeta?.pdfUrl)) {
            return 'video';
        }
        // 3. PDF indicators second
        if (item.pdfStreamUrl || item.pdfUrl || item.reportMeta?.pdfUrl) {
            return 'pdf';
        }
        // 4. Fallback by filename extension
        if (item.filename) {
            const extension = item.filename.toLowerCase().split('.').pop();
            if (extension) {
                // Check video extensions first
                if (mediaTypeConfigs.video.supportedExtensions.some((ext) => ext.includes(extension))) {
                    return 'video';
                }
                // Then check PDF extensions
                if (mediaTypeConfigs.pdf.supportedExtensions.some((ext) => ext.includes(extension))) {
                    return 'pdf';
                }
            }
        }
        return 'unknown';
    }
    /**
     * Get PDF URL with fallback priority
     */
    function getPdfUrl(item) {
        return item.pdfStreamUrl || item.pdfUrl || item.reportMeta?.pdfUrl;
    }
    /**
     * Get video URL with fallback priority
     */
    function getVideoUrl(item) {
        return item.videoUrl || item.reportMeta?.file;
    }
    /**
     * Set the current media item
     */
    function setCurrentItem(item) {
        currentItem.value = item;
    }
    /**
     * Update the current item's properties
     */
    function updateCurrentItem(updates) {
        if (currentItem.value) {
            currentItem.value = { ...currentItem.value, ...updates };
        }
    }
    /**
     * Clear the current item
     */
    function clearCurrentItem() {
        currentItem.value = null;
    }
    /**
     * Get media type configuration by type
     */
    function getMediaTypeConfig(mediaType) {
        return mediaTypeConfigs[mediaType];
    }
    /**
     * Check if file extension is supported by any media type
     */
    function isSupportedExtension(filename) {
        const extension = `.${filename.toLowerCase().split('.').pop()}`;
        return Object.values(mediaTypeConfigs).some((config) => config.supportedExtensions.includes(extension));
    }
    // Legacy functions for compatibility (these should be removed in future)
    function getMediaTypeIcon(mediaType) {
        return mediaTypeConfigs[mediaType]?.icon || mediaTypeConfigs.unknown.icon;
    }
    function getMediaTypeBadgeClass(mediaType) {
        return mediaTypeConfigs[mediaType]?.badgeClass || mediaTypeConfigs.unknown.badgeClass;
    }
    /* ---------------------------------------------------------------- */
    /* Return Store Interface                                           */
    /* ---------------------------------------------------------------- */
    return {
        // State
        currentItem,
        // Computed
        currentMediaType,
        isPdf,
        isVideo,
        isUnknown,
        currentMediaUrl,
        currentMediaConfig,
        // Methods
        detectMediaType,
        getPdfUrl,
        getVideoUrl,
        setCurrentItem,
        updateCurrentItem,
        clearCurrentItem,
        getMediaTypeConfig,
        isSupportedExtension,
        // Legacy compatibility methods
        getMediaTypeIcon,
        getMediaTypeBadgeClass
    };
});
/* ------------------------------------------------------------------ */
/* Standalone Utility Functions                                      */
/* ------------------------------------------------------------------ */
/**
 * Standalone function to detect media type without store
 */
export function detectMediaTypeStandalone(item) {
    // Check for explicit mediaType property first
    if (item.mediaType && item.mediaType !== 'unknown') {
        return item.mediaType;
    }
    // Check for video indicators first (corrected priority)
    if (item.videoUrl || (item.reportMeta?.file && !item.reportMeta?.pdfUrl)) {
        return 'video';
    }
    // Check for PDF indicators second
    if (item.pdfStreamUrl || item.pdfUrl || item.reportMeta?.pdfUrl) {
        return 'pdf';
    }
    return 'unknown';
}
/**
 * Standalone function to get appropriate CSS classes
 */
export function getMediaTypeClasses(mediaType) {
    const configs = {
        pdf: { icon: 'fas fa-file-pdf text-danger', badge: 'bg-danger' },
        video: { icon: 'fas fa-video text-primary', badge: 'bg-primary' },
        unknown: { icon: 'fas fa-question-circle text-muted', badge: 'bg-secondary' }
    };
    return configs[mediaType];
}
