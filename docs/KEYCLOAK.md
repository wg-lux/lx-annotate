
# Keycloak / OIDC Authentication in `lx-annotate`

This document explains how Keycloak-based authentication is wired into `lx-annotate` across **backend (Django)** and **frontend (Vue + Pinia)**, and how to run it in development.

You can now:

* Wire new views into the system by:

  * Adding a `meta.cap` to the route.
  * Protecting buttons with `v-can`.
* On the backend, extend role→capability mappings to refine who can do what.

sequenceDiagram
    participant User
    participant Browser as Frontend<br/>(Vue)
    participant App as App.vue<br/>(AuthCheck)
    participant Store as auth_kc<br/>Pinia Store
    participant Backend as Backend<br/>/api/auth/bootstrap
    participant Keycloak as Keycloak<br/>/oidc/...

    User->>Browser: Load app
    Browser->>App: Mount AuthCheck
    App->>App: Check ready=false
    App->>App: Render loading slot
    
    App->>Store: onMounted → loadBootstrap()
    Store->>Backend: GET /api/auth/bootstrap<br/>(with credentials)
    
    alt Backend returns user
        Backend-->>Store: { user, roles, capabilities }
        Store->>Store: Normalize caps<br/>to method-specific map
        Store->>Store: Set loaded=true
    else No user (401/unauthenticated)
        Backend-->>Store: No user
        Store->>Store: Set loaded=true,<br/>user=null
    end
    
    Store-->>App: ready=true, isAuth=true/false
    
    alt isAuth = true
        App->>App: Render authenticated-content slot
    else isAuth = false
        App->>App: Render unauthenticated-content<br/>(LoginComponent)
        User->>Keycloak: Click login
        Keycloak->>User: OIDC flow...
    end


## 1. High-level architecture

* **Keycloak** is the identity provider (IdP) using OpenID Connect (OIDC).
* **Django (backend)** uses `mozilla-django-oidc` for the OIDC flow and exposes:

  * `/oidc/*` endpoints (login, callback, logout).
  * `/api/auth/bootstrap` which returns the current user, roles, and capabilities.
* **Vue (frontend)** never talks to Keycloak directly:

  * Axios always hits the Django API (with cookies + CSRF).
  * A dedicated Pinia store (`auth_kc`) mirrors the backend auth context.
  * UI and router access are guarded via capabilities.

The main pieces:

* `lx_annotate/settings_dev.py` – toggles and config for OIDC / Keycloak.
* `lx_annotate/urls.py` – mounts OIDC routes and keeps them out of the SPA catch-all.
* `templates/base.html` – contains the hidden Keycloak logout form.
* `frontend/src/stores/auth_kc.ts` – Pinia store for auth and capabilities.
* `frontend/src/components/AuthCheck.vue` – gates rendering on auth readiness.
* `frontend/src/directives/can_kc.ts` – `v-can` directive for per-element capability checks.
* `frontend/src/api/axiosInstance.ts` – Axios instance with 401→login and CSRF handling.
* `frontend/src/router/index.ts` – route guards for capability-based access.

---

## 2. Backend setup (Django + mozilla-django-oidc)

### 2.1. ENFORCE_AUTH toggle

In `settings_dev.py`, authentication is controlled by a feature flag:

```python
ENFORCE_AUTH = env.bool("ENFORCE_AUTH", default=False)
```

When `ENFORCE_AUTH` is **True**:

* OIDC middleware and backends are enabled.
* DRF `DEFAULT_PERMISSION_CLASSES` are set to reject anonymous access unless explicitly overridden.
* The app expects a logged in Keycloak user for protected endpoints.

When **False**:

* The project can still start and function for local/demo usage.
* Most API views use `AllowAny` / relaxed permission classes.
* OIDC routes are still available, but not strictly required.

> **Rule of thumb:**
>
> * **Local development without Keycloak** → `ENFORCE_AUTH=False`
> * **Integration / staging with real authentication** → `ENFORCE_AUTH=True`

### 2.2. Keycloak / OIDC settings

The Django side expects environment variables for Keycloak + OIDC. Typical pattern (check your `settings_dev.py` for exact names):

