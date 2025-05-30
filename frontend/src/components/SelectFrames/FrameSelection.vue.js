import axiosInstance, { r } from '@/api/axiosInstance';
export default (await import('vue')).defineComponent({
    name: 'FrameSelection',
    data() {
        return {
            videos: [],
            selectedVideoId: null,
            currentTime: 0,
            duration: 0,
            extractedFrames: [],
            frameCounter: 0
        };
    },
    computed: {
        currentVideoUrl() {
            const video = this.videos.find(v => v.id === this.selectedVideoId);
            if (!video)
                return '';
            return video.url || video.video_file || video.file_url ||
                (video.original_file_name ? `/media/videos/${video.original_file_name}` : '');
        },
        canCaptureFrame() {
            return this.selectedVideoId !== null && this.currentVideoUrl !== '' && this.duration > 0;
        },
        selectedFrames() {
            return this.extractedFrames.filter(frame => frame.selected);
        },
        allFramesSelected() {
            return this.extractedFrames.length > 0 && this.extractedFrames.every(frame => frame.selected);
        },
        anyFrameSelected() {
            return this.extractedFrames.some(frame => frame.selected);
        },
        someFramesSelected() {
            return this.anyFrameSelected && !this.allFramesSelected;
        }
    },
    methods: {
        async loadVideos() {
            try {
                const response = await axiosInstance.get(r('videos/'));
                this.videos = response.data.map(v => ({
                    ...v,
                    id: Number(v.id)
                }));
            }
            catch (error) {
                console.error('Error loading videos:', error);
                this.videos = [];
            }
        },
        onVideoChange() {
            this.extractedFrames = [];
            this.frameCounter = 0;
        },
        onVideoLoaded() {
            if (this.$refs.videoRef) {
                this.duration = this.$refs.videoRef.duration;
            }
        },
        handleTimeUpdate() {
            if (this.$refs.videoRef) {
                this.currentTime = this.$refs.videoRef.currentTime;
            }
        },
        captureCurrentFrame() {
            if (!this.canCaptureFrame)
                return;
            const canvas = document.createElement('canvas');
            const video = this.$refs.videoRef;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Convert to data URL
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            const frame = {
                id: `frame-${Date.now()}-${this.frameCounter++}`,
                frameNumber: this.frameCounter,
                timestamp: this.currentTime,
                thumbnailUrl: thumbnailUrl,
                videoId: this.selectedVideoId,
                selected: false,
                predictions: this.generateMockPredictions(), // In real app, this would come from ML model
                notes: `Frame erfasst bei ${this.formatTime(this.currentTime)}`
            };
            this.extractedFrames.push(frame);
        },
        generateFrames() {
            if (!this.canCaptureFrame)
                return;
            const video = this.$refs.videoRef;
            const interval = Math.max(1, Math.floor(this.duration / 10)); // Generate 10 frames max
            for (let i = 0; i < this.duration; i += interval) {
                video.currentTime = i;
                // Use setTimeout to allow video to seek
                setTimeout(() => {
                    this.captureFrameAtTime(i);
                }, i * 100);
            }
        },
        captureFrameAtTime(timestamp) {
            const canvas = document.createElement('canvas');
            const video = this.$refs.videoRef;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            const frame = {
                id: `frame-${Date.now()}-${this.frameCounter++}`,
                frameNumber: this.frameCounter,
                timestamp: timestamp,
                thumbnailUrl: thumbnailUrl,
                videoId: this.selectedVideoId,
                selected: false,
                predictions: this.generateMockPredictions(),
                notes: `Automatisch generiert bei ${this.formatTime(timestamp)}`
            };
            this.extractedFrames.push(frame);
        },
        generateMockPredictions() {
            const labels = ['Schlechte Bildqualität', 'Greifer', 'NBI', 'Ileum', 'Polyp', 'Normal'];
            const count = Math.floor(Math.random() * 3) + 1;
            const predictions = [];
            for (let i = 0; i < count; i++) {
                predictions.push({
                    label: labels[Math.floor(Math.random() * labels.length)],
                    confidence: Math.random()
                });
            }
            return predictions;
        },
        toggleFrameSelection(frame) {
            frame.selected = !frame.selected;
            this.updateSelectedFrames();
        },
        updateSelectedFrames() {
            // This method can be used to sync with parent components or APIs
        },
        selectAllFrames() {
            this.extractedFrames.forEach(frame => frame.selected = true);
        },
        deselectAllFrames() {
            this.extractedFrames.forEach(frame => frame.selected = false);
        },
        toggleAllFrames() {
            const shouldSelect = !this.allFramesSelected;
            this.extractedFrames.forEach(frame => frame.selected = shouldSelect);
        },
        removeFrame(frameId) {
            this.extractedFrames = this.extractedFrames.filter(frame => frame.id !== frameId);
        },
        getConfidenceClass(confidence) {
            if (confidence > 0.7)
                return 'bg-success';
            if (confidence > 0.4)
                return 'bg-warning text-dark';
            return 'bg-danger';
        },
        proceedToAnnotation() {
            if (this.selectedFrames.length === 0)
                return;
            // Navigate to frame annotation with selected frames
            this.$router.push({
                name: 'FrameAnnotation',
                params: {
                    videoId: this.selectedVideoId
                },
                query: {
                    frames: this.selectedFrames.map(f => f.id).join(',')
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
        this.loadVideos();
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['frame-thumbnail',];
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
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.onVideoChange) },
        value: ((__VLS_ctx.selectedVideoId)),
        ...{ class: ("form-select") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ((null)),
    });
    for (const [video] of __VLS_getVForSourceType((__VLS_ctx.videos))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((video.id)),
            value: ((video.id)),
        });
        (video.center_name || 'Unbekannt');
        (video.processor_name || 'Unbekannt');
    }
    if (__VLS_ctx.currentVideoUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("video-container mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
            ...{ onLoadedmetadata: (__VLS_ctx.onVideoLoaded) },
            ref: ("videoRef"),
            src: ((__VLS_ctx.currentVideoUrl)),
            controls: (true),
            ...{ class: ("w-100") },
            ...{ style: ({}) },
        });
        // @ts-ignore navigation for `const videoRef = ref()`
        /** @type { typeof __VLS_ctx.videoRef } */ ;
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.captureCurrentFrame) },
            ...{ class: ("btn btn-primary me-2") },
            disabled: ((!__VLS_ctx.canCaptureFrame)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.generateFrames) },
            ...{ class: ("btn btn-outline-primary me-2") },
            disabled: ((__VLS_ctx.duration === 0)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
        (__VLS_ctx.formatTime(__VLS_ctx.duration));
    }
    if (__VLS_ctx.extractedFrames.length > 0) {
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
        (__VLS_ctx.extractedFrames.length);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.selectAllFrames) },
            ...{ class: ("btn btn-sm btn-outline-primary me-2") },
            disabled: ((__VLS_ctx.allFramesSelected)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.deselectAllFrames) },
            ...{ class: ("btn btn-sm btn-outline-secondary me-2") },
            disabled: ((!__VLS_ctx.anyFrameSelected)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.proceedToAnnotation) },
            ...{ class: ("btn btn-sm btn-success") },
            disabled: ((__VLS_ctx.selectedFrames.length === 0)),
        });
        (__VLS_ctx.selectedFrames.length);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("table-responsive") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: ("table table-striped table-hover") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            width: ("50"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.toggleAllFrames) },
            type: ("checkbox"),
            checked: ((__VLS_ctx.allFramesSelected)),
            indeterminate: ((__VLS_ctx.someFramesSelected)),
            ...{ class: ("form-check-input") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            width: ("200"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            width: ("120"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [frame] of __VLS_getVForSourceType((__VLS_ctx.extractedFrames))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: ((frame.id)),
                ...{ class: (({ 'table-primary': frame.selected })) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                ...{ onChange: (__VLS_ctx.updateSelectedFrames) },
                type: ("checkbox"),
                ...{ class: ("form-check-input") },
            });
            (frame.selected);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.extractedFrames.length > 0)))
                            return;
                        __VLS_ctx.toggleFrameSelection(frame);
                    } },
                src: ((frame.thumbnailUrl)),
                ...{ class: ("img-fluid frame-thumbnail") },
                alt: ((`Frame ${frame.id}`)),
                ...{ style: ({}) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("mb-1") },
            });
            (frame.frameNumber);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-muted mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (__VLS_ctx.formatTime(frame.timestamp));
            if (frame.predictions && frame.predictions.length > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                for (const [prediction] of __VLS_getVForSourceType((frame.predictions))) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        key: ((prediction.label)),
                        ...{ class: ("mb-1") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge me-2") },
                        ...{ class: ((__VLS_ctx.getConfidenceClass(prediction.confidence))) },
                    });
                    (prediction.label);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                        ...{ class: ("text-muted") },
                    });
                    ((prediction.confidence * 100).toFixed(1));
                }
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("text-muted") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            }
            if (frame.notes) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("mt-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-secondary") },
                });
                (frame.notes);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.extractedFrames.length > 0)))
                            return;
                        __VLS_ctx.toggleFrameSelection(frame);
                    } },
                ...{ class: ("btn btn-sm me-1") },
                ...{ class: ((frame.selected ? 'btn-success' : 'btn-outline-primary')) },
            });
            (frame.selected ? 'Ausgewählt' : 'Auswählen');
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.extractedFrames.length > 0)))
                            return;
                        __VLS_ctx.removeFrame(frame.id);
                    } },
                ...{ class: ("btn btn-sm btn-outline-danger") },
            });
        }
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center text-muted py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    }
    ['container-fluid', 'py-4', 'row', 'col-12', 'row', 'mb-4', 'col-12', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'mb-3', 'form-label', 'form-select', 'video-container', 'mb-3', 'w-100', 'mt-2', 'btn', 'btn-primary', 'me-2', 'btn', 'btn-outline-primary', 'me-2', 'text-muted', 'row', 'col-12', 'card', 'card-header', 'pb-0', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'btn', 'btn-sm', 'btn-outline-primary', 'me-2', 'btn', 'btn-sm', 'btn-outline-secondary', 'me-2', 'btn', 'btn-sm', 'btn-success', 'card-body', 'table-responsive', 'table', 'table-striped', 'table-hover', 'form-check-input', 'table-primary', 'form-check-input', 'img-fluid', 'frame-thumbnail', 'mb-1', 'text-muted', 'mb-2', 'mb-1', 'badge', 'me-2', 'text-muted', 'text-muted', 'mt-2', 'text-secondary', 'btn', 'btn-sm', 'me-1', 'btn', 'btn-sm', 'btn-outline-danger', 'row', 'col-12', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'videoRef': __VLS_nativeElements['video'],
    };
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
