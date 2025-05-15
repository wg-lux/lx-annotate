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
/* src/stores/anonymizationStore.ts */
import { defineStore } from 'pinia';
import axiosInstance, { a, r } from '@/api/axiosInstance';
import axios from 'axios';
/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
export var useAnonymizationStore = defineStore('anonymization', {
    state: function () { return ({
        anonymizationStatus: 'idle',
        loading: false,
        error: null,
        pending: [], // Beachte: pending verwendet jetzt auch PatientData mit SensitiveMetaApiResponse
        current: null
    }); },
    getters: {
        getCurrentItem: function (state) { return state.current; },
    },
    actions: {
        /** Holt den nächsten PDF-Datensatz + zugehöriges SensitiveMeta
         *  und fügt beides zusammen. */
        fetchNext: function (lastId) {
            return __awaiter(this, void 0, void 0, function () {
                var pdfUrl, pdf, metaUrl, metaResponse, merged, err_1;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            this.loading = true;
                            this.error = null;
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 4, 5, 6]);
                            pdfUrl = lastId
                                ? a("anony_text/?last_id=".concat(lastId))
                                : a('anony_text/');
                            return [4 /*yield*/, axiosInstance.get(pdfUrl)];
                        case 2:
                            pdf = (_e.sent()).data;
                            if (!(pdf === null || pdf === void 0 ? void 0 : pdf.id)) {
                                this.$patch({ current: null });
                                throw new Error('Backend lieferte keinen gültigen PDF-Datensatz.');
                            }
                            if (pdf.error) {
                                this.$patch({ current: null });
                                throw new Error('Backend meldet Fehler-Flag im PDF-Datensatz.');
                            }
                            metaUrl = a("sensitivemeta/?id=".concat(pdf.sensitive_meta_id));
                            console.log("Fetching sensitive meta from: ".concat(metaUrl));
                            return [4 /*yield*/, axiosInstance.get(metaUrl)];
                        case 3:
                            metaResponse = (_e.sent()).data;
                            console.log('Received sensitive meta response data:', metaResponse);
                            if (typeof (metaResponse === null || metaResponse === void 0 ? void 0 : metaResponse.id) !== 'number') {
                                console.error('Received invalid sensitive meta data structure:', metaResponse);
                                this.$patch({ current: null });
                                throw new Error('Ungültige Metadaten vom Backend empfangen (keine gültige ID gefunden).');
                            }
                            merged = __assign(__assign({}, pdf), { report_meta: metaResponse });
                            console.log('Merged data:', merged);
                            this.$patch({
                                current: merged
                            });
                            return [2 /*return*/, merged];
                        case 4:
                            err_1 = _e.sent();
                            console.error('Error in fetchNext:', err_1);
                            // Detailliertere Fehlermeldung, falls Axios-Fehler
                            if (axios.isAxiosError(err_1)) {
                                console.error('Axios error details:', (_a = err_1.response) === null || _a === void 0 ? void 0 : _a.status, (_b = err_1.response) === null || _b === void 0 ? void 0 : _b.data);
                                this.error = "Fehler beim Laden der Metadaten (".concat((_c = err_1.response) === null || _c === void 0 ? void 0 : _c.status, "): ").concat(err_1.message);
                            }
                            else {
                                this.error = (_d = err_1 === null || err_1 === void 0 ? void 0 : err_1.message) !== null && _d !== void 0 ? _d : 'Unbekannter Fehler beim Laden.';
                            }
                            this.$patch({ current: null });
                            return [2 /*return*/, null];
                        case 5:
                            this.loading = false;
                            return [7 /*endfinally*/];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        },
        /* ---------------------------------------------------------------- */
        /* Update-Methoden                                                  */
        /* ---------------------------------------------------------------- */
        patchPdf: function (payload) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!payload.id)
                        throw new Error('patchPdf: id fehlt im Payload.');
                    console.log('Patching PDF with payload:', payload); // Logge Payload
                    return [2 /*return*/, axiosInstance.patch(a('update_anony_text/'), payload)];
                });
            });
        },
        patchVideo: function (payload) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, axiosInstance.patch(r('video/update_sensitivemeta/'), payload)];
                });
            });
        },
        fetchPendingAnonymizations: function () {
            return this.pending;
        }
    }
});
