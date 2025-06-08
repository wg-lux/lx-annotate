import { useVideoStore } from '@/stores/videoStore';
import SimpleExaminationForm from './SimpleExaminationForm.vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import Timeline from '@/components/EndoAI/Timeline.vue';
export default (await import('vue')).defineComponent({
    name: 'VideoExaminationAnnotation',
    components: {
        SimpleExaminationForm,
        Timeline
    },
    data() {
        return {
            videos: [],
            selectedVideoId: null, // Keep it truly null when nothing is chosen
            currentTime: 0,
            duration: 0,
            examinationMarkers: [],
            savedExaminations: [],
            currentMarker: null,
            selectedLabelType: '',
            isMarkingLabel: false,
            labelMarkingStart: 0
        };
    },
    computed: {
        currentVideoUrl() {
            const video = this.videos.find(v => v.id === this.selectedVideoId);
            if (!video)
                return '';
            // Fix: Use 'video_url' field from the API response instead of incorrect field names
            return video.video_url || '';
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
        },
        groupedSegments() {
            const videoStore = useVideoStore();
            return videoStore.segmentsByLabel;
        }
    },
    methods: {
        async loadVideos() {
            try {
                console.log('Loading videos from API...');
                const response = await axiosInstance.get(r('videos/'));
                console.log('Videos API response:', response.data);
                // Fix: API returns {videos: [...], labels: [...]} structure
                const videosData = response.data.videos || response.data || [];
                // Ensure IDs are numbers and add missing fields
                this.videos = videosData.map(v => ({
                    ...v,
                    id: Number(v.id),
                    // Add fallback fields for display
                    center_name: v.center_name || v.original_file_name || 'Unbekannt',
                    processor_name: v.processor_name || v.status || 'Unbekannt',
                    // Use the dedicated streaming endpoint from urls.py
                    video_url: `/api/videostream/${v.id}/`
                }));
                // Log the structure of the first video to help debug
                if (this.videos.length > 0) {
                    console.log('First video structure after processing:', this.videos[0]);
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
                this.loadVideoSegments();
                this.currentMarker = null;
            }
            else {
                // Clear everything when no video selected
                this.examinationMarkers = [];
                this.savedExaminations = [];
                this.currentMarker = null;
            }
        },
        async loadVideoSegments() {
            if (this.selectedVideoId === null)
                return;
            const videoStore = useVideoStore();
            try {
                // Lade alle Segmente für das Video
                await videoStore.fetchAllSegments(this.selectedVideoId.toString());
                console.log('Video segments loaded for video:', this.selectedVideoId);
            }
            catch (error) {
                console.error('Error loading video segments:', error);
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
        },
        handleTimelineSeek(targetTime) {
            if (this.$refs.videoRef) {
                this.$refs.videoRef.currentTime = targetTime;
            }
        },
        handleSegmentResize(segmentId, newEndTime) {
            console.log(`Segment ${segmentId} resized to end at ${newEndTime}s`);
            // Hier könnten Sie die Änderung an den Server senden
        },
        startLabelMarking() {
            if (!this.isMarkingLabel) {
                // Start marking a new label
                this.labelMarkingStart = this.currentTime;
                this.isMarkingLabel = true;
            }
            else {
                // End the current label marking and create new segment
                this.finishLabelMarking();
            }
        },
        cancelLabelMarking() {
            this.isMarkingLabel = false;
            this.labelMarkingStart = 0;
        },
        async finishLabelMarking() {
            if (!this.selectedLabelType || !this.isMarkingLabel)
                return;
            const endTime = this.currentTime;
            const startTime = this.labelMarkingStart;
            // Ensure start time is before end time
            if (startTime >= endTime) {
                alert('Das Ende-Zeit muss nach der Start-Zeit sein. Bitte versuchen Sie es erneut.');
                return;
            }
            const videoStore = useVideoStore();
            try {
                // Create new segment locally first
                const newSegment = {
                    id: `manual-${Date.now()}`,
                    label: this.selectedLabelType,
                    label_display: this.getTranslationForLabel(this.selectedLabelType),
                    startTime: startTime,
                    endTime: endTime,
                    avgConfidence: 1.0 // Manual annotations have full confidence
                };
                // Add to the appropriate label category in the store
                if (!videoStore.segmentsByLabel[this.selectedLabelType]) {
                    videoStore.segmentsByLabel[this.selectedLabelType] = [];
                }
                videoStore.segmentsByLabel[this.selectedLabelType].push(newSegment);
                // TODO: Send to backend API to persist the new segment
                await this.saveNewLabelSegment(newSegment);
                console.log('New label segment created:', newSegment);
                // Reset marking state
                this.isMarkingLabel = false;
                this.labelMarkingStart = 0;
                this.selectedLabelType = '';
            }
            catch (error) {
                console.error('Error creating label segment:', error);
                alert('Fehler beim Erstellen des Label-Segments. Bitte versuchen Sie es erneut.');
            }
        },
        async saveNewLabelSegment(segment) {
            // This would send the new segment to the backend API
            // For now, we'll just log it - you'll need to implement the actual API call
            try {
                const response = await axiosInstance.post(r(`video/${this.selectedVideoId}/segments/`), {
                    label: segment.label,
                    start_time: segment.startTime,
                    end_time: segment.endTime,
                    confidence: segment.avgConfidence
                });
                console.log('Segment saved to backend:', response.data);
            }
            catch (error) {
                console.error('Error saving segment to backend:', error);
                // Don't throw - allow local storage to work even if backend fails
            }
        },
        getTranslationForLabel(labelKey) {
            const translations = {
                appendix: 'Appendix',
                blood: 'Blut',
                diverticule: 'Divertikel',
                grasper: 'Greifer',
                ileocaecalvalve: 'Ileozäkalklappe',
                ileum: 'Ileum',
                low_quality: 'Niedrige Bildqualität',
                nbi: 'Narrow Band Imaging',
                needle: 'Nadel',
                outside: 'Außerhalb',
                polyp: 'Polyp',
                snare: 'Snare',
                water_jet: 'Wasserstrahl',
                wound: 'Wunde'
            };
            return translations[labelKey] || labelKey;
        },
        getLabelColor(labelKey) {
            const colors = {
                appendix: '#FFDDC1',
                blood: '#FFABAB',
                diverticule: '#FFC3A0',
                grasper: '#FF677D',
                ileocaecalvalve: '#D4A5A5',
                ileum: '#392F5A',
                low_quality: '#F8E16C',
                nbi: '#6EEB83',
                needle: '#A0D7E6',
                outside: '#FFE156',
                polyp: '#6A0572',
                snare: '#AB83A1',
                water_jet: '#FFD3B6',
                wound: '#FF677D'
            };
            return colors[labelKey] || '#FFFFFF';
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
        SimpleExaminationForm,
        Timeline
    };
    let __VLS_components;
    let __VLS_directives;
    ['examination-marker', 'list-group-item', 'label-group', 'label-segment-item', 'control-select', 'control-select',];
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
            ...{ class: ("timeline-container mt-3") },
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-2 timeline-section") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("text-muted mb-2") },
        });
        const __VLS_0 = {}.Timeline;
        /** @type { [typeof __VLS_components.Timeline, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onSeek': {} },
            ...{ 'onResize': {} },
            duration: ((__VLS_ctx.duration)),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onSeek': {} },
            ...{ 'onResize': {} },
            duration: ((__VLS_ctx.duration)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_6;
        const __VLS_7 = {
            onSeek: (__VLS_ctx.handleTimelineSeek)
        };
        const __VLS_8 = {
            onResize: (__VLS_ctx.handleSegmentResize)
        };
        let __VLS_3;
        let __VLS_4;
        var __VLS_5;
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("label-overview mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("text-muted mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("label-summary-container") },
        });
        for (const [segments, labelType] of __VLS_getVForSourceType((__VLS_ctx.groupedSegments))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((labelType)),
                ...{ class: ("label-group") },
            });
            __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (segments.length > 0) }, null, null);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("label-header") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("label-color-indicator") },
                ...{ style: (({ backgroundColor: __VLS_ctx.getLabelColor(labelType) })) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("label-name") },
            });
            (__VLS_ctx.getTranslationForLabel(labelType));
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("label-count") },
            });
            (segments.length);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("label-segments") },
            });
            for (const [segment] of __VLS_getVForSourceType((segments))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.duration > 0)))
                                return;
                            __VLS_ctx.handleTimelineSeek((segment.startTime + segment.endTime) / 2);
                        } },
                    key: ((segment.id)),
                    ...{ class: ("label-segment-item") },
                    title: ((`${segment.label_display}: ${__VLS_ctx.formatTime(segment.startTime)} - ${__VLS_ctx.formatTime(segment.endTime)}`)),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
                (__VLS_ctx.formatTime(segment.startTime));
                (__VLS_ctx.formatTime(segment.endTime));
            }
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-controls mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex align-items-center gap-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-label mb-0 me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.selectedLabelType)),
        ...{ class: ("form-select form-select-sm control-select") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (""),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("appendix"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("blood"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("diverticule"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("grasper"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("ileocaecalvalve"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("ileum"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("low_quality"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("nbi"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("needle"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("outside"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("polyp"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("snare"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("water_jet"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("wound"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex align-items-center gap-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.startLabelMarking) },
        ...{ class: ("btn btn-success btn-sm control-button") },
        disabled: ((!__VLS_ctx.currentVideoUrl || !__VLS_ctx.selectedLabelType || __VLS_ctx.isMarkingLabel)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons") },
    });
    (__VLS_ctx.isMarkingLabel ? 'Label-Ende setzen' : 'Label-Start setzen');
    if (__VLS_ctx.isMarkingLabel) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelLabelMarking) },
            ...{ class: ("btn btn-outline-secondary btn-sm control-button") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("ms-3 text-muted") },
    });
    (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
    (__VLS_ctx.formatTime(__VLS_ctx.duration));
    if (__VLS_ctx.isMarkingLabel) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-2 p-2 bg-info bg-opacity-10 border border-info rounded") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
            ...{ style: ({}) },
        });
        (__VLS_ctx.getTranslationForLabel(__VLS_ctx.selectedLabelType));
        (__VLS_ctx.formatTime(__VLS_ctx.labelMarkingStart));
    }
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
        const __VLS_9 = {}.SimpleExaminationForm;
        /** @type { [typeof __VLS_components.SimpleExaminationForm, ] } */ ;
        // @ts-ignore
        const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
            ...{ 'onExaminationSaved': {} },
            videoTimestamp: ((__VLS_ctx.currentTime)),
            videoId: ((__VLS_ctx.selectedVideoId)),
        }));
        const __VLS_11 = __VLS_10({
            ...{ 'onExaminationSaved': {} },
            videoTimestamp: ((__VLS_ctx.currentTime)),
            videoId: ((__VLS_ctx.selectedVideoId)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_10));
        let __VLS_15;
        const __VLS_16 = {
            onExaminationSaved: (__VLS_ctx.onExaminationSaved)
        };
        let __VLS_12;
        let __VLS_13;
        var __VLS_14;
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
    ['container-fluid', 'py-4', 'row', 'col-12', 'row', 'col-lg-8', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'mb-3', 'form-label', 'form-select', 'text-muted', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'video-container', 'w-100', 'timeline-container', 'mt-3', 'timeline-track', 'progress-bar', 'examination-marker', 'mt-2', 'timeline-section', 'text-muted', 'mb-2', 'label-overview', 'mt-3', 'text-muted', 'mb-2', 'label-summary-container', 'label-group', 'label-header', 'label-color-indicator', 'label-name', 'label-count', 'label-segments', 'label-segment-item', 'timeline-controls', 'mt-4', 'd-flex', 'align-items-center', 'gap-3', 'd-flex', 'align-items-center', 'form-label', 'mb-0', 'me-2', 'form-select', 'form-select-sm', 'control-select', 'd-flex', 'align-items-center', 'gap-2', 'btn', 'btn-success', 'btn-sm', 'control-button', 'material-icons', 'btn', 'btn-outline-secondary', 'btn-sm', 'control-button', 'material-icons', 'ms-3', 'text-muted', 'mt-2', 'p-2', 'bg-info', 'bg-opacity-10', 'border', 'border-info', 'rounded', 'text-info', 'material-icons', 'col-lg-4', 'card', 'card-header', 'pb-0', 'mb-0', 'text-muted', 'card-body', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'card', 'mt-3', 'card-header', 'pb-0', 'mb-0', 'card-body', 'list-group', 'list-group-flush', 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'px-0', 'text-muted', 'btn', 'btn-sm', 'btn-outline-primary', 'me-2', 'material-icons', 'btn', 'btn-sm', 'btn-outline-danger', 'material-icons',];
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
