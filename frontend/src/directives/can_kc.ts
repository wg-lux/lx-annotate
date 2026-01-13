// frontend/src/directives/can_kc.ts
import type { DirectiveBinding } from 'vue'
import { useAuthKcStore } from '@/stores/auth_kc'

export default {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const store = useAuthKcStore()
    const expr = String(binding.value || '')
    // Accept "page.patients.view" or "routeName:GET"
    let key = expr
    let method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE' = 'GET'
    const colon = expr.indexOf(':')
    if (colon > 0) {
      key = expr.slice(0, colon)
      method = expr.slice(colon + 1).toUpperCase() as any
    }
    const allowed = store.can(key, method)
    if (!allowed) el.style.display = 'none'
  }
}
