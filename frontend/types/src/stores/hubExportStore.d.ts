export interface HubNodeSummary {
    nodeKey: string;
    displayName: string;
    baseUrl: string;
    owningCenterKey: string | null;
}
export interface HubExportItem {
    id: number;
    resourceKind: 'video' | 'report';
    filename: string;
    anonymizationStatus: string;
    processedMediaPresent: boolean;
    sourceCenterKey: string | null;
    sourceCenterName: string | null;
    markedForUpload: boolean;
    outboundStatus: string;
    lastError: string;
    blockedReason?: string;
    lastTransferTimestamp: string | null;
    targetNodeKey: string | null;
    eligible: boolean;
    createdAt: string | null;
}
export type HubExportPrivacyStatus = 'pass' | 'warning' | 'unavailable';
export interface HubExportPrivacySummary {
    minK: number;
    eligibleResourceCount: number;
    eligibleCaseCount: number;
    markedResourceCount: number;
    smallestEquivalenceClassSize: number | null;
    violatingEquivalenceClassCount: number;
    passesKAnonymity: boolean;
    status: HubExportPrivacyStatus;
}
export interface HubExportOverviewResponse {
    selectedTargetNodeKey: string | null;
    sourceNodeKey: string | null;
    hubNodes: HubNodeSummary[];
    configReady: boolean;
    configError: string;
    privacySummary: HubExportPrivacySummary | null;
    items: HubExportItem[];
}
export declare const useHubExportStore: import("pinia").StoreDefinition<"hubExport", {
    loading: boolean;
    error: string | null;
    selectedTargetNodeKey: string | null;
    sourceNodeKey: string | null;
    hubNodes: HubNodeSummary[];
    items: HubExportItem[];
    configReady: boolean;
    configError: string;
    privacySummary: HubExportPrivacySummary | null;
}, {
    eligibleItems: (state: {
        loading: boolean;
        error: string | null;
        selectedTargetNodeKey: string | null;
        sourceNodeKey: string | null;
        hubNodes: {
            nodeKey: string;
            displayName: string;
            baseUrl: string;
            owningCenterKey: string | null;
        }[];
        items: {
            id: number;
            resourceKind: 'video' | 'report';
            filename: string;
            anonymizationStatus: string;
            processedMediaPresent: boolean;
            sourceCenterKey: string | null;
            sourceCenterName: string | null;
            markedForUpload: boolean;
            outboundStatus: string;
            lastError: string;
            blockedReason?: string | undefined;
            lastTransferTimestamp: string | null;
            targetNodeKey: string | null;
            eligible: boolean;
            createdAt: string | null;
        }[];
        configReady: boolean;
        configError: string;
        privacySummary: {
            minK: number;
            eligibleResourceCount: number;
            eligibleCaseCount: number;
            markedResourceCount: number;
            smallestEquivalenceClassSize: number | null;
            violatingEquivalenceClassCount: number;
            passesKAnonymity: boolean;
            status: HubExportPrivacyStatus;
        } | null;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        selectedTargetNodeKey: string | null;
        sourceNodeKey: string | null;
        hubNodes: HubNodeSummary[];
        items: HubExportItem[];
        configReady: boolean;
        configError: string;
        privacySummary: HubExportPrivacySummary | null;
    }>) => {
        id: number;
        resourceKind: 'video' | 'report';
        filename: string;
        anonymizationStatus: string;
        processedMediaPresent: boolean;
        sourceCenterKey: string | null;
        sourceCenterName: string | null;
        markedForUpload: boolean;
        outboundStatus: string;
        lastError: string;
        blockedReason?: string | undefined;
        lastTransferTimestamp: string | null;
        targetNodeKey: string | null;
        eligible: boolean;
        createdAt: string | null;
    }[];
    markedItems: (state: {
        loading: boolean;
        error: string | null;
        selectedTargetNodeKey: string | null;
        sourceNodeKey: string | null;
        hubNodes: {
            nodeKey: string;
            displayName: string;
            baseUrl: string;
            owningCenterKey: string | null;
        }[];
        items: {
            id: number;
            resourceKind: 'video' | 'report';
            filename: string;
            anonymizationStatus: string;
            processedMediaPresent: boolean;
            sourceCenterKey: string | null;
            sourceCenterName: string | null;
            markedForUpload: boolean;
            outboundStatus: string;
            lastError: string;
            blockedReason?: string | undefined;
            lastTransferTimestamp: string | null;
            targetNodeKey: string | null;
            eligible: boolean;
            createdAt: string | null;
        }[];
        configReady: boolean;
        configError: string;
        privacySummary: {
            minK: number;
            eligibleResourceCount: number;
            eligibleCaseCount: number;
            markedResourceCount: number;
            smallestEquivalenceClassSize: number | null;
            violatingEquivalenceClassCount: number;
            passesKAnonymity: boolean;
            status: HubExportPrivacyStatus;
        } | null;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        selectedTargetNodeKey: string | null;
        sourceNodeKey: string | null;
        hubNodes: HubNodeSummary[];
        items: HubExportItem[];
        configReady: boolean;
        configError: string;
        privacySummary: HubExportPrivacySummary | null;
    }>) => {
        id: number;
        resourceKind: 'video' | 'report';
        filename: string;
        anonymizationStatus: string;
        processedMediaPresent: boolean;
        sourceCenterKey: string | null;
        sourceCenterName: string | null;
        markedForUpload: boolean;
        outboundStatus: string;
        lastError: string;
        blockedReason?: string | undefined;
        lastTransferTimestamp: string | null;
        targetNodeKey: string | null;
        eligible: boolean;
        createdAt: string | null;
    }[];
}, {
    fetchOverview(targetNodeKey?: string | null): Promise<HubExportOverviewResponse>;
    markResources(resources: Array<{
        id: number;
        resourceKind: 'video' | 'report';
    }>): Promise<void>;
    unmarkResources(resources: Array<{
        id: number;
        resourceKind: 'video' | 'report';
    }>): Promise<void>;
}>;