```python
KEYCLOAK_BASE_URL = env.str("KEYCLOAK_BASE_URL", "http://localhost:8080")
KEYCLOAK_REALM = env.str("KEYCLOAK_REALM", "lx-annotate")
OIDC_RP_CLIENT_ID = env.str("OIDC_RP_CLIENT_ID", "lx-annotate-local")
OIDC_RP_CLIENT_SECRET = env.str("OIDC_RP_CLIENT_SECRET", "")
```

In addition, `mozilla-django-oidc` needs standard OIDC endpoints derived from the Keycloak server and realm, e.g.:

```python
OIDC_OP_AUTHORIZATION_ENDPOINT = f"{KEYCLOAK_BASE_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/auth"
OIDC_OP_TOKEN_ENDPOINT = f"{KEYCLOAK_BASE_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token"
OIDC_OP_USER_ENDPOINT = f"{KEYCLOAK_BASE_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/userinfo"
OIDC_OP_JWKS_ENDPOINT = f"{KEYCLOAK_BASE_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"
```

And the usual backend options:

```python
AUTHENTICATION_BACKENDS = [
    # ... possibly Django's ModelBackend
    "mozilla_django_oidc.auth.OIDCAuthenticationBackend",
]

MIDDLEWARE += [
    "mozilla_django_oidc.middleware.SessionRefresh",
]
```

Adjust to match your actual `settings_dev.py` when you paste this into the repo docs.

### 2.3. URLs and SPA fallback

`lx_annotate/urls.py` mounts the OIDC endpoints before the Vue SPA catch-all:

```python
from django.urls import include, path, re_path
from mozilla_django_oidc import views as oidc_views

urlpatterns = [
    # ... admin, api, etc.

    path("oidc/", include("mozilla_django_oidc.urls")),

    # Vue SPA fallback – must NOT catch /api, /admin, /oidc, ...
    re_path(
        r"^(?!api/|admin/|oidc/).*",
        TemplateView.as_view(template_name="base.html"),
        name="spa-entry",
    ),
]
```

This ensures that:

* `/oidc/*` is handled by Django / OIDC and **not** Vue.
* Everything else unrelated (`/patienten`, `/videos`, etc.) falls back to the SPA and is then gated by the frontend’s auth logic.

### 2.4. Auth bootstrap endpoint

The backend exposes a bootstrap endpoint (e.g. `/api/auth/bootstrap`):

* **Request**: `GET /api/auth/bootstrap` with session cookie.

* **Response (authenticated)**:

  ```json
  {
    "user": {
      "id": 1,
      "username": "alice",
      "email": "alice@example.com"
    },
    "roles": ["endoregdb_user", "some_other_role"],
    "capabilities": {
      "page.patients.view": ["GET"],
      "page.patients.edit": ["GET", "POST"],
      "page.ai_models.view": ["GET"]
    }
  }
  ```

* **Response (unauthenticated)**: 401 or a payload indicating no user.

This is what the Pinia store consumes to decide:

* Is the user logged in?
* What are they allowed to see / do?

Exactly how roles map to capabilities lives in the backend (typically via role→capability config or a policy function). You only need to know that **capabilities are strings** like `"page.patients.view"` plus allowed HTTP methods.

---

## 3. Frontend setup (Vue + Pinia + Axios)

### 3.1. Auth store `auth_kc.ts`

Located at `frontend/src/stores/auth_kc.ts`, this Pinia store is the single source of truth for auth on the frontend.

Key ideas:

* **State** roughly:

  ```ts
  interface CapabilityMap {
    [capKey: string]: string[]; // e.g. "page.patients.view" -> ["GET", "POST"]
  }

  interface AuthState {
    loaded: boolean;     // has bootstrap finished?
    user: User | null;   // current user or null
    roles: string[];     // Keycloak roles
    capabilities: CapabilityMap;
  }
  ```

* **Getters**:

  ```ts
  const isAuthenticated = computed(() => !!state.user && state.loaded)

  function can(key: string, method: string = 'GET'): boolean {
    const allowedMethods = state.capabilities[key] || []
    return allowedMethods.includes(method) || allowedMethods.includes('*')
  }
  ```

