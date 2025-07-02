export default (await import('vue')).defineComponent({
    data() {
        return {
            formData: {
                name: '',
                polypCount: '',
                comments: '',
                gender: '',
                droppedNames: [] // Assuming this is set elsewhere in the app
            },
            errorMessage: ''
        };
    },
    methods: {
        getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        },
        async handleSubmit() {
            // Validate the form
            if (!this.formData.name.trim()) {
                this.errorMessage = 'Name cannot be empty. Please enter a name.';
                return;
            }
            this.errorMessage = '';
            // Collect draggable names with their coordinates (assuming it's set in data)
            const droppedNames = this.$emit('get-dropped-names');
            const data = {
                ...this.formData,
                droppedNames
            };
            try {
                const response = await fetch('http://127.0.0.1:8000/save-annotated-data/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCookie('csrftoken')
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.status === 'success') {
                    alert('Data saved successfully!');
                }
                else {
                    alert('Failed to save data.');
                }
            }
            catch (error) {
                console.error('Error:', error);
            }
        }
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleSubmit) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        id: ("name"),
        placeholder: ("Enter name"),
    });
    (__VLS_ctx.formData.name);
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        id: ("polypCount"),
        type: ("number"),
        placeholder: ("Anzahl der Polypen"),
    });
    (__VLS_ctx.formData.polypCount);
    __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: ((__VLS_ctx.formData.comments)),
        id: ("comments"),
        placeholder: ("Comments"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        id: ("genderFemale"),
        name: ("gender"),
        value: ("female"),
    });
    (__VLS_ctx.formData.gender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        id: ("genderMale"),
        name: ("gender"),
        value: ("male"),
    });
    (__VLS_ctx.formData.gender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        id: ("genderDivers"),
        name: ("gender"),
        value: ("divers"),
    });
    (__VLS_ctx.formData.gender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: ("submit"),
        id: ("saveData"),
    });
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger mt-2") },
        });
        (__VLS_ctx.errorMessage);
    }
    ['alert', 'alert-danger', 'mt-2',];
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
