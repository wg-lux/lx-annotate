declare const _default: import("vue").DefineComponent<{}, {}, {
    staticUrl: string;
    isSidebarOpen: boolean;
    pendingValidationCount: number;
    processingCount: number;
    workflowCountsInterval: null;
}, {
    logoSrc(): string;
    isAnonymizationOverviewRoute(): boolean;
    isAnonymizationValidationRoute(): boolean;
    isReportingRoute(): boolean;
    isReportingCaseSetupRoute(): boolean;
    lastValidationTo(): "/anonymisierung/validierung" | {
        path: string;
        query: {
            fileId: string;
            mediaType: string;
        };
    };
}, {
    toggleSidebar(): void;
    closeSidebar(): void;
    openSidebar(): void;
    refreshWorkflowCounts(): Promise<void>;
    handleToggleSidebarEvent(): void;
    handleWindowResize(): void;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
