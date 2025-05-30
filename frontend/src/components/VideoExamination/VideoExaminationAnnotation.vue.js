import { useVideoStore } from '@/stores/videoStore';
import SimpleExaminationForm from './SimpleExaminationForm.vue';
import axiosInstance, { r } from '@/api/axiosInstance';
export default (await import('vue')).defineComponent({
    name: 'VideoExaminationAnnotation',
    components: {
        SimpleExaminationForm
    },
    data() {
        return {
            videos: [],
            selectedVideoId: null, // Keep it truly null when nothing is chosen
            currentTime: 0,
            duration: 0,
            examinationMarkers: [],
            savedExaminations: [],
            currentMarker: null
        };
    },
    computed: {
        currentVideoUrl() {
            const video = this.videos.find(v => v.id === this.selectedVideoId);
            if (!video)
                return '';
            // Defensive fallback - only return URLs if they actually exist
            return video.url || video.video_file || video.file_url ||
                (video.original_file_name ? `/media/videos/${video.original_file_name}` : '');
        },
        showExaminationForm() {
            // Only show form if video is selected AND has a valid URL
            return this.selectedVideoId !== null && this.currentVideoUrl !== '';
        },
        hasVideos() {
            return this.videos && this.videos.length > 0;
        },
        noVideosMessage() {
            return this.videos.length === 0 ?
                'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.' :
                '';
        }
    },
    methods: {
        async loadVideos() {
            try {
                console.log('Loading videos from API...');
                const response = await axiosInstance.get(r('videos/'));
                console.log('Videos API response:', response.data);
                // Ensure IDs are numbers so v-model stays consistent
                this.videos = response.data.map(v => ({
                    ...v,
                    id: Number(v.id)
                }));
                // Log the structure of the first video to help debug
                if (this.videos.length > 0) {
                    console.log('First video structure:', this.videos[0]);
                }
            }
            catch (error) {
                console.error('Error loading videos:', error);
                // Set empty array as fallback
                this.videos = [];
            }
        },
        async loadSavedExaminations() {
            if (this.selectedVideoId === null)
                return;
            try {
                const response = await axiosInstance.get(r(`video/${this.selectedVideoId}/examinations/`));
                this.savedExaminations = response.data;
                // Create markers for saved examinations
                this.examinationMarkers = response.data.map((exam) => ({
                    id: `exam-${exam.id}`,
                    timestamp: exam.timestamp,
                    examination_data: exam.data
                }));
            }
            catch (error) {
                console.error('Error loading saved examinations:', error);
                // Don't crash on 404 - just set empty arrays
                this.savedExaminations = [];
                this.examinationMarkers = [];
            }
        },
        onVideoChange() {
            if (this.selectedVideoId !== null) {
                this.loadSavedExaminations();
                this.currentMarker = null;
            }
            else {
                // Clear everything when no video selected
                this.examinationMarkers = [];
                this.savedExaminations = [];
                this.currentMarker = null;
            }
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
        handleTimelineClick(event) {
            const timeline = event.currentTarget;
            if (timeline && this.$refs.videoRef && this.duration > 0) {
                const rect = timeline.getBoundingClientRect();
                const clickPosition = event.clientX - rect.left;
                const percentage = clickPosition / rect.width;
                this.$refs.videoRef.currentTime = percentage * this.duration;
            }
        },
        addExaminationMarker() {
            if (!this.$refs.videoRef)
                return;
            const timestamp = this.$refs.videoRef.currentTime;
            const markerId = `marker-${Date.now()}`;
            const newMarker = {
                id: markerId,
                timestamp: timestamp,
            };
            this.examinationMarkers.push(newMarker);
            this.currentMarker = newMarker;
        },
        jumpToExamination(exam) {
            if (this.$refs.videoRef) {
                this.$refs.videoRef.currentTime = exam.timestamp;
                this.currentMarker = this.examinationMarkers.find(m => m.timestamp === exam.timestamp) || null;
            }
        },
        async deleteExamination(examId) {
            try {
                await axiosInstance.delete(r(`examination/${examId}/`));
                await this.loadSavedExaminations();
            }
            catch (error) {
                console.error('Error deleting examination:', error);
            }
        },
        onExaminationSaved(examinationData) {
            console.log('Examination saved:', examinationData);
            this.loadSavedExaminations();
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
    const __VLS_componentsOption = {
        SimpleExaminationForm
    };
    let __VLS_components;
    let __VLS_directives;
    ['examination-marker', 'list-group-item',];
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
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-lg-8") },
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
        modelModifiers: { number: true, },
        ...{ class: ("form-select") },
        disabled: ((!__VLS_ctx.hasVideos)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ((null)),
    });
    (__VLS_ctx.hasVideos ? 'Bitte Video auswählen...' : 'Keine Videos verfügbar');
    for (const [video] of __VLS_getVForSourceType((__VLS_ctx.videos))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((video.id)),
            value: ((video.id)),
        });
        (video.center_name || 'Unbekannt');
        (video.processor_name || 'Unbekannt');
    }
    if (!__VLS_ctx.hasVideos) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.noVideosMessage);
    }
    if (!__VLS_ctx.currentVideoUrl && __VLS_ctx.hasVideos) {
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
    }
    if (!__VLS_ctx.hasVideos) {
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
        (__VLS_ctx.noVideosMessage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    }
    if (__VLS_ctx.currentVideoUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("video-container") },
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
    }
    if (__VLS_ctx.duration > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("timeline mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.handleTimelineClick) },
            ...{ class: ("timeline-track") },
            ref: ("timelineRef"),
        });
        // @ts-ignore navigation for `const timelineRef = ref()`
        /** @type { typeof __VLS_ctx.timelineRef } */ ;
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-bar") },
            ...{ style: (({ width: `${(__VLS_ctx.currentTime / __VLS_ctx.duration) * 100}%` })) },
        });
        for (const [marker] of __VLS_getVForSourceType((__VLS_ctx.examinationMarkers))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((marker.id)),
                ...{ class: ("examination-marker") },
                ...{ style: (({ left: `${(marker.timestamp / __VLS_ctx.duration) * 100}%` })) },
                title: ((`Untersuchung bei ${__VLS_ctx.formatTime(marker.timestamp)}`)),
            });
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mt-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addExaminationMarker) },
        ...{ class: ("btn btn-primary btn-sm") },
        disabled: ((!__VLS_ctx.currentVideoUrl)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("ms-3 text-muted") },
    });
    (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
    (__VLS_ctx.formatTime(__VLS_ctx.duration));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-lg-4") },
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
    if (__VLS_ctx.currentMarker) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.currentMarker.timestamp));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.showExaminationForm) {
        const __VLS_0 = {}.SimpleExaminationForm;
        /** @type { [typeof __VLS_components.SimpleExaminationForm, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onExaminationSaved': {} },
            videoTimestamp: ((__VLS_ctx.currentTime)),
            videoId: ((__VLS_ctx.selectedVideoId)),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onExaminationSaved': {} },
            videoTimestamp: ((__VLS_ctx.currentTime)),
            videoId: ((__VLS_ctx.selectedVideoId)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_6;
        const __VLS_7 = {
            onExaminationSaved: (__VLS_ctx.onExaminationSaved)
        };
        let __VLS_3;
        let __VLS_4;
        var __VLS_5;
    }
    else {
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
    }
    if (__VLS_ctx.savedExaminations.length > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header pb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("list-group list-group-flush") },
        });
        for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.savedExaminations))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((exam.id)),
                ...{ class: ("list-group-item d-flex justify-content-between align-items-center px-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.formatTime(exam.timestamp));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            (exam.examination_type || 'Untersuchung');
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.savedExaminations.length > 0)))
                            return;
                        __VLS_ctx.jumpToExamination(exam);
                    } },
                ...{ class: ("btn btn-sm btn-outline-primary me-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.savedExaminations.length > 0)))
                            return;
                        __VLS_ctx.deleteExamination(exam.id);
                    } },
                ...{ class: ("btn btn-sm btn-outline-danger") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
            });
        }
    }
    ['container-fluid', 'py-4', 'row', 'col-12', 'row', 'col-lg-8', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'mb-3', 'form-label', 'form-select', 'text-muted', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'video-container', 'w-100', 'timeline', 'mt-3', 'timeline-track', 'progress-bar', 'examination-marker', 'mt-3', 'btn', 'btn-primary', 'btn-sm', 'ms-3', 'text-muted', 'col-lg-4', 'card', 'card-header', 'pb-0', 'mb-0', 'text-muted', 'card-body', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'card', 'mt-3', 'card-header', 'pb-0', 'mb-0', 'card-body', 'list-group', 'list-group-flush', 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'px-0', 'text-muted', 'btn', 'btn-sm', 'btn-outline-primary', 'me-2', 'material-icons', 'btn', 'btn-sm', 'btn-outline-danger', 'material-icons',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'videoRef': __VLS_nativeElements['video'],
        'timelineRef': __VLS_nativeElements['div'],
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
