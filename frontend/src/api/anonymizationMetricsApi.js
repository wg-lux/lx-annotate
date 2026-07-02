import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
function hasFilterValue(value) {
    return value !== undefined && value !== null && value !== '';
}
export function buildAnonymizationMetricsQueryParams(filters = {}) {
    const params = {};
    if (hasFilterValue(filters.dateFrom))
        params.date_from = String(filters.dateFrom);
    if (hasFilterValue(filters.dateTo))
        params.date_to = String(filters.dateTo);
    if (hasFilterValue(filters.mediaType) && filters.mediaType !== 'all') {
        params.media_type = String(filters.mediaType);
    }
    if (hasFilterValue(filters.centerId))
        params.center_id = filters.centerId;
    if (hasFilterValue(filters.documentType))
        params.document_type = String(filters.documentType);
    if (hasFilterValue(filters.sourceSystem))
        params.source_system = String(filters.sourceSystem);
    return params;
}
function asRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return value;
}
function firstValue(record, keys) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(record, key)) {
            return record[key];
        }
    }
    return undefined;
}
function numberOrZero(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
function nullableNumber(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function sanitizeKey(value) {
    return String(value ?? 'unknown')
        .trim()
        .replace(/[^a-zA-Z0-9_:-]/g, '')
        .slice(0, 80) || 'unknown';
}
function sanitizeNumberRecord(value) {
    const record = asRecord(value);
    return Object.entries(record).reduce((acc, [key, count]) => {
        const safeKey = sanitizeKey(key);
        acc[safeKey] = numberOrZero(count);
        return acc;
    }, {});
}
function sanitizeFilters(value) {
    const record = asRecord(value);
    return {
        dateFrom: firstValue(record, ['dateFrom', 'date_from']),
        dateTo: firstValue(record, ['dateTo', 'date_to']),
        mediaType: firstValue(record, ['mediaType', 'media_type']),
        centerId: firstValue(record, ['centerId', 'center_id']),
        documentType: firstValue(record, ['documentType', 'document_type']),
        sourceSystem: firstValue(record, ['sourceSystem', 'source_system'])
    };
}
function sanitizeWorkflow(value) {
    const record = asRecord(value);
    return {
        pendingValidation: numberOrZero(firstValue(record, ['pendingValidation', 'pending_validation', 'pendingValidationCount'])),
        validated: numberOrZero(firstValue(record, ['validated', 'validatedCount', 'validated_count'])),
        failedLost: numberOrZero(firstValue(record, ['failedLost', 'failed_lost', 'failedLostCount', 'failed_lost_count'])),
        medianTimeToValidationSeconds: nullableNumber(firstValue(record, [
            'medianTimeToValidationSeconds',
            'median_time_to_validation_seconds',
            'medianTimeToValidation',
            'median_time_to_validation'
        ])),
        totalsByAnonymizationStatus: sanitizeNumberRecord(firstValue(record, [
            'totalsByAnonymizationStatus',
            'totals_by_anonymization_status',
            'anonymizationStatusTotals',
            'anonymization_status_totals'
        ])),
        totalsByValidationStatus: sanitizeNumberRecord(firstValue(record, [
            'totalsByValidationStatus',
            'totals_by_validation_status',
            'validationStatusTotals',
            'validation_status_totals'
        ]))
    };
}
function sanitizeFieldQuality(value) {
    const rawRows = Array.isArray(value)
        ? value
        : Object.entries(asRecord(value)).map(([fieldName, metric]) => ({
            fieldName,
            ...(asRecord(metric))
        }));
    return rawRows.map((row) => {
        const record = asRecord(row);
        return {
            fieldName: sanitizeKey(firstValue(record, ['fieldName', 'field_name'])),
            support: numberOrZero(firstValue(record, ['support', 'count'])),
            changedRate: nullableNumber(firstValue(record, ['changedRate', 'changed_rate'])),
            exactMatchRate: nullableNumber(firstValue(record, ['exactMatchRate', 'exact_match_rate'])),
            meanSimilarity: nullableNumber(firstValue(record, ['meanSimilarity', 'mean_similarity'])),
            missingAfterValidationCount: numberOrZero(firstValue(record, ['missingAfterValidationCount', 'missing_after_validation_count']))
        };
    });
}
function sanitizePhiRegions(value) {
    const record = asRecord(value);
    return {
        proposalCount: numberOrZero(firstValue(record, ['proposalCount', 'proposal_count'])),
        humanAnnotationCount: numberOrZero(firstValue(record, ['humanAnnotationCount', 'human_annotation_count'])),
        matchedCount: numberOrZero(firstValue(record, ['matchedCount', 'matched_count'])),
        precision: nullableNumber(firstValue(record, ['precision'])),
        recall: nullableNumber(firstValue(record, ['recall']))
    };
}
export function sanitizeAnonymizationMetricsResponse(payload) {
    const record = asRecord(payload);
    return {
        schemaVersion: String(firstValue(record, ['schemaVersion', 'schema_version']) ?? '1'),
        filters: sanitizeFilters(firstValue(record, ['filters'])),
        workflow: sanitizeWorkflow(firstValue(record, ['workflow'])),
        fieldQuality: sanitizeFieldQuality(firstValue(record, ['fieldQuality', 'field_quality'])),
        phiRegions: sanitizePhiRegions(firstValue(record, ['phiRegions', 'phi_regions']))
    };
}
export async function fetchAnonymizationMetrics(filters = {}) {
    const { data } = await axiosInstance.get(r(endpoints.media.anonymizationMetrics), {
        params: buildAnonymizationMetricsQueryParams(filters)
    });
    return sanitizeAnonymizationMetricsResponse(data);
}
