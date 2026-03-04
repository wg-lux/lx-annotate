import { v7 as uuidv7 } from 'uuid';
function extractChoiceName(lsResult) {
    const choiceNode = lsResult.find((node) => {
        if (!node || typeof node !== 'object')
            return false;
        const typedNode = node;
        return typedNode.type === 'choices';
    });
    const choices = choiceNode?.value?.choices;
    if (!Array.isArray(choices))
        return null;
    const firstChoice = choices[0];
    if (typeof firstChoice !== 'string')
        return null;
    const normalized = firstChoice.trim();
    return normalized || null;
}
export function resolveAnnotator(identity) {
    const sub = typeof identity?.sub === 'string' ? identity.sub.trim() : '';
    if (sub)
        return `oidc:${sub}`;
    const username = typeof identity?.username === 'string' ? identity.username.trim() : '';
    if (username)
        return username;
    return 'unknown';
}
export function toBulkUpsertPayload(lsResult, frameId, annotator, existingExternalId) {
    const choiceName = extractChoiceName(lsResult);
    if (!choiceName) {
        throw new Error('No choice value found in Label Studio result payload.');
    }
    return {
        frameId,
        choiceName,
        value: true,
        floatValue: null,
        informationSourceName: 'label_studio_frontend',
        annotator,
        externalAnnotationId: existingExternalId || uuidv7(),
        modelMetaId: null
    };
}
