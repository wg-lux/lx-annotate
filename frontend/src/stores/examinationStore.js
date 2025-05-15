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
import { defineStore } from 'pinia';
import { reactive, ref } from 'vue'; // reactive importiert
import axiosInstance, { r } from '@/api/axiosInstance';
// --- Store ---
export var useExaminationStore = defineStore('examination', function () {
    // state: map examinationId -> fetched subcategories
    var categoriesByExam = reactive({}); // Geändert zu reactive
    var morphologyClassifications = ref([]); // NEUER Zustand
    var lastFetchToken = ref(null);
    var loading = ref(false);
    var error = ref(null);
    // Fetch all subcategories for a given examination type
    function fetchSubcategoriesForExam(examId) {
        return __awaiter(this, void 0, void 0, function () {
            var token, _a, morphRes, locRes, intRes, instRes, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        token = Symbol();
                        lastFetchToken.value = token;
                        error.value = null;
                        loading.value = true;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, Promise.all([
                                axiosInstance.get(r("examination/".concat(examId, "/morphology-classification-choices/"))),
                                axiosInstance.get(r("examination/".concat(examId, "/location-classification-choices/"))),
                                axiosInstance.get(r("examination/".concat(examId, "/interventions/"))),
                                axiosInstance.get(r("examination/".concat(examId, "/instruments/"))),
                            ])];
                    case 2:
                        _a = _b.sent(), morphRes = _a[0], locRes = _a[1], intRes = _a[2], instRes = _a[3];
                        // Abbruch, falls ein anderer Request in der Zwischenzeit gestartet wurde
                        if (lastFetchToken.value !== token)
                            return [2 /*return*/];
                        // Direkte Zuweisung für reaktives Objekt
                        categoriesByExam[examId] = {
                            morphologyChoices: morphRes.data,
                            locationChoices: locRes.data,
                            interventions: intRes.data,
                            instruments: instRes.data,
                        };
                        return [3 /*break*/, 5];
                    case 3:
                        err_1 = _b.sent();
                        console.error('Error fetching subcategories:', err_1);
                        // Narrowing des Fehlerobjekts eventuell hier hinzufügen
                        error.value = (err_1 instanceof Error ? err_1.message : 'Failed to load subcategories');
                        return [3 /*break*/, 5];
                    case 4:
                        loading.value = false;
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    // NEUE Funktion zum Laden der übergeordneten Morphologie-Klassifikationen
    function fetchMorphologyClassifications() {
        return __awaiter(this, void 0, void 0, function () {
            var response, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axiosInstance.get(r('get-morphology-choices/'))];
                    case 1:
                        response = _a.sent();
                        morphologyClassifications.value = response.data;
                        return [3 /*break*/, 3];
                    case 2:
                        err_2 = _a.sent();
                        console.error('Error fetching morphology classifications:', err_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
    function fetchLocationClassifications(examId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axiosInstance.get(r("get-location-choices/".concat(examId, "/")))];
                    case 1:
                        response = _a.sent();
                        // Initialize map if it doesn’t exist
                        if (!categoriesByExam[examId]) {
                            categoriesByExam[examId] = {
                                morphologyChoices: [],
                                locationChoices: [],
                                interventions: [],
                                instruments: [],
                            };
                        }
                        categoriesByExam[examId].locationChoices = response.data;
                        return [3 /*break*/, 3];
                    case 2:
                        err_3 = _a.sent();
                        console.error('Error fetching location classifications:', err_3);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
    function fetchMorphologyChoices(examId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, err_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axiosInstance.get(r("get-morphology-choices/".concat(examId, "/")))];
                    case 1:
                        response = _a.sent();
                        if (!categoriesByExam[examId]) {
                            categoriesByExam[examId] = {
                                morphologyChoices: [],
                                locationChoices: [],
                                interventions: [],
                                instruments: [],
                            };
                        }
                        categoriesByExam[examId].morphologyChoices = response.data;
                        return [3 /*break*/, 3];
                    case 2:
                        err_4 = _a.sent();
                        console.error('Error fetching morphology classifications:', err_4);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
    // Getter: retrieve map or empty defaults
    function getCategories(examId) {
        // Zugriff auf reaktives Objekt angepasst
        return categoriesByExam[examId] || {
            morphologyChoices: [],
            locationChoices: [],
            interventions: [],
            instruments: [],
        };
    }
    return {
        categoriesByExam: categoriesByExam,
        loading: loading,
        error: error,
        fetchSubcategoriesForExam: fetchSubcategoriesForExam,
        getCategories: getCategories,
        morphologyClassifications: morphologyClassifications,
        fetchMorphologyClassifications: fetchMorphologyClassifications,
        fetchLocationClassifications: fetchLocationClassifications,
        fetchMorphologyChoices: fetchMorphologyChoices,
    };
});
