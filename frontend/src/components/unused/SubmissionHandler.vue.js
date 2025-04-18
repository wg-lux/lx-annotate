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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
export default (await import('vue')).defineComponent({
    data: function () {
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
        getCookie: function (name) {
            var cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        },
        handleSubmit: function () {
            return __awaiter(this, void 0, void 0, function () {
                var droppedNames, data, response, result, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            // Validate the form
                            if (!this.formData.name.trim()) {
                                this.errorMessage = 'Name cannot be empty. Please enter a name.';
                                return [2 /*return*/];
                            }
                            this.errorMessage = '';
                            droppedNames = this.$emit('get-dropped-names');
                            data = __assign(__assign({}, this.formData), { droppedNames: droppedNames });
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, fetch('http://127.0.0.1:8000/save-annotated-data/', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRFToken': this.getCookie('csrftoken')
                                    },
                                    body: JSON.stringify(data)
                                })];
                        case 2:
                            response = _a.sent();
                            return [4 /*yield*/, response.json()];
                        case 3:
                            result = _a.sent();
                            if (result.status === 'success') {
                                alert('Data saved successfully!');
                            }
                            else {
                                alert('Failed to save data.');
                            }
                            return [3 /*break*/, 5];
                        case 4:
                            error_1 = _a.sent();
                            console.error('Error:', error_1);
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)(__assign({ onSubmit: (__VLS_ctx.handleSubmit) }));
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("alert alert-danger mt-2") }));
        (__VLS_ctx.errorMessage);
    }
    ['alert', 'alert-danger', 'mt-2',];
    var __VLS_slots;
    var $slots;
    var __VLS_inheritedAttrs;
    var $attrs;
    var __VLS_refs = {};
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