* **Actions** (simplified sketch):

  ```ts
  async function loadBootstrap() {
    if (state.loaded) return

    try {
      const { data } = await axios.get('/api/auth/bootstrap', { withCredentials: true })
      state.user = data.user || null
      state.roles = data.roles || []
      state.capabilities = normalizeCaps(data.capabilities || {})
    } catch (e) {
      // 401 or network errors -> treat as unauthenticated
      state.user = null
      state.roles = []
      state.capabilities = {}
    } finally {
      state.loaded = true
    }
  }

  function login() {
    // Redirect to server-side OIDC login route
    window.location.href = '/oidc/authenticate/'
  }

  function logout() {
    // Trigger server-side OIDC logout (hidden form in base.html)
    const form = document.getElementById('kc-logout-form') as HTMLFormElement | null
    if (form) form.submit()
  }
  ```

Exact details in the repo may differ slightly, but conceptually this is what happens.

### 3.2. `AuthCheck.vue` – gate rendering

`frontend/src/components/AuthCheck.vue` wraps the entire app shell and provides three slots:

* `#loading` – while auth bootstrap is running.
* `#authenticated-content` – what to show when the user is logged in.
* `#unauthenticated-content` – what to show when **not** logged in.

Usage (simplified from `App.vue`):

```vue
<AuthCheck>
  <template #authenticated-content>
    <!-- Full app shell: navbar, sidebar, router-view, toasts, ... -->
    <SidebarComponent />
    <NavbarComponent />
    <router-view />
    <ToastMessageContainer />
  </template>

  <template #unauthenticated-content>
    <!-- Login screen -->
    <div class="container-fluid h-100 w-100 py-1 px-4">
      <main class="main-content center ...">
        <LoginComponent />
      </main>
    </div>
  </template>

  <template #loading>
    <!-- Optional nice loader -->
    <div class="d-flex align-items-center justify-content-center h-100">
      <span>Authentifizierung wird geladen…</span>
    </div>
  </template>
</AuthCheck>
```

On mount, `AuthCheck`:

1. Calls `auth_kc.loadBootstrap()`.
2. Waits until `loaded === true`.
3. Chooses between `authenticated-content` and `unauthenticated-content`.

This prevents the UI from briefly flashing the wrong state during startup.

### 3.3. `v-can` directive for capability checks

`frontend/src/directives/can_kc.ts` provides a `v-can` directive to hide or show elements based on capabilities.

Typical usage:

```vue
<!-- Hide the Patienten menu item if the user lacks page.patients.view -->
<li v-can="'page.patients.view:GET'">
  <RouterLink to="/patienten">Patienten</RouterLink>
</li>
```

or more explicit:

```vue
<button v-can="'page.ai_models.edit:POST'">
  KI-Modell bearbeiten
</button>
```

Directive logic (conceptually):

1. Parse the value into `capKey` and optional `method`:

   * `"page.patients.view"` → method defaults to `"GET"`.
   * `"page.patients.view:POST"` → method `"POST"`.

2. Call `auth_kc.can(capKey, method)`.

3. If false → remove/hide the element from the DOM.

Use this for:

* Sidebar/menu entries.
* Buttons and destructive actions.
* Any UI element that should be hidden from users without permission.

### 3.4. Axios instance and 401 handling

`frontend/src/api/axiosInstance.ts` configures Axios:

* Base URL is `/` (so `/api/...` hits the Django dev server).

* Requests send cookies and CSRF token:

  ```ts
  import Cookies from 'js-cookie'

  axiosInstance.interceptors.request.use((config) => {
    const csrftoken = Cookies.get('csrftoken')
    if (csrftoken) {
      config.headers['X-CSRFToken'] = csrftoken
    }
    config.withCredentials = true
    return config
  })
  ```

* Response interceptor:

  ```ts
  axiosInstance.interceptors.response.use(
    (r) => r,
    (err) => {
      const status = err?.response?.status
      const url = err?.config?.url || ''
      const isPollingRequest = url.includes('/status/') || url.includes('/polling-info/')
      const auth = useAuthKcStore()
      const toast = useToastStore()

      if (status === 401) {
        // Not authenticated -> Go to Keycloak login
        auth.login()
        return Promise.reject(err)
      }

      if (!isPollingRequest) {
        const msg = err?.response?.data?.detail || 'Unbekannter Fehler'
        toast.error(msg)
      }

      return Promise.reject(err)
    }
  )
  ```

This means:

