import axiosInstance from '@/api/axiosInstance';
import { extractFindingId } from '@/api/findings.contract';
import { findingsApi } from '@/api/findingsApi';
const REPORT_TEMPLATE_BASE = '/base_api/report-templates';
function isRecordLike(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function asString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function asBoolean(value) {
    return !!value;
}
function asNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function asStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => asString(entry))
        .filter((entry) => entry !== null);
}
function normalizeKey(value) {
    return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}
function titleFromSectionName(name) {
    return name
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
function normalizeClassifications(classifications) {
    if (!Array.isArray(classifications))
        return [];
    return classifications
        .filter((classification) => isRecordLike(classification))
        .map((classification) => ({
        classification: asString(classification.classification) || '',
        required: asBoolean(classification.required)
    }))
        .filter((classification) => !!classification.classification);
}
function normalizeFindings(findings) {
    if (!Array.isArray(findings))
        return [];
    return findings
        .map((entry) => normalizeReportTemplateFinding(entry))
        .filter((entry) => entry !== null);
}
function normalizeReportTemplateFinding(entry) {
    if (typeof entry === 'string') {
        return {
            finding: entry,
            required: false,
            multipleAllowed: false,
            classifications: []
        };
    }
    if (!isRecordLike(entry))
        return null;
    const finding = asString(entry.finding);
    if (!finding)
        return null;
    return {
        finding,
        required: asBoolean(entry.required),
        multipleAllowed: asBoolean(entry.multipleAllowed ?? entry.multiple_allowed),
        classifications: normalizeClassifications(entry.classifications)
    };
}
function normalizeSections(sections) {
    if (!Array.isArray(sections))
        return [];
    return sections
        .filter((section) => isRecordLike(section))
        .map((section) => ({
        name: asString(section.name) || '',
        position: asNumber(section.position) ?? 0,
        types: asStringArray(section.types),
        findings: normalizeFindings(section.findings)
    }))
        .filter((section) => !!section.name)
        .sort((a, b) => a.position - b.position);
}
function normalizeConditionClause(input) {
    const classification = asString(input.classification);
    const comparator = asString(input.comparator);
    if (!classification || !comparator)
        return null;
    return {
        classification,
        comparator,
        ...(input.value !== undefined ? { value: input.value } : {}),
        ...(Array.isArray(input.values) ? { values: input.values } : {})
    };
}
function normalizeCondition(input) {
    if (!isRecordLike(input))
        return null;
    const rawThenRequires = Array.isArray(input.thenRequires ?? input.then_requires)
        ? (input.thenRequires ?? input.then_requires)
        : [];
    const any = Array.isArray(input.any)
        ? input.any
            .filter((entry) => isRecordLike(entry))
            .map(normalizeConditionClause)
            .filter((entry) => entry !== null)
        : [];
    const all = Array.isArray(input.all)
        ? input.all
            .filter((entry) => isRecordLike(entry))
            .map(normalizeConditionClause)
            .filter((entry) => entry !== null)
        : [];
    const thenRequires = rawThenRequires
        .filter((entry) => isRecordLike(entry))
        .map((entry) => ({ classification: asString(entry.classification) || '' }))
        .filter((entry) => !!entry.classification);
    if (!any.length && !all.length && !thenRequires.length)
        return null;
    return { any, all, thenRequires };
}
function normalizeQuery(input, fallbackFinding) {
    if (!isRecordLike(input)) {
        return {
            finding: fallbackFinding || null,
            operator: null,
            params: {},
            condition: null
        };
    }
    const operator = asString(input.operator);
    return {
        finding: asString(input.finding) || fallbackFinding || null,
        operator,
        params: isRecordLike(input.params) ? input.params : {},
        condition: normalizeCondition(input.condition)
    };
}
function findRelatedSections(findingName, sections) {
    if (!findingName)
        return [];
    const target = normalizeKey(findingName);
    return sections
        .filter((section) => section.findings.some((finding) => normalizeKey(finding.finding) === target))
        .map((section) => section.name);
}
function buildFindingValidatorSummary(validator) {
    if (validator.operator === 'exists') {
        return `Befund "${validator.finding}" muss vorhanden sein.`;
    }
    if (validator.operator === 'missing') {
        return `Befund "${validator.finding}" darf nicht vorhanden sein.`;
    }
    const condition = validator.query.condition;
    if (!condition) {
        return `Bedingte Prüfung für "${validator.finding}".`;
    }
    const clauses = [...condition.any, ...condition.all].map((clause) => {
        const right = Array.isArray(clause.values)
            ? clause.values.join(', ')
            : clause.value !== undefined
                ? String(clause.value)
                : 'gesetzt';
        return `${clause.classification} ${clause.comparator} ${right}`;
    });
    const required = validator.requiredClassifications.length
        ? `Dann erforderlich: ${validator.requiredClassifications.join(', ')}.`
        : '';
    return `Wenn "${validator.finding}" die Bedingung erfüllt (${clauses.join(' oder ')}), ${required}`.trim();
}
function normalizeFindingValidator(input, sections) {
    if (typeof input === 'string') {
        return {
            kind: 'finding',
            name: input,
            finding: input,
            operator: 'exists',
            query: {
                finding: input,
                operator: 'exists',
                params: {},
                condition: null
            },
            summary: `Validator "${input}"`,
            relatedSections: [],
            relatedFindings: [input],
            requiredClassifications: []
        };
    }
    if (!isRecordLike(input))
        return null;
    const name = asString(input.name);
    const finding = asString(input.finding) || asString(input.query?.finding);
    const operator = (asString(input.operator) || asString(input.query?.operator));
    if (!name || !finding || !operator)
        return null;
    const query = normalizeQuery(input.query, finding);
    const requiredClassifications = query.condition?.thenRequires.map((entry) => entry.classification) || [];
    const relatedSections = findRelatedSections(finding, sections);
    const validator = {
        kind: 'finding',
        name,
        finding,
        operator,
        query,
        summary: '',
        relatedSections,
        relatedFindings: [finding],
        requiredClassifications
    };
    validator.summary = buildFindingValidatorSummary(validator);
    return validator;
}
function buildExaminationValidatorSummary(findingValidators, examinationValidators) {
    const parts = [];
    if (findingValidators.length) {
        parts.push(`abhängig von ${findingValidators.length} Finding-Validator(en)`);
    }
    if (examinationValidators.length) {
        parts.push(`abhängig von ${examinationValidators.length} Examination-Validator(en)`);
    }
    return parts.length ? parts.join(', ') : 'Keine weiteren Abhängigkeiten.';
}
function normalizeExaminationValidator(input, findingValidatorsByName) {
    if (typeof input === 'string') {
        return {
            kind: 'examination',
            name: input,
            findingValidators: [],
            examinationValidators: [],
            summary: `Validator "${input}"`,
            relatedSections: [],
            relatedFindings: []
        };
    }
    if (!isRecordLike(input))
        return null;
    const name = asString(input.name);
    if (!name)
        return null;
    const findingValidators = asStringArray(input.findingValidators ?? input.finding_validators);
    const examinationValidators = asStringArray(input.examinationValidators ?? input.examination_validators);
    const relatedSections = Array.from(new Set(findingValidators.flatMap((validatorName) => findingValidatorsByName.get(validatorName)?.relatedSections || [])));
    const relatedFindings = Array.from(new Set(findingValidators.flatMap((validatorName) => findingValidatorsByName.get(validatorName)?.relatedFindings || [])));
    return {
        kind: 'examination',
        name,
        findingValidators,
        examinationValidators,
        summary: buildExaminationValidatorSummary(findingValidators, examinationValidators),
        relatedSections,
        relatedFindings
    };
}
function normalizeValidators(validators, sections) {
    const source = isRecordLike(validators) ? validators : {};
    const rawFindingValidators = Array.isArray(source.findingsValidators ?? source.findings_validators)
        ? (source.findingsValidators ?? source.findings_validators)
        : [];
    const findingValidators = rawFindingValidators
        .map((entry) => normalizeFindingValidator(entry, sections))
        .filter((entry) => entry !== null);
    const findingValidatorsByName = new Map(findingValidators.map((validator) => [validator.name, validator]));
    const rawExaminationValidators = Array.isArray(source.examinationValidators ?? source.examination_validators)
        ? (source.examinationValidators ?? source.examination_validators)
        : [];
    const examinationValidators = rawExaminationValidators
        .map((entry) => normalizeExaminationValidator(entry, findingValidatorsByName))
        .filter((entry) => entry !== null);
    return {
        examinationValidators,
        findingsValidators: findingValidators
    };
}
export function normalizeTemplatePayload(payload) {
    if (!isRecordLike(payload))
        return null;
    const name = asString(payload.name);
    if (!name)
        return null;
    const reportSections = normalizeSections(payload.reportSections ?? payload.report_sections);
    return {
        name,
        examination: asString(payload.examination) || '',
        reportSections,
        validators: normalizeValidators(payload.validators, reportSections)
    };
}
export async function fetchReportTemplateByName(moduleName, templateName) {
    const response = await axiosInstance.get(`${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}`);
    return normalizeTemplatePayload(response.data);
}
export async function fetchReportTemplatesByExamination(moduleName, examinationName) {
    const response = await axiosInstance.get(`${REPORT_TEMPLATE_BASE}/by-examination/${encodeURIComponent(moduleName)}/${encodeURIComponent(examinationName)}`);
    if (!Array.isArray(response.data))
        return [];
    return response.data
        .map((entry) => normalizeTemplatePayload(entry))
        .filter((entry) => entry !== null);
}
function normalizeRuntimeIssue(input) {
    if (!isRecordLike(input))
        return null;
    const code = asString(input.code);
    const message = asString(input.message);
    if (!code || !message)
        return null;
    const levelRaw = asString(input.level);
    return {
        code,
        message,
        level: levelRaw === 'warning' ? 'warning' : 'error',
        ...(asString(input.validatorName ?? input.validator_name)
            ? { validatorName: asString(input.validatorName ?? input.validator_name) || undefined }
            : {}),
        ...(asString(input.validatorKind ?? input.validator_kind)
            ? {
                validatorKind: asString(input.validatorKind ?? input.validator_kind)
            }
            : {}),
        ...(isRecordLike(input.details) ? { details: input.details } : {})
    };
}
function normalizeDependencyStatuses(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((entry) => isRecordLike(entry))
        .map((entry) => ({
        name: asString(entry.name) || '',
        ok: asBoolean(entry.ok)
    }))
        .filter((entry) => !!entry.name);
}
function normalizeFindingsValidatorExecutions(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((entry) => isRecordLike(entry))
        .map((entry) => ({
        name: asString(entry.name) || '',
        ok: asBoolean(entry.ok),
        operator: asString(entry.operator) || '',
        finding: asString(entry.finding) || '',
        matchedOccurrences: asNumber(entry.matchedOccurrences ?? entry.matched_occurrences) ?? 0,
        triggeredOccurrences: asNumber(entry.triggeredOccurrences ?? entry.triggered_occurrences) ?? 0,
        missingRequiredClassifications: asStringArray(entry.missingRequiredClassifications ?? entry.missing_required_classifications),
        issues: Array.isArray(entry.issues)
            ? entry.issues
                .map((issue) => normalizeRuntimeIssue(issue))
                .filter((issue) => issue !== null)
            : []
    }))
        .filter((entry) => !!entry.name);
}
function normalizeExaminationValidatorExecutions(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((entry) => isRecordLike(entry))
        .map((entry) => ({
        name: asString(entry.name) || '',
        ok: asBoolean(entry.ok),
        findingValidatorStatus: normalizeDependencyStatuses(entry.findingValidatorStatus ?? entry.finding_validator_status),
        examinationValidatorStatus: normalizeDependencyStatuses(entry.examinationValidatorStatus ?? entry.examination_validator_status),
        issues: Array.isArray(entry.issues)
            ? entry.issues
                .map((issue) => normalizeRuntimeIssue(issue))
                .filter((issue) => issue !== null)
            : []
    }))
        .filter((entry) => !!entry.name);
}
export function normalizeRuntimeValidationResult(payload) {
    if (!isRecordLike(payload))
        return null;
    const templateName = asString(payload.templateName ?? payload.template_name);
    if (!templateName)
        return null;
    return {
        templateName,
        ok: asBoolean(payload.ok),
        evaluatedFindingsCount: asNumber(payload.evaluatedFindingsCount ?? payload.evaluated_findings_count) ?? 0,
        findingsValidators: normalizeFindingsValidatorExecutions(payload.findingsValidators ?? payload.findings_validators),
        examinationValidators: normalizeExaminationValidatorExecutions(payload.examinationValidators ?? payload.examination_validators),
        issues: Array.isArray(payload.issues)
            ? payload.issues
                .map((issue) => normalizeRuntimeIssue(issue))
                .filter((issue) => issue !== null)
            : []
    };
}
export async function validateReportTemplateRuntime(moduleName, templateName, findings) {
    const response = await axiosInstance.post(`${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/validate`, { findings });
    const normalized = normalizeRuntimeValidationResult(response.data);
    if (!normalized) {
        throw new Error('Ungültiges Runtime-Validierungsergebnis.');
    }
    return normalized;
}
function findClassificationDefinition(findingClassifications, classificationId) {
    return findingClassifications.find((entry) => entry.id === classificationId) || null;
}
function findChoiceName(findingClassifications, classificationId, choiceId) {
    const classification = findClassificationDefinition(findingClassifications, classificationId);
    const choice = classification?.choices.find((entry) => entry.id === choiceId) || null;
    return choice?.name || null;
}
function extractNumericalValue(classificationName, numericalDescriptors) {
    if (!classificationName) {
        const firstValue = Object.values(numericalDescriptors).find((value) => typeof value === 'number' || typeof value === 'string');
        return firstValue;
    }
    const directMatch = numericalDescriptors[classificationName];
    if (directMatch !== undefined)
        return directMatch;
    const preferredEntry = Object.entries(numericalDescriptors).find(([key]) => normalizeKey(key) === normalizeKey(classificationName));
    if (preferredEntry)
        return preferredEntry[1];
    return Object.values(numericalDescriptors).find((value) => typeof value === 'number' || typeof value === 'string');
}
async function buildRuntimeValidationFindings(patientExaminationId, getFindingById) {
    const rows = await findingsApi.listPatientFindings(patientExaminationId);
    const findingClassificationsCache = new Map();
    const getFindingDefinitions = async (findingId) => {
        const cached = findingClassificationsCache.get(findingId);
        if (cached)
            return cached;
        const loaded = await findingsApi.getFindingClassifications(findingId);
        findingClassificationsCache.set(findingId, loaded);
        return loaded;
    };
    const findingsPayload = [];
    for (const row of rows) {
        if (row.isActive === false)
            continue;
        const findingId = extractFindingId(row.finding);
        if (findingId == null)
            continue;
        const finding = getFindingById?.(findingId) || null;
        if (!finding?.name)
            continue;
        const findingDefinitions = await getFindingDefinitions(findingId);
        const classifications = row.classifications
            .filter((classification) => classification.isActive !== false)
            .map((classification) => {
            const classificationName = classification.classificationName ||
                findClassificationDefinition(findingDefinitions, classification.classification)?.name ||
                null;
            if (!classificationName)
                return null;
            const derivedValue = extractNumericalValue(classificationName, classification.numericalDescriptors);
            const choiceName = classification.classificationChoiceName ||
                findChoiceName(findingDefinitions, classification.classification, classification.classificationChoice) ||
                null;
            return {
                classification: classificationName,
                ...(Array.isArray(derivedValue) ? { values: derivedValue } : {}),
                ...(!Array.isArray(derivedValue) && derivedValue !== undefined ? { value: derivedValue } : {}),
                ...(choiceName ? { classificationChoice: choiceName } : {})
            };
        })
            .filter((classification) => classification !== null);
        findingsPayload.push({
            finding: finding.name,
            classifications
        });
    }
    return findingsPayload;
}
export async function validatePatientFindingsAgainstTemplate(params) {
    const findings = await buildRuntimeValidationFindings(params.patientExaminationId, params.getFindingById);
    return validateReportTemplateRuntime(params.moduleName, params.templateName, findings);
}
export function describeSectionTitle(sectionName) {
    return titleFromSectionName(sectionName);
}
