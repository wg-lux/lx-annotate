import axiosInstance, { r } from '@/api/axiosInstance';
export default (await import('vue')).defineComponent({
    name: 'VideoClassification',
    data() {
        return {
            activeTab: 'nice',
            niceData: [],
            parisData: [],
            loadingNice: false,
            loadingParis: false,
            niceError: null,
            parisError: null,
            showDetailsModal: false,
            showClassificationModal: false,
            selectedVideo: null,
            classificationData: {
                nice: {},
                paris: {}
            }
        };
    },
    computed: {
        isClassificationValid() {
            if (!this.selectedVideo)
                return false;
            const currentClassification = this.classificationData[this.activeTab];
            return this.selectedVideo.polyp_segments.every(segment => {
                const segmentData = currentClassification[segment.segment_id];
                if (!segmentData)
                    return false;
                if (this.activeTab === 'nice') {
                    return segmentData.type && segmentData.confidence;
                }
                else if (this.activeTab === 'paris') {
                    return segmentData.type && segmentData.size;
                }
                return false;
            });
        }
    },
    methods: {
        setActiveTab(tab) {
            this.activeTab = tab;
            if (tab === 'nice' && this.niceData.length === 0) {
                this.loadNiceData();
            }
            else if (tab === 'paris' && this.parisData.length === 0) {
                this.loadParisData();
            }
        },
        async loadNiceData() {
            this.loadingNice = true;
            this.niceError = null;
            try {
                const response = await axiosInstance.get(r('videos/nice-classification/'));
                this.niceData = response.data || [];
                console.log('NICE data loaded:', this.niceData);
            }
            catch (error) {
                console.error('Error loading NICE data:', error);
                this.niceError = error.response?.data?.error || error.message || 'Unbekannter Fehler';
                this.niceData = [];
            }
            finally {
                this.loadingNice = false;
            }
        },
        async loadParisData() {
            this.loadingParis = true;
            this.parisError = null;
            try {
                const response = await axiosInstance.get(r('videos/paris-classification/'));
                this.parisData = response.data || [];
                console.log('PARIS data loaded:', this.parisData);
            }
            catch (error) {
                console.error('Error loading PARIS data:', error);
                this.parisError = error.response?.data?.error || error.message || 'Unbekannter Fehler';
                this.parisData = [];
            }
            finally {
                this.loadingParis = false;
            }
        },
        showNiceDetails(video) {
            this.selectedVideo = video;
            this.initializeClassificationData();
            this.showDetailsModal = true;
        },
        showParisDetails(video) {
            this.selectedVideo = video;
            this.initializeClassificationData();
            this.showDetailsModal = true;
        },
        classifyNice(video) {
            this.selectedVideo = video;
            this.initializeClassificationData();
            this.showClassificationModal = true;
        },
        classifyParis(video) {
            this.selectedVideo = video;
            this.initializeClassificationData();
            this.showClassificationModal = true;
        },
        initializeClassificationData() {
            if (!this.selectedVideo)
                return;
            // Initialize classification data for each segment
            this.selectedVideo.polyp_segments.forEach(segment => {
                if (!this.classificationData.nice[segment.segment_id]) {
                    this.$set(this.classificationData.nice, segment.segment_id, {
                        type: '',
                        confidence: '',
                        notes: ''
                    });
                }
                if (!this.classificationData.paris[segment.segment_id]) {
                    this.$set(this.classificationData.paris, segment.segment_id, {
                        type: '',
                        size: '',
                        notes: ''
                    });
                }
            });
        },
        closeDetailsModal() {
            this.showDetailsModal = false;
            this.selectedVideo = null;
        },
        closeClassificationModal() {
            this.showClassificationModal = false;
            this.selectedVideo = null;
        },
        startClassification() {
            this.showDetailsModal = false;
            this.showClassificationModal = true;
        },
        async saveClassification() {
            if (!this.isClassificationValid) {
                alert('Bitte füllen Sie alle erforderlichen Felder aus.');
                return;
            }
            try {
                const classificationType = this.activeTab;
                const videoId = this.selectedVideo.video_id;
                const segments = this.selectedVideo.polyp_segments;
                const classificationPayload = {
                    video_id: videoId,
                    classification_type: classificationType,
                    segments: segments.map(segment => ({
                        segment_id: segment.segment_id,
                        ...this.classificationData[classificationType][segment.segment_id]
                    }))
                };
                console.log('Saving classification:', classificationPayload);
                // This endpoint would need to be implemented in your backend
                await axiosInstance.post(r(`videos/${videoId}/classify/`), classificationPayload);
                alert(`${classificationType.toUpperCase()} Klassifikation erfolgreich gespeichert!`);
                this.closeClassificationModal();
                // Reload data to reflect changes
                if (classificationType === 'nice') {
                    this.loadNiceData();
                }
                else {
                    this.loadParisData();
                }
            }
            catch (error) {
                console.error('Error saving classification:', error);
                const errorMessage = error.response?.data?.error || error.message || 'Unbekannter Fehler';
                alert(`Fehler beim Speichern: ${errorMessage}`);
            }
        },
        viewSegmentInPlayer(segment) {
            // Navigate to video player with specific segment
            this.$router.push({
                name: 'VideoExaminationAnnotation',
                query: {
                    video_id: this.selectedVideo.video_id,
                    start_time: segment.start_time,
                    end_time: segment.end_time
                }
            });
        },
        formatTime(seconds) {
            if (Number.isNaN(seconds) || seconds === null || seconds === undefined)
                return '00:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    },
    mounted() {
        // Load NICE data by default
        this.loadNiceData();
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['btn-group', 'btn', 'btn-group', 'btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("btn-group") },
        role: ("group"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.setActiveTab('nice');
            } },
        type: ("button"),
        ...{ class: ("btn") },
        ...{ class: ((__VLS_ctx.activeTab === 'nice' ? 'btn-primary' : 'btn-outline-primary')) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.setActiveTab('paris');
            } },
        type: ("button"),
        ...{ class: ("btn") },
        ...{ class: ((__VLS_ctx.activeTab === 'paris' ? 'btn-primary' : 'btn-outline-primary')) },
    });
    if (__VLS_ctx.activeTab === 'nice') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header pb-0 d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadNiceData) },
            ...{ class: ("btn btn-sm btn-outline-primary") },
            disabled: ((__VLS_ctx.loadingNice)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
        });
        (__VLS_ctx.loadingNice ? 'Laden...' : 'Aktualisieren');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.loadingNice) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-center py-5") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("spinner-border") },
                role: ("status"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("visually-hidden") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mt-2") },
            });
        }
        else if (__VLS_ctx.niceError) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-danger") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mb-0") },
            });
            (__VLS_ctx.niceError);
        }
        else if (__VLS_ctx.niceData.length === 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-center py-5 text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
                ...{ style: ({}) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mt-2") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("table-responsive") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                ...{ class: ("table table-hover") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
            for (const [video] of __VLS_getVForSourceType((__VLS_ctx.niceData))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                    key: ((video.video_id)),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (video.video_id);
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (video.center_name || 'Unbekannt');
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (video.processor_name || 'Unbekannt');
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("badge bg-info") },
                });
                (video.polyp_segments.length);
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.activeTab === 'nice')))
                                return;
                            if (!(!((__VLS_ctx.loadingNice))))
                                return;
                            if (!(!((__VLS_ctx.niceError))))
                                return;
                            if (!(!((__VLS_ctx.niceData.length === 0))))
                                return;
                            __VLS_ctx.showNiceDetails(video);
                        } },
                    ...{ class: ("btn btn-sm btn-primary me-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("material-icons") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.activeTab === 'nice')))
                                return;
                            if (!(!((__VLS_ctx.loadingNice))))
                                return;
                            if (!(!((__VLS_ctx.niceError))))
                                return;
                            if (!(!((__VLS_ctx.niceData.length === 0))))
                                return;
                            __VLS_ctx.classifyNice(video);
                        } },
                    ...{ class: ("btn btn-sm btn-success") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("material-icons") },
                });
            }
        }
    }
    if (__VLS_ctx.activeTab === 'paris') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header pb-0 d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadParisData) },
            ...{ class: ("btn btn-sm btn-outline-primary") },
            disabled: ((__VLS_ctx.loadingParis)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
        });
        (__VLS_ctx.loadingParis ? 'Laden...' : 'Aktualisieren');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.loadingParis) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-center py-5") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("spinner-border") },
                role: ("status"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("visually-hidden") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mt-2") },
            });
        }
        else if (__VLS_ctx.parisError) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-danger") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mb-0") },
            });
            (__VLS_ctx.parisError);
        }
        else if (__VLS_ctx.parisData.length === 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-center py-5 text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
                ...{ style: ({}) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mt-2") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("table-responsive") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                ...{ class: ("table table-hover") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
            for (const [video] of __VLS_getVForSourceType((__VLS_ctx.parisData))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                    key: ((video.video_id)),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (video.video_id);
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (video.center_name || 'Unbekannt');
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (video.processor_name || 'Unbekannt');
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("badge bg-info") },
                });
                (video.polyp_segments.length);
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.activeTab === 'paris')))
                                return;
                            if (!(!((__VLS_ctx.loadingParis))))
                                return;
                            if (!(!((__VLS_ctx.parisError))))
                                return;
                            if (!(!((__VLS_ctx.parisData.length === 0))))
                                return;
                            __VLS_ctx.showParisDetails(video);
                        } },
                    ...{ class: ("btn btn-sm btn-primary me-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("material-icons") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.activeTab === 'paris')))
                                return;
                            if (!(!((__VLS_ctx.loadingParis))))
                                return;
                            if (!(!((__VLS_ctx.parisError))))
                                return;
                            if (!(!((__VLS_ctx.parisData.length === 0))))
                                return;
                            __VLS_ctx.classifyParis(video);
                        } },
                    ...{ class: ("btn btn-sm btn-success") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("material-icons") },
                });
            }
        }
    }
    if (__VLS_ctx.showDetailsModal) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal fade show d-block") },
            tabindex: ("-1"),
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-dialog modal-xl") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("modal-title") },
        });
        (__VLS_ctx.activeTab.toUpperCase());
        (__VLS_ctx.selectedVideo?.video_id);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeDetailsModal) },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-body") },
        });
        if (__VLS_ctx.selectedVideo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mb-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-md-6") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: ("list-unstyled") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedVideo.video_id);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedVideo.center_name || 'Unbekannt');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedVideo.processor_name || 'Unbekannt');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedVideo.frame_dir || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-md-6") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedVideo.polyp_segments.length);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-12") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            if (__VLS_ctx.selectedVideo.polyp_segments.length === 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("text-muted") },
                });
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("table-responsive") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                    ...{ class: ("table table-sm") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
                for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.selectedVideo.polyp_segments))) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                        key: ((segment.segment_id)),
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                    (segment.segment_id);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                    (segment.start_frame);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                    (segment.end_frame);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                    (__VLS_ctx.formatTime(segment.start_time));
                    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                    (__VLS_ctx.formatTime(segment.end_time));
                    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!((__VLS_ctx.showDetailsModal)))
                                    return;
                                if (!((__VLS_ctx.selectedVideo)))
                                    return;
                                if (!(!((__VLS_ctx.selectedVideo.polyp_segments.length === 0))))
                                    return;
                                __VLS_ctx.viewSegmentInPlayer(segment);
                            } },
                        ...{ class: ("btn btn-sm btn-outline-primary") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("material-icons") },
                    });
                }
            }
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-footer") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeDetailsModal) },
            type: ("button"),
            ...{ class: ("btn btn-secondary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.startClassification) },
            type: ("button"),
            ...{ class: ("btn btn-primary") },
        });
        (__VLS_ctx.activeTab.toUpperCase());
    }
    if (__VLS_ctx.showClassificationModal) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal fade show d-block") },
            tabindex: ("-1"),
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-dialog modal-lg") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("modal-title") },
        });
        (__VLS_ctx.activeTab.toUpperCase());
        (__VLS_ctx.selectedVideo?.video_id);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeClassificationModal) },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-body") },
        });
        if (__VLS_ctx.activeTab === 'nice') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("text-muted") },
            });
            for (const [segment, index] of __VLS_getVForSourceType((__VLS_ctx.selectedVideo?.polyp_segments))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: ((segment.segment_id)),
                    ...{ class: ("mb-4") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-header") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                    ...{ class: ("mb-0") },
                });
                (segment.segment_id);
                (__VLS_ctx.formatTime(segment.start_time));
                (__VLS_ctx.formatTime(segment.end_time));
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-body") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("row") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-md-6") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: ("form-label") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                    value: ((__VLS_ctx.classificationData.nice[segment.segment_id].type)),
                    ...{ class: ("form-select") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: (""),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("1"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("2"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("3"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-md-6") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: ("form-label") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                    value: ((__VLS_ctx.classificationData.nice[segment.segment_id].confidence)),
                    ...{ class: ("form-select") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: (""),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("low"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("high"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("row mt-3") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-12") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: ("form-label") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                    value: ((__VLS_ctx.classificationData.nice[segment.segment_id].notes)),
                    ...{ class: ("form-control") },
                    rows: ("2"),
                    placeholder: ("Zusätzliche Anmerkungen zur Klassifikation..."),
                });
            }
        }
        if (__VLS_ctx.activeTab === 'paris') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("text-muted") },
            });
            for (const [segment, index] of __VLS_getVForSourceType((__VLS_ctx.selectedVideo?.polyp_segments))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: ((segment.segment_id)),
                    ...{ class: ("mb-4") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-header") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                    ...{ class: ("mb-0") },
                });
                (segment.segment_id);
                (__VLS_ctx.formatTime(segment.start_time));
                (__VLS_ctx.formatTime(segment.end_time));
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-body") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("row") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-md-6") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: ("form-label") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                    value: ((__VLS_ctx.classificationData.paris[segment.segment_id].type)),
                    ...{ class: ("form-select") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: (""),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("Ip"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("Isp"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("Is"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("IIa"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("IIb"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("IIc"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: ("III"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-md-6") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: ("form-label") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                    type: ("number"),
                    ...{ class: ("form-control") },
                    min: ("1"),
                    max: ("100"),
                    placeholder: ("Größe in mm"),
                });
                (__VLS_ctx.classificationData.paris[segment.segment_id].size);
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("row mt-3") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-12") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: ("form-label") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                    value: ((__VLS_ctx.classificationData.paris[segment.segment_id].notes)),
                    ...{ class: ("form-control") },
                    rows: ("2"),
                    placeholder: ("Zusätzliche Anmerkungen zur Klassifikation..."),
                });
            }
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-footer") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeClassificationModal) },
            type: ("button"),
            ...{ class: ("btn btn-secondary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveClassification) },
            type: ("button"),
            ...{ class: ("btn btn-success") },
            disabled: ((!__VLS_ctx.isClassificationValid)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
        });
    }
    ['container-fluid', 'py-4', 'row', 'col-12', 'row', 'mb-4', 'col-12', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'btn-group', 'btn', 'btn', 'row', 'col-12', 'card', 'card-header', 'pb-0', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'btn', 'btn-sm', 'btn-outline-primary', 'material-icons', 'card-body', 'text-center', 'py-5', 'spinner-border', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'mb-0', 'text-center', 'py-5', 'text-muted', 'material-icons', 'mt-2', 'table-responsive', 'table', 'table-hover', 'badge', 'bg-info', 'btn', 'btn-sm', 'btn-primary', 'me-2', 'material-icons', 'btn', 'btn-sm', 'btn-success', 'material-icons', 'row', 'col-12', 'card', 'card-header', 'pb-0', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'btn', 'btn-sm', 'btn-outline-primary', 'material-icons', 'card-body', 'text-center', 'py-5', 'spinner-border', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'mb-0', 'text-center', 'py-5', 'text-muted', 'material-icons', 'mt-2', 'table-responsive', 'table', 'table-hover', 'badge', 'bg-info', 'btn', 'btn-sm', 'btn-primary', 'me-2', 'material-icons', 'btn', 'btn-sm', 'btn-success', 'material-icons', 'modal', 'fade', 'show', 'd-block', 'modal-dialog', 'modal-xl', 'modal-content', 'modal-header', 'modal-title', 'btn-close', 'modal-body', 'row', 'mb-4', 'col-md-6', 'list-unstyled', 'col-md-6', 'row', 'col-12', 'text-muted', 'table-responsive', 'table', 'table-sm', 'btn', 'btn-sm', 'btn-outline-primary', 'material-icons', 'modal-footer', 'btn', 'btn-secondary', 'btn', 'btn-primary', 'modal', 'fade', 'show', 'd-block', 'modal-dialog', 'modal-lg', 'modal-content', 'modal-header', 'modal-title', 'btn-close', 'modal-body', 'text-muted', 'mb-4', 'card', 'card-header', 'mb-0', 'card-body', 'row', 'col-md-6', 'form-label', 'form-select', 'col-md-6', 'form-label', 'form-select', 'row', 'mt-3', 'col-12', 'form-label', 'form-control', 'text-muted', 'mb-4', 'card', 'card-header', 'mb-0', 'card-body', 'row', 'col-md-6', 'form-label', 'form-select', 'col-md-6', 'form-label', 'form-control', 'row', 'mt-3', 'col-12', 'form-label', 'form-control', 'modal-footer', 'btn', 'btn-secondary', 'btn', 'btn-success', 'material-icons',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {};
    var $refs;
    var $el;
    return {
        attrs: {},
        slots: __VLS_slots,
        refs: $refs,
        rootEl: $el,
    };
}
;
let __VLS_self;
