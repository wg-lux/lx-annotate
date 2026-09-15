# LX-Annotate Frontend

Vue 3 + TypeScript frontend for annotation workflows in LX-Annotate.

## Architecture

- Vue 3 SPA with TypeScript
- Vite build and dev server
- Pinia for state management
- Django integration via `django-vite`
- Material Dashboard assets

## Project Structure

```text
frontend/
├── src/                    # Main Vue source
├── tests/                  # Vitest test suites
├── public/                 # Static assets
├── tools/                  # Frontend tooling
├── package.json
├── vite.config.ts
└── README.md
```

## Prerequisites

- Node.js 18+
- Running Django backend

Optional for auth-related flows:

- `endoreg_db` installed in the backend environment

## Installation

```bash
cd frontend
npm install
```

## Development

Run Vite dev server:

```bash
cd frontend
npm run dev
```

Run Django in another terminal:

```bash
export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev
python manage.py runserver
```

If you want Django templates to load assets from Vite dev server, enable:

- `DJANGO_VITE["default"]["dev_mode"] = True`

## Production Build

```bash
cd frontend
npm run build
```

This writes compiled assets to Django static output as configured in `vite.config.ts`.

## Available Commands

```bash
npm run dev
npm run build
npm run type-check
npm run type-check:component-tests
npm run lint
npm run test:unit
npm run preview
```

## TypeScript Safety

Treat every value that originates outside the compiled frontend as untrusted. This
includes API responses, caught errors, browser globals, persisted values, and
imported files. Introduce those values as `unknown` (or as a library-provided
type), validate the fields the workflow needs, and only then convert them to a
named domain type. Invalid required data must produce a visible error; do not use
an assertion or a silent default to make an invalid contract appear valid.

Choose the narrowest useful TypeScript construct:

- Use `unknown` at an untrusted boundary and narrow it with a type guard or schema.
- Use a named interface or type alias for API payloads, component contracts, and
  shared workflow state.
- Use a generic when the relationship between input and output types is the
  important constraint.
- Use a discriminated union for exhaustive workflow states instead of optional
  fields that permit contradictory combinations.
- Use types exported by Vue, Pinia, Axios, Vitest, Cypress, or another dependency
  instead of reproducing a library contract locally.

Backend payload interfaces use the frontend's `camelCase` field names. The shared
Axios client performs the backend `snake_case` to frontend `camelCase` conversion;
individual callers must not duplicate that conversion.

### Required checks

Run the non-mutating checks from `frontend/`:

```bash
npm run type-check
npm run type-check:component-tests
npm run lint
npm run test:unit -- --run path/to/affected.test.ts
```

Audit explicit `any` across every first-party scope with:

```bash
npm exec -- eslint src tests cypress \
  --rule '@typescript-eslint/no-explicit-any: error' \
  --max-warnings 0
```

The migration baseline from 2026-07-28 was 214 production, 129 test, and 2
Cypress occurrences. The same command subsequently reached zero occurrences;
future progress reports must keep the three scope counts separate so moving a
violation cannot look like progress.

Inspect the effective configuration for representative files when changing lint
or TypeScript settings:

```bash
npm exec -- eslint --print-config src/main.ts
npm exec -- eslint --print-config src/router/__tests__/reportingFlow.test.ts
npm exec -- eslint --print-config cypress/e2e/video-examination-annotations.cy.ts
```

The checked-in ESLint configuration applies `strictTypeChecked` with type
information from `tsconfig.eslint.json` to production, unit/integration test, and
Cypress code. Vue component type unsafety is explicitly disabled so the complete
`no-unsafe-*` family remains active. The gate enforces, at minimum, these rules as
errors in every relevant scope:

- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unsafe-argument`
- `@typescript-eslint/no-unsafe-assignment`
- `@typescript-eslint/no-unsafe-call`
- `@typescript-eslint/no-unsafe-member-access`
- `@typescript-eslint/no-unsafe-return`
- `@typescript-eslint/no-floating-promises`
- `@typescript-eslint/no-misused-promises`
- `@typescript-eslint/no-unnecessary-type-assertion`
- `@typescript-eslint/no-non-null-assertion`
- `@typescript-eslint/only-throw-error`
- `@typescript-eslint/use-unknown-in-catch-callback-variable`

These rules work as one boundary: banning `any` alone does not prevent unsafe
values, ignored promises, unchecked assertions, or non-`Error` exceptions from
crossing into clinical workflow code.

### Async ownership

Every promise needs one explicit owner:

- `await` work whose completion determines the current operation's success.
- `return` a promise only when the caller's contract owns its completion and
  rejection.
- Attach `.catch(...)` when a synchronous callback contract (such as a timer)
  cannot own a promise. Record the failure and update existing visible error
  state for user-triggered work.
- Deliberately detached work is limited to genuinely non-blocking refresh or
  telemetry paths and still requires an explicit rejection handler. Do not use
  `void` merely to silence a floating-promise diagnostic.

Vue event handlers and watchers must await user-visible mutations through their
authoritative success or failure boundary. A timer callback itself stays
synchronous and owns async refresh work with `.catch(...)`. Store every interval
or timeout handle and clear it during `onUnmounted`; guard delayed mount work so
it cannot install a scheduler after its component has already unmounted.

Run the unsuppressed, read-only async inventory with:

```bash
npm run lint:async-inventory
```

The inventory uses ESLint's Node API and reports production, unit/integration
test, and Cypress totals separately for `no-floating-promises`,
`no-misused-promises`, `no-confusing-void-expression`, `require-await`, and
`prefer-promise-reject-errors`. Keep all three scope counts separate in progress
reports so moving a diagnostic between scopes cannot look like improvement.

### String boundaries

Convert known scalar values deliberately when constructing UI text, identifiers,
filenames, logs, selectors, and routes. For example, use `String(record.id)` for
an already validated numeric identifier, or an existing formatter when units,
precision, or locale are part of the UX contract. Narrow optional and union
values before conversion; an array-valued route query is not equivalent to one
string and must not be flattened accidentally.

Values received as `unknown` require validation before conversion. Accept only
the scalar types defined by the API or domain contract, and either reject a
malformed value or use an explicit documented domain fallback. Never rely on
default object stringification: `[object Object]` is not a valid identifier,
path, schema version, log value, or user-facing description.

Run the unsuppressed, read-only string-boundary inventory with:

```bash
npm run lint:string-inventory
```

The inventory reports production, unit/integration test, and Cypress totals
separately for `restrict-template-expressions` and `no-base-to-string`.

### Test doubles and method binding

Use `vi.spyOn(object, 'method')` when a test needs to observe or replace an
object method while preserving its receiver. When a module mock is built from
hoisted `vi.fn()` values, assert against that exact direct mock reference—the
same function instance production code invokes. Do not extract `object.method`
into another variable merely to configure or assert on it: a real method can
lose `this`, and a reconstructed mock can observe a different function than the
one under test.

Reset call history and one-off implementations in `beforeEach`; restore spies
when their implementation must not survive the test. Keep async success,
rejection, retry, and ordering behavior explicit. Binding a method, casting it,
or adding a wrapper solely to satisfy lint hides the test-identity problem and
is not an acceptable fix.

Run the unsuppressed, read-only method-binding inventory with:

```bash
npm run lint:unbound-inventory
```

The inventory reports production, unit/integration test, and Cypress totals
separately for `unbound-method`.

### Control-flow and runtime boundaries

Remove a condition when both the type and the owning invariant prove its
alternate branch cannot occur. This includes redundant optional chains,
nullish fallbacks on required internal values, and comparisons such as
`flag === true` when `flag` is already a boolean. Prefer one named invariant or
derived boolean when the same state controls several branches.

Do not delete a runtime guard solely because an optimistic type says it is
unnecessary. Values from HTTP responses, authentication providers, routes,
browser storage, persisted state, and Vue form bindings must retain `unknown` or
a realistic union until validated. For example, use `items.at(0)` when an array
can be empty—indexed access otherwise appears non-null under the current
TypeScript configuration—and type a numeric form field as `string | number` if
the browser or test harness can supply either. Invalid authorization, workflow,
or clinical-status values must continue to fail closed.

Run the unsuppressed, read-only conditional-integrity inventory with:

```bash
npm run lint:condition-inventory
```

The inventory reports production, unit/integration test, and Cypress totals
separately for `no-unnecessary-condition` and
`no-unnecessary-boolean-literal-compare`.

### Type precision and the zero-suppression gate

A union such as `'known' | string` is just `string`. Use a closed literal union
only when the domain contract is exhaustive. Keep a forward-compatible value as
`string`, and validate it as a string when it crosses an HTTP, authentication,
route, form, or persisted-state boundary. Use `unknown` until validation when
the value's scalar kind is not yet trustworthy. Do not make an open backend
value look closed merely to improve editor completion.

Likewise, do not retain conversions that receive the exact type they return:
`String(text)`, `Number(count)`, and `!!flag` conceal nothing and suggest a
runtime boundary that does not exist. Correct the declared input type when Vue
forms or external data can genuinely supply a wider value. A generic parameter
must relate at least two signature positions or enforce a real constraint;
one-use generics provide false confidence. Represent a static-only utility as a
module-level object while preserving its public method surface. For reactive
records, create the next record with typed filtering or computed destructuring
instead of dynamically deleting a key from shared state.

Run the complete unsuppressed, read-only error inventory with:

```bash
npm run lint:strict-inventory
```

The inventory uses ESLint's Node API before bulk suppressions are applied and
reports errors by rule, file, and production/test/Cypress scope. All three
scopes must remain at zero. The former count-based
`eslint-suppressions.json` debt baseline was eliminated after the 2026-08-04
type-precision migration reached zero; it is not an exception policy and must
not be regenerated.

### Runtime logging and clinical privacy

Production code must not call `console.*` directly. Create one scoped logger
with `createRuntimeLogger('lowercase-scope')` and use stable lowercase event
names such as `request-failed` or `draft.commit-complete`. Event names describe
the operation; they must not contain identifiers, filenames, URLs, labels,
free-form backend values, or user-visible error text.

Logger context is intentionally limited to an approved set of scalar
operational fields, such as a controlled operation, media type, count, retry
count, or state. Never log patient names, dates of birth, contact details,
patient hashes, comments, clinical identifiers, form values, sensitive
metadata, media or segment objects, payloads, request objects, response bodies,
DOM events, error messages, or stacks. Pass an unknown failure only as the
second argument to `logger.error(...)`; the logger retains a safe error class
and optional HTTP status while dropping the raw message and nested data.

Debug and informational records require `VITE_ENABLE_DEBUG=true` (or the
legacy `DEBUG=true` frontend flag). Test output is silent unless a logger test
explicitly sets `VITE_ENABLE_TEST_LOGS=true`. Warnings and errors remain enabled
outside tests, but contain only structured redacted JSON. Application state,
visible errors, retries, and thrown failures remain authoritative; logging must
never replace or suppress them.

Audit executable calls outside the single logger sink with:

```bash
npm run lint:console-inventory
```

The inventory reports direct calls by file and console method. ESLint enforces
`no-console` throughout `frontend/src` and exempts only the logger sink module.

Normal lint, both type checks, and affected tests remain required:

```bash
npm run lint
npm run type-check
npm run type-check:component-tests
```

Do not run `--suppress-all` during routine development; it would conceal a
regression instead of fixing it. The earlier zero-`any`, unsafe-value boundary,
async reliability, string-boundary, bound-test-double, and control-flow
milestones remain part of the same zero-diagnostic gate.

An unavoidable interoperability exception must be attached to the smallest
possible expression or line. Its inline comment must state why the library
contract cannot be represented safely, name the responsible owner, and state the
concrete condition for removal. File-wide disables and exceptions added only to
preserve existing behavior are not acceptable.

## Django Integration

Example template usage:

```html
{% load django_vite %} {% vite_asset 'src/main.ts' %}
```

Example settings snippet:

```python
DJANGO_VITE = {
    "default": {
        "dev_mode": False,
    }
}
```

## Troubleshooting

Frontend does not load:

```bash
cd frontend
npm run build
```

API requests fail:

- Ensure Django runs on `http://127.0.0.1:8000`
- Verify CSRF token handling in frontend API client

Type errors:

```bash
cd frontend
npm run type-check
```

## Environment

Development backend settings module:

```bash
export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev
```

Production backend settings module:

```bash
export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_prod
```
