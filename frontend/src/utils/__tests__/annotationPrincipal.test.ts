import { describe, expect, it } from 'vitest'

import { getAnnotatorPrincipalFromAuthUser } from '@/utils/annotationPrincipal'

describe('annotation principal', () => {
  it('prefers the stable OIDC subject over the display username', () => {
    expect(
      getAnnotatorPrincipalFromAuthUser({
        sub: 'kc-user-7',
        username: 'annotator'
      })
    ).toBe('oidc:kc-user-7')
  })

  it('uses the username only when no OIDC subject is available', () => {
    expect(getAnnotatorPrincipalFromAuthUser({ username: 'annotator' })).toBe('annotator')
  })
})
