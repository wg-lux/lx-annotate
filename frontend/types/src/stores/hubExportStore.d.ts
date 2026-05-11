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
export interface HubExportOverviewResponse {
    selectedTargetNodeKey: string | null;
    sourceNodeKey: string | null;
    hubNodes: HubNodeSummary[];
    configReady: boolean;
    configError: string;
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
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        selectedTargetNodeKey: string | null;
        sourceNodeKey: string | null;
        hubNodes: HubNodeSummary[];
        items: HubExportItem[];
        configReady: boolean;
        configError: string;
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
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        selectedTargetNodeKey: string | null;
        sourceNodeKey: string | null;
        hubNodes: HubNodeSummary[];
        items: HubExportItem[];
        configReady: boolean;
        configError: string;
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
