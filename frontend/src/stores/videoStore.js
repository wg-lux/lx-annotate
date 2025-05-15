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
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axiosInstance, { r } from '../api/axiosInstance';
import videoAxiosInstance from '../api/videoAxiosInstance';
var translationMap = {
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
    wound: 'Wunde',
};
// Optional: default segments per label if needed at startup
var defaultSegments = Object.keys(translationMap).reduce(function (acc, key) {
    acc[key] = [
        {
            id: "default-".concat(key),
            label: key,
            label_display: translationMap[key],
            startTime: 0,
            endTime: 0,
            avgConfidence: 1,
        },
    ];
    return acc;
}, {});
export var useVideoStore = defineStore('video', function () {
    // State
    var currentVideo = ref(null);
    var errorMessage = ref('');
    var videoUrl = ref('');
    // Store segments keyed by label
    var segmentsByLabel = ref(__assign({}, defaultSegments));
    var videoList = ref({ videos: [], labels: [] });
    var videoMeta = ref(null);
    var hasVideo = computed(function () { return !!currentVideo.value; });
    var duration = computed(function () {
        if (videoMeta.value && videoMeta.value.duration) {
            return videoMeta.value.duration;
        }
        return 0; // Default value if duration is not available
    });
    function fetchAllVideos() {
        axiosInstance
            .get(r('videos/'))
            .then(function (response) {
            videoList.value = {
                videos: response.data.videos.map(function (video) { return ({
                    id: parseInt(video.id),
                    originalFileName: video.originalFileName,
                    status: video.status || 'available', // Default-Status falls nicht vorhanden
                    assignedUser: null, // Default-Wert für assignedUser
                    anonymized: video.anonymized || false // Default-Wert für anonymized ist false
                }); }),
                labels: response.data.labels.map(function (label) { return ({
                    id: parseInt(label.id),
                    name: label.name,
                }); }),
            };
            console.log("Fetched videos:", videoList.value);
        })
            .catch(function (error) {
            console.error('Error loading videos:', error);
        });
    }
    // A computed property to combine all segments (if needed for timeline display)
    var allSegments = computed(function () {
        return Object.values(segmentsByLabel.value).flat();
    });
    // Actions
    function clearVideo() {
        currentVideo.value = null;
    }
    function setVideo(video) {
        currentVideo.value = video;
    }
    function fetchVideoUrl() {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_1, axiosError;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, videoAxiosInstance.get(((_a = currentVideo.value) === null || _a === void 0 ? void 0 : _a.id) || '1', { headers: { 'Accept': 'application/json' } })];
                    case 1:
                        response = _c.sent();
                        if (response.data.videoUrl) {
                            videoUrl.value = response.data.videoUrl;
                            console.log("Fetched video URL:", videoUrl.value);
                        }
                        else {
                            console.warn("No video URL returned; waiting for upload.");
                            errorMessage.value = "Invalid video response received.";
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _c.sent();
                        axiosError = error_1;
                        console.error("Error loading video:", ((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data) || axiosError.message);
                        errorMessage.value = "Error loading video. Please check the API endpoint or try again later.";
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
    // Fetch segments for a specific label and store them under that label key.
    function fetchSegmentsByLabel(id_1) {
        return __awaiter(this, arguments, void 0, function (id, label) {
            var response_1, segmentsForLabel, error_2, axiosError;
            var _a;
            if (label === void 0) { label = 'outside'; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axiosInstance.get(r("video/".concat(id, "/label/").concat(label, "/")), { headers: { 'Accept': 'application/json' } })];
                    case 1:
                        response_1 = _b.sent();
                        segmentsForLabel = response_1.data.time_segments.map(function (segment, index) { return ({
                            id: "".concat(label, "-segment").concat(index + 1),
                            label: response_1.data.label, // or simply use the passed label
                            label_display: getTranslationForLabel(response_1.data.label),
                            startTime: segment.start_time,
                            endTime: segment.end_time,
                            avgConfidence: 1, // Default value since API doesn't provide it.
                        }); });
                        segmentsByLabel.value[label] = segmentsForLabel;
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _b.sent();
                        axiosError = error_2;
                        console.error("Error loading segments for label " + label + ":", ((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) || axiosError.message);
                        errorMessage.value = "Error loading segments for label ".concat(label, ". Please check the API endpoint or try again later.");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
    // Optionally, fetch segments for all labels concurrently.
    function fetchAllSegments(id) {
        return __awaiter(this, void 0, void 0, function () {
            var labels;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        labels = Object.keys(translationMap);
                        return [4 /*yield*/, Promise.all(labels.map(function (label) { return fetchSegmentsByLabel(id, label); }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function fetchVideoMeta(id) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, err_1, axiosErr;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axiosInstance.get(r("video/".concat(id, "/")), { headers: { 'Accept': 'application/json' } })];
                    case 1:
                        resp = _b.sent();
                        videoMeta.value = {
                            id: resp.data.id,
                            originalFileName: resp.data.originalFileName,
                            file: resp.data.file,
                            videoUrl: resp.data.videoUrl,
                            fullVideoPath: resp.data.fullVideoPath,
                            sensitiveMetaId: resp.data.sensitiveMetaId,
                            patientFirstName: resp.data.patientFirstName,
                            patientLastName: resp.data.patientLastName,
                            patientDob: resp.data.patientDob,
                            examinationDate: resp.data.examinationDate,
                            duration: resp.data.duration,
                        };
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _b.sent();
                        axiosErr = err_1;
                        console.error('Error fetching video meta:', ((_a = axiosErr.response) === null || _a === void 0 ? void 0 : _a.data) || axiosErr.message);
                        errorMessage.value = 'Could not load video metadata.';
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
    function saveAnnotations() {
        return __awaiter(this, void 0, void 0, function () {
            var combinedSegments, response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        combinedSegments = Object.values(segmentsByLabel.value).flat();
                        return [4 /*yield*/, axiosInstance.post(r('annotations/'), { segments: combinedSegments })];
                    case 1:
                        response = _a.sent();
                        console.log('Annotations saved:', response.data);
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        console.error('Error saving annotations:', error_3);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
    function getSegmentStyle(segment, duration) {
        if (segment.startTime < 0) {
            throw new Error('Startpunkt des Segments ist ungültig.');
        }
        if (segment.endTime > duration) {
            throw new Error('Endzeitpunkt des Segments ist ungültig.');
        }
        if (segment.endTime < segment.startTime) {
            throw new Error('Endzeitpunkt des Segments ist vor dem Startzeitpunkt.');
        }
        var leftPercentage = (segment.startTime / duration) * 100;
        var widthPercentage = ((segment.endTime - segment.startTime) / duration) * 100;
        return {
            position: 'absolute',
            left: "".concat(leftPercentage, "%"),
            width: "".concat(widthPercentage, "%"),
            backgroundColor: getColorForLabel(segment.label),
        };
    }
    function updateSegment(id, partial) {
        var labelKeys = Object.keys(segmentsByLabel.value);
        for (var _i = 0, labelKeys_1 = labelKeys; _i < labelKeys_1.length; _i++) {
            var label = labelKeys_1[_i];
            var segmentIndex = segmentsByLabel.value[label].findIndex(function (s) { return s.id === id; });
            if (segmentIndex !== -1) {
                segmentsByLabel.value[label][segmentIndex] = __assign(__assign({}, segmentsByLabel.value[label][segmentIndex]), partial);
                break;
            }
        }
    }
    function updateSensitiveMeta(payload) {
        return __awaiter(this, void 0, void 0, function () {
            var body, err_2, axiosErr;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        body = {
                            sensitiveMetaId: payload.sensitiveMetaId,
                            patientFirstName: payload.patientFirstName,
                            patientLastName: payload.patientLastName,
                            patientDob: payload.patientDob,
                            examinationDate: payload.examinationDate,
                        };
                        return [4 /*yield*/, axiosInstance.put(r("sensitive-meta/".concat(payload.sensitiveMetaId, "/")), body, { headers: { 'Content-Type': 'application/json' } })];
                    case 1:
                        _b.sent();
                        // Reflect changes locally
                        if (videoMeta.value && videoMeta.value.sensitiveMetaId === payload.sensitiveMetaId) {
                            videoMeta.value = __assign(__assign({}, videoMeta.value), { patientFirstName: payload.patientFirstName, patientLastName: payload.patientLastName, patientDob: payload.patientDob, examinationDate: payload.examinationDate });
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        err_2 = _b.sent();
                        axiosErr = err_2;
                        console.error('Error updating sensitive meta:', ((_a = axiosErr.response) === null || _a === void 0 ? void 0 : _a.data) || axiosErr.message);
                        errorMessage.value = 'Could not update patient information.';
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
    function clearVideoMeta() {
        videoMeta.value = null;
        errorMessage.value = '';
    }
    function getColorForLabel(label) {
        var colorMap = {
            appendix: '#ff9800',
            blood: '#f44336',
            diverticule: '#9c27b0',
            grasper: '#CBEDCA',
            ileocaecalvalve: '#3f51b5',
            ileum: '#2196f3',
            low_quality: '#9e9e9e',
            nbi: '#795548',
            needle: '#e91e63',
            outside: '#00bcd4',
            polyp: '#8bc34a',
            snare: '#ff5722',
            water_jet: '#03a9f4',
            wound: '#607d8b',
        };
        return colorMap[label] || '#757575';
    }
    function getTranslationForLabel(label) {
        return translationMap[label] || label;
    }
    function jumpToSegment(segment, videoElement) {
        if (videoElement) {
            videoElement.currentTime = segment.startTime;
        }
    }
    function updateVideoStatus(status) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!currentVideo.value) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        currentVideo.value.status = status;
                        return [4 /*yield*/, axiosInstance.post(r("video/".concat(currentVideo.value.id, "/status/")), {
                                status: status
                            })];
                    case 2:
                        response = _a.sent();
                        console.log("Video-Status aktualisiert: ".concat(status), response.data);
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        console.error('Fehler beim Aktualisieren des Video-Status:', error_4);
                        errorMessage.value = 'Fehler beim Aktualisieren des Video-Status.';
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function assignUserToVideo(user) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!currentVideo.value) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        currentVideo.value.assignedUser = user;
                        return [4 /*yield*/, axiosInstance.post(r("video/".concat(currentVideo.value.id, "/assign/")), {
                                user: user
                            })];
                    case 2:
                        response = _a.sent();
                        console.log("Benutzer ".concat(user, " wurde dem Video zugewiesen."), response.data);
                        return [3 /*break*/, 4];
                    case 3:
                        error_5 = _a.sent();
                        console.error('Fehler bei der Benutzerzuweisung:', error_5);
                        errorMessage.value = 'Fehler bei der Benutzerzuweisung.';
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    var uploadRevert = function (uniqueFileId, load, error) {
        axiosInstance
            .delete(r("upload-video/".concat(uniqueFileId, "/")))
            .then(function () {
            videoUrl.value = '';
            load();
        });
    };
    var uploadProcess = function (fieldName, file, metadata, load, error) {
        var formData = new FormData();
        formData.append(fieldName, file);
        axiosInstance
            .post(r('upload-video/'), formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
            .then(function (response) {
            var url = response.data.videoUrl;
            videoUrl.value = url;
            load(url); // Pass the URL as the server id
        })
            .catch(function (err) {
            error("Upload failed");
        });
    };
    // Return state and actions for consumption in components
    return {
        currentVideo: currentVideo,
        errorMessage: errorMessage,
        videoUrl: videoUrl,
        segmentsByLabel: segmentsByLabel,
        allSegments: allSegments,
        videoList: videoList,
        videoMeta: videoMeta,
        hasVideo: hasVideo,
        duration: duration,
        fetchVideoMeta: fetchVideoMeta,
        updateSensitiveMeta: updateSensitiveMeta,
        clearVideoMeta: clearVideoMeta,
        fetchAllVideos: fetchAllVideos,
        uploadRevert: uploadRevert,
        uploadProcess: uploadProcess,
        clearVideo: clearVideo,
        setVideo: setVideo,
        fetchVideoUrl: fetchVideoUrl,
        fetchSegmentsByLabel: fetchSegmentsByLabel,
        fetchAllSegments: fetchAllSegments,
        saveAnnotations: saveAnnotations,
        getSegmentStyle: getSegmentStyle,
        getColorForLabel: getColorForLabel,
        getTranslationForLabel: getTranslationForLabel,
        jumpToSegment: jumpToSegment,
        updateVideoStatus: updateVideoStatus,
        assignUserToVideo: assignUserToVideo,
        updateSegment: updateSegment,
    };
});
