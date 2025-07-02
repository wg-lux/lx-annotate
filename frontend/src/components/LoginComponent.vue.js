"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = require("vue");
const auth_1 = require("@/stores/auth");
const vue_router_1 = require("vue-router");
exports.default = (await Promise.resolve().then(() => __importStar(require('vue')))).defineComponent({
    name: 'LoginComponent',
    setup() {
        const authStore = (0, auth_1.useAuthStore)();
        const router = (0, vue_router_1.useRouter)();
        const email = (0, vue_1.ref)('');
        const password = (0, vue_1.ref)('');
        const rememberMe = (0, vue_1.ref)(false);
        const error = (0, vue_1.ref)(null);
        const handleLogin = async () => {
            try {
                error.value = null;
                await authStore.login({ email: email.value, password: password.value });
                router.push('/');
            }
            catch (err) {
                error.value = 'Failed to login. Please check your credentials.';
            }
        };
        return {
            email,
            password,
            rememberMe,
            error,
            handleLogin,
        };
    },
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container my-5") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-lg-6 col-md-8 col-12 mx-auto") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card z-index-0 fadeIn3 fadeInBottom") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header p-0 position-relative z-index-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("bg-primary shadow-primary border-radius-lg py-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("text-white font-weight-bolder text-center mt-2 ") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        role: ("form"),
        ...{ class: ("text-start") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("input-group input-group-outline my-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: ("email"),
        ...{ class: ("form-control") },
    });
    (__VLS_ctx.email);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("input-group input-group-outline mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: ("password"),
        ...{ class: ("form-control") },
    });
    (__VLS_ctx.password);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleLogin) },
        type: ("button"),
        ...{ class: ("btn bg-primary w-100 my-4 mb-2 text-white") },
    });
    if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger text-white") },
            role: ("alert"),
        });
        (__VLS_ctx.error);
    }
    ['container', 'my-5', 'row', 'col-lg-6', 'col-md-8', 'col-12', 'mx-auto', 'card', 'z-index-0', 'fadeIn3', 'fadeInBottom', 'card-header', 'p-0', 'position-relative', 'z-index-2', 'bg-primary', 'shadow-primary', 'border-radius-lg', 'py-3', 'text-white', 'font-weight-bolder', 'text-center', 'mt-2', 'row', 'card-body', 'text-start', 'input-group', 'input-group-outline', 'my-3', 'form-label', 'form-control', 'input-group', 'input-group-outline', 'mb-3', 'form-label', 'form-control', 'text-center', 'btn', 'bg-primary', 'w-100', 'my-4', 'mb-2', 'text-white', 'alert', 'alert-danger', 'text-white',];
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
