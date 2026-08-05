/**
 * The repository currently type-checks Cypress sources without installing the
 * Cypress package. This is the narrow runtime surface used by the checked-in
 * browser suite; Cypress still provides every implementation at test runtime.
 */

export interface CypressElementCollection {
  readonly [index: number]: HTMLElement | undefined
  readonly length: number
}

export interface CypressInterception<TRequestBody = unknown> {
  readonly request: {
    readonly body: TRequestBody
  }
}

export interface CypressChain<Subject> {
  as(alias: string): CypressChain<Subject>
  click(): CypressChain<Subject>
  select(value: string): CypressChain<Subject>
  should(chainer: string, ...args: readonly unknown[]): CypressChain<Subject>
  then<Result>(callback: (subject: Subject) => Result): CypressChain<Result>
  trigger(eventName: string): CypressChain<Subject>
  type(text: string): CypressChain<Subject>
}

export interface CypressStub {
  as(alias: string): CypressStub
}

interface StaticFixtureResponse {
  readonly fixture: string
}

export interface CypressRuntime {
  get(
    selector: string,
    options?: Readonly<{ timeout: number }>
  ): CypressChain<CypressElementCollection>
  intercept(
    method: 'GET' | 'POST',
    url: string,
    response: StaticFixtureResponse
  ): CypressChain<null>
  stub<Target extends object>(target: Target, method: keyof Target): CypressStub
  visit(url: string): CypressChain<Window>
  wait<RequestBody = unknown>(alias: `@${string}`): CypressChain<CypressInterception<RequestBody>>
  window(): CypressChain<Window>
  wrap<Subject>(subject: Subject): CypressChain<Subject>
}

function readProperty(target: object, key: string): unknown {
  const value: unknown = Reflect.get(target, key)
  return value
}

function hasFunction(target: object, key: string): boolean {
  return typeof readProperty(target, key) === 'function'
}

function isCypressRuntime(value: unknown): value is CypressRuntime {
  return (
    typeof value === 'object' &&
    value !== null &&
    hasFunction(value, 'get') &&
    hasFunction(value, 'intercept') &&
    hasFunction(value, 'stub') &&
    hasFunction(value, 'visit') &&
    hasFunction(value, 'wait') &&
    hasFunction(value, 'window') &&
    hasFunction(value, 'wrap')
  )
}

export function requireCypressRuntime(): CypressRuntime {
  const value = readProperty(globalThis, 'cy')
  if (!isCypressRuntime(value)) {
    throw new Error('Cypress did not provide the expected browser-test command runtime.')
  }
  return value
}
