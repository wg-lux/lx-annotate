import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
function isRecordLike(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function normalizeLookupPayload(payload) {
    if (!isRecordLike(payload))
        return {};
    if (isRecordLike(payload.data))
        return payload.data;
    if (isRecordLike(payload.lookup))
        return payload.lookup;
    return payload;
}
function getErrorText(e, fallback) {
    const responseData = e?.response?.data;
    if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
        return responseData.errors.join(' | ');
    }
    return responseData?.detail || e?.message || fallback;
}
export function useLookupActions(params) {
    const { flow, loading, errorMessage, applyLookup } = params;
    function clearMessages() {
        if (params.clearMessages) {
            params.clearMessages();
            return;
        }
        errorMessage.value = null;
        if (params.successMessage)
            params.successMessage.value = null;
    }
    function requireToken() {
        if (!flow.lookupToken) {
            errorMessage.value = 'Kein aktiver Fallkontext vorhanden.';
            return null;
        }
        return flow.lookupToken;
    }
    function handleLookupError(e, fallbackMessage) {
        if (e?.response?.status === 404) {
            flow.setSessionStatus('expired');
            errorMessage.value = 'Der Fallkontext ist abgelaufen. Bitte im Fall-Setup neu initialisieren.';
            return { ok: false, expired: true };
        }
        errorMessage.value = getErrorText(e, fallbackMessage);
        return { ok: false };
    }
    async function fetchLookupAll(opts) {
        const token = requireToken();
        if (!token)
            return { ok: false };
        loading.value = true;
        clearMessages();
        try {
            const skipRecompute = opts?.skipRecompute ?? true;
            const res = await axiosInstance.get(`${r(endpoints.requirements.lookupAll(token))}${skipRecompute ? '?skip_recompute=true' : ''}`);
            applyLookup(normalizeLookupPayload(res.data));
            flow.setSessionStatus('active');
            return { ok: true };
        }
        catch (e) {
            return handleLookupError(e, opts?.fallbackErrorMessage || 'Fehler beim Laden des Fallstands.');
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchLookupParts(keys, opts) {
        const token = requireToken();
        if (!token)
            return { ok: false };
        if (!keys.length)
            return { ok: true };
        loading.value = true;
        clearMessages();
        try {
            const res = await axiosInstance.get(r(endpoints.requirements.lookupParts(token, keys)));
            applyLookup(normalizeLookupPayload(res.data));
            flow.setSessionStatus('active');
            return { ok: true };
        }
        catch (e) {
            return handleLookupError(e, opts?.fallbackErrorMessage || 'Fehler beim Laden von Befundteilenn des Fallkontexts.');
        }
        finally {
            loading.value = false;
        }
    }
    async function patchLookupParts(updates, opts) {
        const token = requireToken();
        if (!token)
            return { ok: false };
        loading.value = true;
        clearMessages();
        try {
            await axiosInstance.patch(r(endpoints.requirements.lookupParts(token)), { updates });
            flow.setSessionStatus('active');
            return { ok: true };
        }
        catch (e) {
            return handleLookupError(e, opts?.fallbackErrorMessage || 'Fehler beim Speichern von Befundteilenn des Fallkontexts.');
        }
        finally {
            loading.value = false;
        }
    }
    async function recomputeLookup(opts) {
        const token = requireToken();
        if (!token)
            return { ok: false };
        loading.value = true;
        clearMessages();
        try {
            const res = await axiosInstance.post(r(endpoints.requirements.lookupRecompute(token)));
            if ((opts?.applyUpdates ?? true) && res.data?.updates) {
                applyLookup(normalizeLookupPayload(res.data.updates));
            }
            flow.setSessionStatus('active');
            loading.value = false;
            if (opts?.refreshAfter ?? true) {
                return await fetchLookupAll({
                    fallbackErrorMessage: opts?.fallbackErrorMessage || 'Fehler beim Laden des Fallstands.'
                });
            }
            return { ok: true };
        }
        catch (e) {
            return handleLookupError(e, opts?.fallbackErrorMessage || 'Fehler bei der Neuberechnung.');
        }
        finally {
            loading.value = false;
        }
    }
    return {
        fetchLookupAll,
        fetchLookupParts,
        patchLookupParts,
        recomputeLookup
    };
}
