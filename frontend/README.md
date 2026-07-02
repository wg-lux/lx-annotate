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
npm run lint
npm run test:unit
npm run preview
```

## Django Integration

Example template usage:

```html
{% load django_vite %}
{% vite_asset 'src/main.ts' %}
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
