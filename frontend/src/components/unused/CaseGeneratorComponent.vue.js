var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
export default (await import('vue')).defineComponent({
    name: 'CaseGenerator',
    data: function () {
        return {
            fileUserValidation: false,
            documentType: 'examination',
            textType: 'original',
            isFinal: false,
            containsHisto: false,
            followupOneYear: false,
            isPreliminary: false,
            patientFirstName: '',
            patientLastName: '',
            patientBirthDate: '',
            examinationDate: '',
            processedText: '',
            uploadedFile: null
        };
    },
    methods: {
        triggerFileInput: function () {
            this.$refs.fileInput.click();
        },
        handleDrop: function (event) {
            this.uploadedFile = event.dataTransfer.files[0];
        },
        handleFileUpload: function (event) {
            this.uploadedFile = event.target.files[0];
        },
        validateForm: function () {
            if (this.documentType === 'examination') {
                if (this.isPreliminary && !this.containsHisto) {
                    return 'Vorläufige Berichte sollten angeben, ob Histologie erforderlich ist.';
                }
                var examDate = new Date(this.examinationDate);
                var oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                if (examDate < oneYearAgo && !this.followupOneYear) {
                    return 'Untersuchungen, die älter als 1 Jahr sind, erfordern eine Nachkontrolle.';
                }
            }
            return null;
        },
        handleSubmit: function () {
            var validationError = this.validateForm();
            if (validationError) {
                alert(validationError);
                return;
            }
            var caseData = {
                fileUserValidation: this.fileUserValidation,
                documentType: this.documentType,
                textType: this.textType,
                examinationDetails: {
                    isFinal: this.isFinal,
                    containsHisto: this.containsHisto,
                    followupOneYear: this.followupOneYear,
                    isPreliminary: this.isPreliminary
                },
                patientInfo: {
                    firstName: this.patientFirstName,
                    lastName: this.patientLastName,
                    birthDate: this.patientBirthDate
                },
                examinationType: 'Kolo',
                examinationDate: this.examinationDate,
                processedText: this.processedText,
                file: this.uploadedFile
            };
            // Emit the data to parent component
            this.$emit('case-generated', caseData);
        }
    }
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-12 mb-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-header pb-0") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)(__assign({ class: ("mb-0") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-body") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-6") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign(__assign({ onDragover: function () { } }, { onDrop: (__VLS_ctx.handleDrop) }), { onClick: (__VLS_ctx.triggerFileInput) }), { class: ("upload-area") }));
    if (!__VLS_ctx.uploadedFile) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.uploadedFile.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign(__assign({ onChange: (__VLS_ctx.handleFileUpload) }, { type: ("file") }), { class: ("d-none") }), { ref: ("fileInput") }));
    // @ts-ignore navigation for `const fileInput = ref()`
    /** @type { typeof __VLS_ctx.fileInput } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-6") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check form-switch mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ class: ("form-check-input") }, { type: ("checkbox") }));
    (__VLS_ctx.fileUserValidation);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-check-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-6") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ class: ("form-control") }, { value: ((__VLS_ctx.documentType)) }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("video"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("examination"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("histology"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-6") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ class: ("form-control") }, { value: ((__VLS_ctx.textType)) }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("original"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("extracted"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("processed"),
    });
    if (__VLS_ctx.documentType === 'examination') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-4") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-12") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card bg-gray-100") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-body") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)(__assign({ class: ("mb-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check mb-2") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ class: ("form-check-input") }, { type: ("checkbox") }));
        (__VLS_ctx.isFinal);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-check-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check mb-2") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ class: ("form-check-input") }, { type: ("checkbox") }));
        (__VLS_ctx.containsHisto);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-check-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check mb-2") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ class: ("form-check-input") }, { type: ("checkbox") }));
        (__VLS_ctx.followupOneYear);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-check-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ class: ("form-check-input") }, { type: ("checkbox") }));
        (__VLS_ctx.isPreliminary);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-check-label") }));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-12") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("text") }, { class: ("form-control") }), { value: ((__VLS_ctx.patientFirstName)), placeholder: ("Vorname") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("text") }, { class: ("form-control") }), { value: ((__VLS_ctx.patientLastName)), placeholder: ("Nachname") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ type: ("date") }, { class: ("form-control") }));
    (__VLS_ctx.patientBirthDate);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-6") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ type: ("date") }, { class: ("form-control") }));
    (__VLS_ctx.examinationDate);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-6") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("text") }, { class: ("form-control") }), { value: ("Koloskopie"), disabled: (true) }));
    if (__VLS_ctx.textType === 'processed') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-4") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-12") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)(__assign({ class: ("form-control") }, { rows: ("4"), value: ((__VLS_ctx.processedText)) }));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-12") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: (__VLS_ctx.handleSubmit) }, { class: ("btn btn-primary") }));
    ['container-fluid', 'py-4', 'row', 'col-12', 'mb-4', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'row', 'mb-4', 'col-md-6', 'form-group', 'form-control-label', 'upload-area', 'd-none', 'col-md-6', 'form-check', 'form-switch', 'mt-4', 'form-check-input', 'form-check-label', 'row', 'mb-4', 'col-md-6', 'form-group', 'form-control-label', 'form-control', 'col-md-6', 'form-group', 'form-control-label', 'form-control', 'row', 'mb-4', 'col-md-12', 'card', 'bg-gray-100', 'card-body', 'mb-3', 'form-check', 'mb-2', 'form-check-input', 'form-check-label', 'form-check', 'mb-2', 'form-check-input', 'form-check-label', 'form-check', 'mb-2', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'row', 'mb-4', 'col-md-12', 'mb-3', 'col-md-4', 'form-group', 'form-control-label', 'form-control', 'col-md-4', 'form-group', 'form-control-label', 'form-control', 'col-md-4', 'form-group', 'form-control-label', 'form-control', 'row', 'mb-4', 'col-md-6', 'form-group', 'form-control-label', 'form-control', 'col-md-6', 'form-group', 'form-control-label', 'form-control', 'row', 'mb-4', 'col-12', 'form-group', 'form-control-label', 'form-control', 'row', 'col-12', 'btn', 'btn-primary',];
    var __VLS_slots;
    var $slots;
    var __VLS_inheritedAttrs;
    var $attrs;
    var __VLS_refs = {
        'fileInput': __VLS_nativeElements['input'],
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
var __VLS_self;
