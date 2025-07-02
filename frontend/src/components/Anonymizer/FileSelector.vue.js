import { ref, computed, onMounted } from 'vue';
import axiosInstance from '@/api/axiosInstance';
const emit = defineEmits();
// State
const loading = ref(false);
const error = ref(null);
const selectedFileType = ref('all');
const searchTerm = ref('');
const selectedFile = ref(null);
// File data
const pdfs = ref([]);
const videos = ref([]);
// Computed
const shouldShowPdfs = computed(() => selectedFileType.value === 'all' || selectedFileType.value === 'pdf');
const shouldShowVideos = computed(() => selectedFileType.value === 'all' || selectedFileType.value === 'video');
const filteredPdfs = computed(() => {
    if (!searchTerm.value)
        return pdfs.value;
    const search = searchTerm.value.toLowerCase();
    return pdfs.value.filter(pdf => pdf.filename.toLowerCase().includes(search) ||
        pdf.patientInfo?.patientFirstName?.toLowerCase().includes(search) ||
        pdf.patientInfo?.patientLastName?.toLowerCase().includes(search));
});
const filteredVideos = computed(() => {
    if (!searchTerm.value)
        return videos.value;
    const search = searchTerm.value.toLowerCase();
    return videos.value.filter(video => video.filename.toLowerCase().includes(search) ||
        video.patientInfo?.patientFirstName?.toLowerCase().includes(search) ||
        video.patientInfo?.patientLastName?.toLowerCase().includes(search));
});
// Methods
const loadFiles = async () => {
    loading.value = true;
    error.value = null;
    try {
        const response = await axiosInstance.get('/api/available-files/', {
            params: {
                type: selectedFileType.value,
                limit: 100
            }
        });
        if (selectedFileType.value === 'all' || selectedFileType.value === 'pdf') {
            pdfs.value = response.data.pdfs || [];
        }
        if (selectedFileType.value === 'all' || selectedFileType.value === 'video') {
            videos.value = response.data.videos || [];
        }
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler beim Laden der Dateien.';
        console.error('Error loading files:', err);
    }
    finally {
        loading.value = false;
    }
};
const filterFiles = () => {
    // Filtering is handled by computed properties
    // This method exists for the @input event
};
const selectFile = (type, file) => {
    selectedFile.value = {
        type,
        id: file.id,
        data: file
    };
};
const startAnnotation = () => {
    if (selectedFile.value) {
        emit('fileSelected', selectedFile.value);
    }
};
const formatDate = (dateString) => {
    if (!dateString)
        return 'Unbekannt';
    try {
        return new Date(dateString).toLocaleDateString('de-DE');
    }
    catch {
        return dateString;
    }
};
// Lifecycle
onMounted(() => {
    loadFiles();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['file-item', 'file-item', 'file-grid',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("file-selector") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-file-alt me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2") },
        });
    }
    else if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.error);
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("fileTypeFilter"),
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.loadFiles) },
            id: ("fileTypeFilter"),
            ...{ class: ("form-select") },
            value: ((__VLS_ctx.selectedFileType)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("all"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("pdf"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("video"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("searchFilter"),
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ onInput: (__VLS_ctx.filterFiles) },
            id: ("searchFilter"),
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.searchTerm)),
            placeholder: ("Nach Dateiname oder Patient suchen..."),
        });
        if (__VLS_ctx.shouldShowPdfs) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("text-primary") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-file-pdf me-2") },
            });
            (__VLS_ctx.filteredPdfs.length);
            if (__VLS_ctx.filteredPdfs.length === 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("alert alert-info") },
                });
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("file-grid") },
                });
                for (const [pdf] of __VLS_getVForSourceType((__VLS_ctx.filteredPdfs))) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ onClick: (...[$event]) => {
                                if (!(!((__VLS_ctx.loading))))
                                    return;
                                if (!(!((__VLS_ctx.error))))
                                    return;
                                if (!((__VLS_ctx.shouldShowPdfs)))
                                    return;
                                if (!(!((__VLS_ctx.filteredPdfs.length === 0))))
                                    return;
                                __VLS_ctx.selectFile('pdf', pdf);
                            } },
                        key: ((`pdf-${pdf.id}`)),
                        ...{ class: ("file-item card") },
                        ...{ class: (({ 'selected': __VLS_ctx.selectedFile?.type === 'pdf' && __VLS_ctx.selectedFile?.id === pdf.id })) },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("card-body p-3") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("d-flex justify-content-between align-items-start mb-2") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                        ...{ class: ("card-title mb-0") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-file-pdf text-danger me-2") },
                    });
                    (pdf.filename);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-primary") },
                    });
                    if (pdf.patientInfo) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: ("patient-info") },
                        });
                        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                            ...{ class: ("text-muted") },
                        });
                        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                        (pdf.patientInfo.patientFirstName);
                        (pdf.patientInfo.patientLastName);
                        __VLS_elementAsFunction(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
                        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                            ...{ class: ("text-muted") },
                        });
                        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                        (__VLS_ctx.formatDate(pdf.patientInfo.patientDob));
                        __VLS_elementAsFunction(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
                        if (pdf.patientInfo.centerName) {
                            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                                ...{ class: ("text-muted") },
                            });
                            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                            (pdf.patientInfo.centerName);
                        }
                    }
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("mt-2") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                        ...{ class: ("text-muted") },
                    });
                    (pdf.id);
                    if (pdf.sensitiveMetaId) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                            ...{ class: ("text-muted ms-2") },
                        });
                        (pdf.sensitiveMetaId);
                    }
                }
            }
        }
        if (__VLS_ctx.shouldShowVideos) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("text-success") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-video me-2") },
            });
            (__VLS_ctx.filteredVideos.length);
            if (__VLS_ctx.filteredVideos.length === 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("alert alert-info") },
                });
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("file-grid") },
                });
                for (const [video] of __VLS_getVForSourceType((__VLS_ctx.filteredVideos))) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ onClick: (...[$event]) => {
                                if (!(!((__VLS_ctx.loading))))
                                    return;
                                if (!(!((__VLS_ctx.error))))
                                    return;
                                if (!((__VLS_ctx.shouldShowVideos)))
                                    return;
                                if (!(!((__VLS_ctx.filteredVideos.length === 0))))
                                    return;
                                __VLS_ctx.selectFile('video', video);
                            } },
                        key: ((`video-${video.id}`)),
                        ...{ class: ("file-item card") },
                        ...{ class: (({ 'selected': __VLS_ctx.selectedFile?.type === 'video' && __VLS_ctx.selectedFile?.id === video.id })) },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("card-body p-3") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("d-flex justify-content-between align-items-start mb-2") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                        ...{ class: ("card-title mb-0") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-video text-success me-2") },
                    });
                    (video.filename);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-success") },
                    });
                    if (video.patientInfo) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: ("patient-info") },
                        });
                        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                            ...{ class: ("text-muted") },
                        });
                        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                        (video.patientInfo.patientFirstName);
                        (video.patientInfo.patientLastName);
                        __VLS_elementAsFunction(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
                        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                            ...{ class: ("text-muted") },
                        });
                        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                        (__VLS_ctx.formatDate(video.patientInfo.patientDob));
                        __VLS_elementAsFunction(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
                        if (video.patientInfo.centerName) {
                            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                                ...{ class: ("text-muted") },
                            });
                            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                            (video.patientInfo.centerName);
                        }
                    }
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("mt-2") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                        ...{ class: ("text-muted") },
                    });
                    (video.id);
                    if (video.sensitiveMetaId) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                            ...{ class: ("text-muted ms-2") },
                        });
                        (video.sensitiveMetaId);
                    }
                }
            }
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex justify-content-end gap-2 mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.loading))))
                        return;
                    if (!(!((__VLS_ctx.error))))
                        return;
                    __VLS_ctx.$emit('cancel');
                } },
            type: ("button"),
            ...{ class: ("btn btn-secondary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.startAnnotation) },
            type: ("button"),
            ...{ class: ("btn btn-primary") },
            disabled: ((!__VLS_ctx.selectedFile)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-play me-2") },
        });
    }
    ['file-selector', 'card', 'card-header', 'mb-0', 'fas', 'fa-file-alt', 'me-2', 'card-body', 'text-center', 'py-4', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'row', 'mb-4', 'col-md-6', 'form-label', 'form-select', 'col-md-6', 'form-label', 'form-control', 'mb-4', 'text-primary', 'fas', 'fa-file-pdf', 'me-2', 'alert', 'alert-info', 'file-grid', 'file-item', 'card', 'selected', 'card-body', 'p-3', 'd-flex', 'justify-content-between', 'align-items-start', 'mb-2', 'card-title', 'mb-0', 'fas', 'fa-file-pdf', 'text-danger', 'me-2', 'badge', 'bg-primary', 'patient-info', 'text-muted', 'text-muted', 'text-muted', 'mt-2', 'text-muted', 'text-muted', 'ms-2', 'mb-4', 'text-success', 'fas', 'fa-video', 'me-2', 'alert', 'alert-info', 'file-grid', 'file-item', 'card', 'selected', 'card-body', 'p-3', 'd-flex', 'justify-content-between', 'align-items-start', 'mb-2', 'card-title', 'mb-0', 'fas', 'fa-video', 'text-success', 'me-2', 'badge', 'bg-success', 'patient-info', 'text-muted', 'text-muted', 'text-muted', 'mt-2', 'text-muted', 'text-muted', 'ms-2', 'd-flex', 'justify-content-end', 'gap-2', 'mt-4', 'btn', 'btn-secondary', 'btn', 'btn-primary', 'fas', 'fa-play', 'me-2',];
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
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            error: error,
            selectedFileType: selectedFileType,
            searchTerm: searchTerm,
            selectedFile: selectedFile,
            shouldShowPdfs: shouldShowPdfs,
            shouldShowVideos: shouldShowVideos,
            filteredPdfs: filteredPdfs,
            filteredVideos: filteredVideos,
            loadFiles: loadFiles,
            filterFiles: filterFiles,
            selectFile: selectFile,
            startAnnotation: startAnnotation,
            formatDate: formatDate,
        };
    },
    __typeEmits: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
