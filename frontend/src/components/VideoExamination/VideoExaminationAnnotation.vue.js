import { useVideoStore } from '@/stores/videoStore';
import SimpleExaminationForm from './SimpleExaminationForm.vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import Timeline from '@/components/EndoAI/Timeline.vue';
import { storeToRefs } from 'pinia';
export default (await import('vue')).defineComponent({
    name: 'VideoExaminationAnnotation',
    components: {
        SimpleExaminationForm,
        Timeline
    },
    setup() {
        const videoStore = useVideoStore();
        // Reaktive Referenzen vom Store
        const { allSegments: timelineSegments } = storeToRefs(videoStore);
        return {
            videoStore,
            timelineSegments
        };
    },
    data() {
        return {
            videos: [],
            selectedVideoId: null,
            currentTime: 0,
            duration: 0,
            fps: 30, // Default FPS, should be loaded from video metadata
            examinationMarkers: [],
            savedExaminations: [],
            currentMarker: null,
            selectedLabelType: '',
            isMarkingLabel: false,
            labelMarkingStart: 0,
            // Entfernt: labelSegments - jetzt aus Store
            currentLabel: null, // Current selected label object
            isMarking: false, // Tracking if currently marking
            markingStartTime: null, // Start time for marking
            videoId: null // Current video ID for API calls
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
            return this.videoStore.segmentsByLabel;
        },
        labelButtonText() {
            return this.isMarkingLabel ? 'Label-Ende setzen' : 'Label-Start setzen';
        },
        canStartLabeling() {
            return this.selectedVideoId &&
                this.currentVideoUrl &&
                this.selectedLabelType &&
                !this.isMarkingLabel &&
                this.duration > 0;
        },
        canFinishLabeling() {
            return this.isMarkingLabel;
        },
        currentTimePosition() {
            return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
        },
        timelineMarkers() {
            // Verwende Store-Segmente statt lokale Kopie
            return this.timelineSegments.map(segment => ({
                time: segment.startTime,
                position: this.duration > 0 ? (segment.startTime / this.duration) * 100 : 0
            }));
        }
        // Entfernt: convertedTimelineSegments - direkt timelineSegments verwenden
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
        async onVideoChange() {
            if (this.selectedVideoId !== null) {
                this.loadSavedExaminations();
                // Warte erst auf Video-Metadaten, dann lade Segmente
                await this.loadVideoMetadata();
                await this.loadVideoSegments();
                this.currentMarker = null;
            }
            else {
                // Clear everything when no video selected
                this.examinationMarkers = [];
                this.savedExaminations = [];
                this.currentMarker = null;
                this.videoStore.clearSegments();
            }
        },
        async loadVideoMetadata() {
            // Warte bis Video geladen ist, um duration zu haben
            if (this.$refs.videoRef) {
                await new Promise((resolve) => {
                    const video = this.$refs.videoRef;
                    if (video.readyState >= 1) {
                        this.duration = video.duration;
                        resolve();
                    }
                    else {
                        video.addEventListener('loadedmetadata', () => {
                            this.duration = video.duration;
                            resolve();
                        }, { once: true });
                    }
                });
            }
        },
        async loadVideoSegments() {
            if (this.selectedVideoId === null)
                return;
            try {
                // ✅ FIX: Use fetchVideoSegments instead of fetchSegmentsByLabel to get real segment entities with correct label_name
                await this.videoStore.fetchVideoSegments(this.selectedVideoId.toString());
                console.log('Video segments loaded for video:', this.selectedVideoId);
            }
            catch (error) {
                console.error('Error loading video segments:', error);
            }
        },
        onVideoLoaded() {
            if (this.$refs.videoRef) {
                this.duration = this.$refs.videoRef.duration;
                // Debug information for duration analysis
                console.log('🎥 Video loaded - Frontend duration info:');
                console.log(`- Duration from HTML5 video element: ${this.duration}s`);
                console.log(`- Video source URL: ${this.currentVideoUrl}`);
                console.log(`- Video readyState: ${this.$refs.videoRef.readyState}`);
                console.log(`- Video networkState: ${this.$refs.videoRef.networkState}`);
                // Additional video metadata
                if (this.$refs.videoRef.videoWidth && this.$refs.videoRef.videoHeight) {
                    console.log(`- Video dimensions: ${this.$refs.videoRef.videoWidth}x${this.$refs.videoRef.videoHeight}`);
                }
                // Check if duration seems unusually short
                if (this.duration < 10) {
                    console.warn(`⚠️ WARNING: Video duration seems very short (${this.duration}s). This might indicate an issue with:`);
                    console.warn('  - Video file corruption');
                    console.warn('  - Incorrect FPS calculation in backend');
                    console.warn('  - Browser video decoding issues');
                }
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
        async handleSegmentResize(segmentId, newEndTime) {
            console.log(`Segment ${segmentId} resized to end at ${newEndTime}s`);
            try {
                // Verwende Store für Update - das ist bereits reaktiv!
                await this.videoStore.updateSegment(segmentId, { endTime: newEndTime });
                console.log('✅ Segment resize saved to backend and store updated');
            }
            catch (error) {
                console.error('❌ Error saving segment resize:', error);
                this.showErrorMessage('Fehler beim Speichern der Segment-Änderung');
            }
        },
        async handleCreateSegment(targetTime, targetFrame) {
            if (!this.selectedLabelType) {
                this.showErrorMessage('Bitte wählen Sie ein Label aus.');
                return;
            }
            // Erstelle automatisch ein 5-Sekunden-Segment
            const startTime = targetTime;
            const endTime = Math.min(targetTime + 5, this.duration);
            await this.saveNewLabelSegment(startTime, endTime, this.selectedLabelType);
        },
        async startLabelMarking() {
            if (!this.selectedLabelType) {
                alert('Bitte wählen Sie einen Label-Typ aus.');
                return;
            }
            if (this.isMarkingLabel) {
                // If already marking, this call should finish the marking
                this.finishLabelMarking();
            }
            else {
                // Start new marking
                this.isMarkingLabel = true;
                this.labelMarkingStart = this.currentTime;
                console.log(`Label-Start gesetzt bei: ${this.currentTime}s`);
            }
        },
        cancelLabelMarking() {
            this.isMarkingLabel = false;
            this.labelMarkingStart = 0;
            this.selectedLabelType = '';
        },
        async finishLabelMarking() {
            if (!this.isMarkingLabel) {
                alert('Es wurde kein Label-Start gesetzt.');
                return;
            }
            const endTime = this.currentTime;
            const startTime = this.labelMarkingStart;
            if (endTime <= startTime) {
                alert('Das Label-Ende muss nach dem Label-Start liegen.');
                return;
            }
            console.log(`Label-Ende gesetzt bei: ${endTime}s`);
            // Create new label segment
            this.saveNewLabelSegment(startTime, endTime, this.selectedLabelType);
            // Reset marking state
            this.isMarkingLabel = false;
            this.labelMarkingStart = 0;
        },
        async saveNewLabelSegment(startTime, endTime, labelType) {
            if (!this.selectedVideoId) {
                console.error('Keine Video-ID verfügbar');
                this.showErrorMessage('Fehler: Keine Video-ID verfügbar');
                return;
            }
            try {
                const segmentData = {
                    video_id: this.selectedVideoId,
                    start_time: startTime,
                    end_time: endTime,
                    label_name: labelType,
                };
                console.log('Speichere Label-Segment:', segmentData);
                // Use axiosInstance instead of fetch for proper authentication
                const response = await axiosInstance.post(r('video-segments/'), segmentData);
                console.log('Label-Segment erfolgreich erstellt:', response.data);
                // Update Store statt lokales Array - reaktiv!
                await this.videoStore.fetchAllSegments(this.selectedVideoId.toString());
                this.showSuccessMessage(`Label-Segment erfolgreich erstellt: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
            }
            catch (error) {
                console.error('Fehler beim Speichern des Label-Segments:', error);
                this.showErrorMessage(`Fehler beim Speichern: ${error.response?.data?.detail || error.message}`);
            }
        },
        async loadLabelSegments() {
            // Diese Methode ist nicht mehr nötig - Store übernimmt das Laden
            console.log('loadLabelSegments called but using Store instead');
        },
        getCsrfToken() {
            // Get CSRF token from meta tag or cookie
            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            if (tokenMeta) {
                return tokenMeta.getAttribute('content');
            }
            // Fallback: get from cookie
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'csrftoken') {
                    return value;
                }
            }
            return '';
        },
        showSuccessMessage(message) {
            // Implement toast/notification system
            alert(`✅ ${message}`); // Replace with proper notification component
        },
        showErrorMessage(message) {
            // Implement toast/notification system  
            alert(`❌ ${message}`); // Replace with proper notification component
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
        },
        getSegmentStartTime(segment) {
            // Get start time of the segment, fallback to 0
            return segment.start_time || 0;
        },
        getSegmentEndTime(segment) {
            // Get end time of the segment, fallback to duration
            return segment.end_time || this.duration;
        },
        getSegmentStyle(segment) {
            const start = this.getSegmentStartTime(segment);
            const end = this.getSegmentEndTime(segment);
            const width = ((end - start) / this.duration) * 100;
            const left = (start / this.duration) * 100;
            return {
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: this.getLabelColor(segment.label_name), // Fix: Use label_name instead of label_id
                borderRadius: '4px',
                height: '100%',
                cursor: 'pointer',
                zIndex: 1
            };
        },
        seekToSegment(segment) {
            const startTime = this.getSegmentStartTime(segment);
            if (this.$refs.videoRef) {
                this.$refs.videoRef.currentTime = startTime;
            }
        },
        async deleteSegment(segmentId) {
            if (!confirm('Sind Sie sicher, dass Sie dieses Segment löschen möchten?')) {
                return;
            }
            try {
                console.log(`🗑️ Deleting segment ${segmentId}...`);
                await axiosInstance.delete(r(`video-segments/${segmentId}/`));
                // Update Store statt lokales Array - reaktiv!
                await this.videoStore.fetchAllSegments(this.selectedVideoId.toString());
                console.log(`✅ Segment ${segmentId} successfully deleted`);
                this.showSuccessMessage('Segment erfolgreich gelöscht');
            }
            catch (error) {
                console.error('❌ Error deleting segment:', error);
                // More specific error handling
                if (error.response?.status === 404) {
                    this.showErrorMessage('Segment nicht gefunden. Es wurde möglicherweise bereits gelöscht.');
                    // Refresh Store auch bei 404
                    await this.videoStore.fetchAllSegments(this.selectedVideoId.toString());
                }
                else if (error.response?.status === 403) {
                    this.showErrorMessage('Keine Berechtigung zum Löschen dieses Segments.');
                }
                else {
                    this.showErrorMessage('Fehler beim Löschen des Segments. Bitte versuchen Sie es erneut.');
                }
            }
        },
        async deleteAllFullVideoSegments() {
            // Verwende Store-Segmente statt lokale
            const allSegments = this.timelineSegments;
            const fullVideoSegments = allSegments.filter(segment => {
                const duration = segment.endTime - segment.startTime;
                return duration >= this.duration * 0.9; // Segments that cover 90%+ of video
            });
            if (fullVideoSegments.length === 0) {
                this.showSuccessMessage('Keine problematischen Vollvideo-Segmente gefunden.');
                return;
            }
            const confirmMessage = `${fullVideoSegments.length} Segment(e) decken fast das ganze Video ab (0:00-${this.formatTime(this.duration)}). Diese löschen?`;
            if (!confirm(confirmMessage)) {
                return;
            }
            try {
                console.log(`🧹 Deleting ${fullVideoSegments.length} full-video segments...`);
                // Delete each segment
                for (const segment of fullVideoSegments) {
                    await axiosInstance.delete(r(`video-segments/${segment.id}/`));
                    console.log(`✅ Deleted segment ${segment.id} (${segment.label_display})`);
                }
                // Refresh Store statt lokale Liste
                await this.videoStore.fetchAllSegments(this.selectedVideoId.toString());
                this.showSuccessMessage(`${fullVideoSegments.length} problematische Segmente erfolgreich gelöscht!`);
            }
            catch (error) {
                console.error('❌ Error deleting full-video segments:', error);
                this.showErrorMessage('Fehler beim Löschen der Vollvideo-Segmente. Bitte versuchen Sie es einzeln.');
            }
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
    ['examination-marker', 'list-group-item', 'label-group', 'label-segment-item', 'control-select', 'control-select', 'timeline-segment', 'segment-item', 'btn-secondary', 'btn-danger',];
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
            ...{ class: ("timeline-wrapper mt-3") },
        });
        const __VLS_0 = {}.Timeline;
        /** @type { [typeof __VLS_components.Timeline, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onSeek': {} },
            ...{ 'onResize': {} },
            ...{ 'onCreateSegment': {} },
            duration: ((__VLS_ctx.duration)),
            currentTime: ((__VLS_ctx.currentTime)),
            segments: ((__VLS_ctx.timelineSegments)),
            fps: ((__VLS_ctx.fps)),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onSeek': {} },
            ...{ 'onResize': {} },
            ...{ 'onCreateSegment': {} },
            duration: ((__VLS_ctx.duration)),
            currentTime: ((__VLS_ctx.currentTime)),
            segments: ((__VLS_ctx.timelineSegments)),
            fps: ((__VLS_ctx.fps)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_6;
        const __VLS_7 = {
            onSeek: (__VLS_ctx.handleTimelineSeek)
        };
        const __VLS_8 = {
            onResize: (__VLS_ctx.handleSegmentResize)
        };
        const __VLS_9 = {
            onCreateSegment: (__VLS_ctx.handleCreateSegment)
        };
        let __VLS_3;
        let __VLS_4;
        var __VLS_5;
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.handleTimelineClick) },
            ...{ class: ("simple-timeline-track mt-2") },
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
    if (__VLS_ctx.duration > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("debug-info mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.timelineSegments.length);
        (__VLS_ctx.formatTime(__VLS_ctx.duration));
        (Object.keys(__VLS_ctx.groupedSegments).length);
    }
    if (__VLS_ctx.selectedVideoId) {
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
        if (!__VLS_ctx.isMarkingLabel) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.startLabelMarking) },
                ...{ class: ("btn btn-success btn-sm control-button") },
                disabled: ((!__VLS_ctx.canStartLabeling)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
            });
        }
        if (__VLS_ctx.isMarkingLabel) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.finishLabelMarking) },
                ...{ class: ("btn btn-warning btn-sm control-button") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
            });
        }
        if (__VLS_ctx.isMarkingLabel) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.cancelLabelMarking) },
                ...{ class: ("btn btn-outline-secondary btn-sm control-button") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("ms-3 text-muted") },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
        (__VLS_ctx.formatTime(__VLS_ctx.duration));
        if (__VLS_ctx.isMarkingLabel) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-info mt-2 mb-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons align-middle me-1") },
                ...{ style: ({}) },
            });
            (__VLS_ctx.getTranslationForLabel(__VLS_ctx.selectedLabelType));
            (__VLS_ctx.formatTime(__VLS_ctx.labelMarkingStart));
        }
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
        const __VLS_10 = {}.SimpleExaminationForm;
        /** @type { [typeof __VLS_components.SimpleExaminationForm, ] } */ ;
        // @ts-ignore
        const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
            ...{ 'onExaminationSaved': {} },
            videoTimestamp: ((__VLS_ctx.currentTime)),
            videoId: ((__VLS_ctx.selectedVideoId)),
        }));
        const __VLS_12 = __VLS_11({
            ...{ 'onExaminationSaved': {} },
            videoTimestamp: ((__VLS_ctx.currentTime)),
            videoId: ((__VLS_ctx.selectedVideoId)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_11));
        let __VLS_16;
        const __VLS_17 = {
            onExaminationSaved: (__VLS_ctx.onExaminationSaved)
        };
        let __VLS_13;
        let __VLS_14;
        var __VLS_15;
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
    ['container-fluid', 'py-4', 'row', 'col-12', 'row', 'col-lg-8', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'mb-3', 'form-label', 'form-select', 'text-muted', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'video-container', 'w-100', 'timeline-wrapper', 'mt-3', 'simple-timeline-track', 'mt-2', 'progress-bar', 'examination-marker', 'debug-info', 'mt-2', 'text-muted', 'timeline-controls', 'mt-4', 'd-flex', 'align-items-center', 'gap-3', 'd-flex', 'align-items-center', 'form-label', 'mb-0', 'me-2', 'form-select', 'form-select-sm', 'control-select', 'd-flex', 'align-items-center', 'gap-2', 'btn', 'btn-success', 'btn-sm', 'control-button', 'material-icons', 'btn', 'btn-warning', 'btn-sm', 'control-button', 'material-icons', 'btn', 'btn-outline-secondary', 'btn-sm', 'control-button', 'ms-3', 'text-muted', 'alert', 'alert-info', 'mt-2', 'mb-0', 'material-icons', 'align-middle', 'me-1', 'col-lg-4', 'card', 'card-header', 'pb-0', 'mb-0', 'text-muted', 'card-body', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'card', 'mt-3', 'card-header', 'pb-0', 'mb-0', 'card-body', 'list-group', 'list-group-flush', 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'px-0', 'text-muted', 'btn', 'btn-sm', 'btn-outline-primary', 'me-2', 'material-icons', 'btn', 'btn-sm', 'btn-outline-danger', 'material-icons',];
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
