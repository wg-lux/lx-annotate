import type { Report, Annotation } from '@/types/reports';
export declare const useReportStore: import("pinia").StoreDefinition<"report", import("pinia")._UnwrapAll<Pick<{
    reports: import("vue").Ref<{
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    }[], Report[] | {
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    }[]>;
    currentReport: import("vue").Ref<{
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    } | null, Report | {
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    } | null>;
    annotations: import("vue").Ref<{
        id: number;
        reportId: number;
        type: "highlight" | "note" | "tag";
        content: string;
        position: {
            page?: number | undefined;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
        };
        createdAt: string;
        updatedAt: string;
        userId: number;
    }[], Annotation[] | {
        id: number;
        reportId: number;
        type: "highlight" | "note" | "tag";
        content: string;
        position: {
            page?: number | undefined;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
        };
        createdAt: string;
        updatedAt: string;
        userId: number;
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    hasReports: import("vue").ComputedRef<boolean>;
    currentReportFileType: import("vue").ComputedRef<string>;
    fetchReports: () => Promise<void>;
    fetchReportById: (id: number, withSecureUrl?: boolean) => Promise<Report>;
    fetchReportAnnotations: (reportId: number) => Promise<Annotation[]>;
    createAnnotation: (annotationData: any) => Promise<Annotation>;
    setCurrentReport: (report: Report | null) => void;
    clearError: () => void;
    reset: () => void;
}, "loading" | "error" | "annotations" | "reports" | "currentReport">>, Pick<{
    reports: import("vue").Ref<{
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    }[], Report[] | {
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    }[]>;
    currentReport: import("vue").Ref<{
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    } | null, Report | {
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    } | null>;
    annotations: import("vue").Ref<{
        id: number;
        reportId: number;
        type: "highlight" | "note" | "tag";
        content: string;
        position: {
            page?: number | undefined;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
        };
        createdAt: string;
        updatedAt: string;
        userId: number;
    }[], Annotation[] | {
        id: number;
        reportId: number;
        type: "highlight" | "note" | "tag";
        content: string;
        position: {
            page?: number | undefined;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
        };
        createdAt: string;
        updatedAt: string;
        userId: number;
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    hasReports: import("vue").ComputedRef<boolean>;
    currentReportFileType: import("vue").ComputedRef<string>;
    fetchReports: () => Promise<void>;
    fetchReportById: (id: number, withSecureUrl?: boolean) => Promise<Report>;
    fetchReportAnnotations: (reportId: number) => Promise<Annotation[]>;
    createAnnotation: (annotationData: any) => Promise<Annotation>;
    setCurrentReport: (report: Report | null) => void;
    clearError: () => void;
    reset: () => void;
}, "hasReports" | "currentReportFileType">, Pick<{
    reports: import("vue").Ref<{
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    }[], Report[] | {
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    }[]>;
    currentReport: import("vue").Ref<{
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    } | null, Report | {
        id: number;
        anonymizedText: string;
        status: "pending" | "completed" | "failed";
        reportMeta: {
            patientFirstName: string;
            patientLastName: string;
            patientGender: number;
            patientDob: string;
            examinationDate: string;
        };
        fileType: string;
        secureFileUrl: {
            url: string;
            expiresAt: string;
            fileType: string;
            originalFilename: string;
            fileSize: number;
        };
    } | null>;
    annotations: import("vue").Ref<{
        id: number;
        reportId: number;
        type: "highlight" | "note" | "tag";
        content: string;
        position: {
            page?: number | undefined;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
        };
        createdAt: string;
        updatedAt: string;
        userId: number;
    }[], Annotation[] | {
        id: number;
        reportId: number;
        type: "highlight" | "note" | "tag";
        content: string;
        position: {
            page?: number | undefined;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
        };
        createdAt: string;
        updatedAt: string;
        userId: number;
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    hasReports: import("vue").ComputedRef<boolean>;
    currentReportFileType: import("vue").ComputedRef<string>;
    fetchReports: () => Promise<void>;
    fetchReportById: (id: number, withSecureUrl?: boolean) => Promise<Report>;
    fetchReportAnnotations: (reportId: number) => Promise<Annotation[]>;
    createAnnotation: (annotationData: any) => Promise<Annotation>;
    setCurrentReport: (report: Report | null) => void;
    clearError: () => void;
    reset: () => void;
}, "reset" | "clearError" | "createAnnotation" | "fetchReports" | "fetchReportById" | "fetchReportAnnotations" | "setCurrentReport">>;