* As soon as **any** API call returns `401`, the user is sent into the Keycloak login flow.
* Polling/status endpoints don’t spam toasts.
* CSRF is handled automatically as long as Django sets the `csrftoken` cookie.

---

## 4. Router guards and capability-based routes

In `frontend/src/router/index.ts`, before-each guards:

1. Ensure the `auth_kc` store is **loaded** (call `loadBootstrap()` once if not).

2. For routes that define a `meta.cap` (e.g. `"page.patients.view"`), the guard will:

   ```ts
   if (!auth.can(route.meta.cap, 'GET')) {
     // Hard protect: redirect away
     return next({ path: '/', query: { denied: '1' } })
   }
   ```

3. If no `meta.cap` is set, the route is accessible for any authenticated user (or possibly anonymous, depending on how you use it).

Example route definition:

```ts
{
  path: '/patienten',
  name: 'patients',
  component: () => import('@/views/PatientsView.vue'),
  meta: {
    cap: 'page.patients.view',
  },
}
```

---

## 5. Local development with Keycloak

### 5.1. Start a local Keycloak

Minimal example using Docker:

```bash
docker run --name keycloak \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:24.0.0 \
  start-dev
```

Open Keycloak admin UI at `http://localhost:8080/` and:

1. Create a **realm**, e.g. `lx-annotate`.
2. Create a **client**, e.g. `lx-annotate-local`:

   * Client type: `OpenID Connect`.
   * Access type: `confidential`.
   * Valid redirect URIs:
     `http://localhost:8000/oidc/callback/*`
   * Web origins:
     `http://localhost:8000` (or `*` for dev).
3. Generate a **client secret** and copy it.

### 5.2. Configure environment variables

In your `.env` (or however you inject env vars):

```env
ENFORCE_AUTH=true

KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=lx-annotate

OIDC_RP_CLIENT_ID=lx-annotate-local
OIDC_RP_CLIENT_SECRET=your-client-secret-here
```

Then run:

```bash
# Backend
uv run python manage.py migrate
uv run python manage.py runserver 0.0.0.0:8000

# Frontend
cd frontend
pnpm install
pnpm dev
```

Visit `http://localhost:8000/` – you should see the login view, and on login be redirected via Keycloak into the app.

### 5.3. Roles and `endoregdb_user`

The PR adds a check that only users with the `endoregdb_user` role may access certain parts of the app.

In Keycloak:

1. Create a realm role `endoregdb_user`.
2. Assign it to the user you log in with.

The backend should map this into the `roles` list and consequently into capabilities. If you log in without the role, you’ll likely be redirected away from protected routes.

---

## 6. Common issues and troubleshooting

### 6.1. Looping login / infinite redirects

Symptoms:

* You log in via Keycloak.
* You get sent back to the app, then instantly back to Keycloak.

Check:

* The redirect URI matches exactly (`/oidc/callback/...`).
* Cookie domain / same-site settings allow the session cookie to be stored.
* `ENFORCE_AUTH` matches your expectation; if set true but session isn’t persisted, every request will be 401→login.

### 6.2. 403 / denied=1 on specific pages

Symptoms:

* You’re logged in, but `/patienten` redirects to `/?denied=1`.

Check:

* Does the user actually have the required capability, e.g. `page.patients.view`?
* Does Keycloak assign the `endoregdb_user` role (or whichever roles your backend expects)?
* Is the backend capability map up to date after role changes?

### 6.3. CSRF errors

Symptoms:

* POST/PUT/DELETE requests fail with 403 CSRF errors.

Check:

* Confirm the `csrftoken` cookie is set by Django.
* Make sure you are using the shared Axios instance (`axiosInstance.ts`) which injects `X-CSRFToken`.
* Confirm that the frontend is served from the same origin (or that CSRF settings allow cross-origin cookie usage in your dev setup).

---

## 7. Summary

* Backend uses **Keycloak + mozilla-django-oidc** to manage logins, sessions, and OIDC flows.
* Frontend uses a dedicated **Pinia store (`auth_kc`)**, an **AuthCheck wrapper**, and a **`v-can` directive** to make auth and authorization explicit and testable.
* The **axios instance** bridges both worlds with cookies, CSRF, and 401→login logic.
* `ENFORCE_AUTH` lets you switch between “open dev mode” and “strict Keycloak mode” without changing code.


