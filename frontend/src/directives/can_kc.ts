// frontend/src/directives/can_kc.ts
import type { DirectiveBinding } from 'vue'
import { useAuthKcStore } from '@/stores/auth_kc'

type CapabilityMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

function isCapabilityMethod(value: string): value is CapabilityMethod {
  return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(value)
}

export default {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const store = useAuthKcStore()
    const expr = String(binding.value || '')
    // Accept "page.patients.view" or "routeName:GET"
    let key = expr
    let method: CapabilityMethod = 'GET'
    const colon = expr.indexOf(':')
    if (colon > 0) {
      key = expr.slice(0, colon)
      const requestedMethod = expr.slice(colon + 1).toUpperCase()
      if (!isCapabilityMethod(requestedMethod)) {
        el.style.display = 'none'
        return
      }
      method = requestedMethod
    }
    const allowed = store.can(key, method)
    if (!allowed) el.style.display = 'none'
  }
}
