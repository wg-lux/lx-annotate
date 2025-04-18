import keycloak from '@/services/keycloak';
export default (await import('vue')).defineComponent({
    name: 'AuthCheck',
    data: function () {
        return {
            isAuthenticated: false
        };
    },
    created: function () {
        var _this = this;
        this.isAuthenticated = keycloak.authenticated || false;
        // Event-Listener für Authentifizierungsänderungen
        keycloak.onAuthSuccess = function () {
            _this.isAuthenticated = true;
        };
        keycloak.onAuthLogout = function () {
            _this.isAuthenticated = false;
        };
        keycloak.onAuthRefreshSuccess = function () {
            _this.isAuthenticated = true;
        };
        keycloak.onAuthRefreshError = function () {
            _this.isAuthenticated = false;
        };
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.isAuthenticated) {
        var __VLS_0 = {};
    }
    else {
        var __VLS_1 = {};
    }
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
