import { computed } from 'vue';
export function useDebug() {
    const isDebug = computed(() => import.meta.env.DEBUG === 'true' || import.meta.env.VITE_ENABLE_DEBUG === 'true');
    return { isDebug };
}
