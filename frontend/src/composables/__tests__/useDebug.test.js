import { describe, expect, it, vi } from 'vitest';
import { useDebug } from '@/composables/useDebug';
describe('useDebug', () => {
    it('returns true when VITE_ENABLE_DEBUG=true', () => {
        vi.stubEnv('VITE_ENABLE_DEBUG', 'true');
        const { isDebug } = useDebug();
        expect(isDebug.value).toBe(true);
    });
    it('returns false when VITE_ENABLE_DEBUG=false', () => {
        vi.stubEnv('VITE_ENABLE_DEBUG', 'false');
        const { isDebug } = useDebug();
        expect(isDebug.value).toBe(false);
    });
});
