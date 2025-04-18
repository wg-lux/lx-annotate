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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
export default (await import('vue')).defineComponent({
    data: function () {
        return {
            randomNames: [], // Array to store multiple random names
            selectedGender: "", // Default gender selection (empty string)
            femaleFirstNames: [],
            femaleLastNames: [],
            maleFirstNames: [],
            maleLastNames: [],
            errorMessage: "" // Variable to store error messages
        };
    },
    methods: {
        loadNames: function () {
            return __awaiter(this, void 0, void 0, function () {
                var loadNameFile, _a, _b, _c, _d;
                var _this = this;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            loadNameFile = function (filePath) { return __awaiter(_this, void 0, void 0, function () {
                                var response, text;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, fetch(filePath)];
                                        case 1:
                                            response = _a.sent();
                                            return [4 /*yield*/, response.text()];
                                        case 2:
                                            text = _a.sent();
                                            // Ersetzen von \r\n durch \n und dann Splitten
                                            return [2 /*return*/, text.replace(/\r\n/g, '\n').split('\n').map(function (name) { return name.trim(); }).filter(function (name) { return name.length > 0; })];
                                    }
                                });
                            }); };
                            // Load female and male names
                            _a = this;
                            return [4 /*yield*/, loadNameFile('./assets/names-dictionary/first_names_female_ascii.txt')];
                        case 1:
                            // Load female and male names
                            _a.femaleFirstNames = _e.sent();
                            _b = this;
                            return [4 /*yield*/, loadNameFile('./assets/names-dictionary/last_names_female_ascii.txt')];
                        case 2:
                            _b.femaleLastNames = _e.sent();
                            _c = this;
                            return [4 /*yield*/, loadNameFile('./assets/names-dictionary/first_names_male_ascii.txt')];
                        case 3:
                            _c.maleFirstNames = _e.sent();
                            _d = this;
                            return [4 /*yield*/, loadNameFile('./assets/names-dictionary/last_names_male_ascii.txt')];
                        case 4:
                            _d.maleLastNames = _e.sent();
                            // Validation: Ensure first names and last names arrays have equal lengths
                            if (this.femaleFirstNames.length !== this.femaleLastNames.length) {
                                this.errorMessage = "Female first names and last names are not of the same length.";
                                return [2 /*return*/];
                            }
                            if (this.maleFirstNames.length !== this.maleLastNames.length) {
                                this.errorMessage = "Male first names and last names are not of the same length.";
                                return [2 /*return*/];
                            }
                            // Clear any previous error message after successful load
                            this.errorMessage = "";
                            return [2 /*return*/];
                    }
                });
            });
        },
        getRandomIndex: function (array) {
            // Return a random index from the array
            return Math.floor(Math.random() * array.length);
        },
        generateRandomName: function (gender) {
            if (!this.selectedGender) {
                this.errorMessage = 'Please specify the gender before adding a random name.';
                return;
            }
            var firstNameArray, lastNameArray;
            switch (gender) {
                case 'male':
                    firstNameArray = this.maleFirstNames;
                    lastNameArray = this.maleLastNames;
                    break;
                case 'female':
                    firstNameArray = this.femaleFirstNames;
                    lastNameArray = this.femaleLastNames;
                    break;
                default:
                    this.errorMessage = 'Invalid gender selected.';
                    return;
            }
            // Clear the error message if everything is fine
            this.errorMessage = "";
            // Ensure arrays are not empty and have the same length (validated earlier)
            var randomIndex = this.getRandomIndex(firstNameArray);
            // Return the first name and last name at the same index
            var firstNameSelected = firstNameArray[randomIndex];
            var lastNameSelected = lastNameArray[randomIndex];
            return "".concat(firstNameSelected, " ").concat(lastNameSelected);
        },
        handleAddRandomName: function () {
            var randomName = this.generateRandomName(this.selectedGender); // Pass the selected gender
            if (randomName) {
                this.randomNames.push(randomName); // Add to the array of random names if valid
            }
        },
        removeName: function (index) {
            this.randomNames.splice(index, 1); // Remove the name at the given index
        }
    },
    created: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadNames()];
                    case 1:
                        _a.sent(); // Load names when the component is created
                        return [2 /*return*/];
                }
            });
        });
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    ['name-item',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        value: ("male"),
    });
    (__VLS_ctx.selectedGender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        value: ("female"),
    });
    (__VLS_ctx.selectedGender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: (__VLS_ctx.handleAddRandomName) }, { class: ("btn btn-success") }));
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)(__assign({ style: ({}) }));
        (__VLS_ctx.errorMessage);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)(__assign({ class: ("name-list") }));
    var __VLS_0 = {}.KeepAlive;
    /** @type { [typeof __VLS_components.KeepAlive, typeof __VLS_components.keepAlive, typeof __VLS_components.KeepAlive, typeof __VLS_components.keepAlive, ] } */ ;
    // @ts-ignore
    var __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    var __VLS_2 = __VLS_1.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_1), false));
    var _loop_1 = function (name_1, index) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ key: ((index)) }, { class: ("name-item") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("highlighted-name") }));
        (name_1);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.removeName(index);
            } }, { class: ("btn btn-danger btn-sm") }));
    };
    for (var _i = 0, _a = __VLS_getVForSourceType((__VLS_ctx.randomNames)); _i < _a.length; _i++) {
        var _b = _a[_i], name_1 = _b[0], index = _b[1];
        _loop_1(name_1, index);
    }
    __VLS_5.slots.default;
    var __VLS_5;
    ['btn', 'btn-success', 'name-list', 'name-item', 'highlighted-name', 'btn', 'btn-danger', 'btn-sm',];
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
