# agl-validator

This module is used to validate annotated names. 

Also a framwork for the case generator is included as well as theoption to annotate results by the machine learning pipeline.




## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Development configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

Vite is used as a development server. It is started by running 

```sh
npm run dev 
```

inside the agl_validator folder.

It will reload very hot. This means any change is displayed in no time.

# Commands

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

->> This is necessary before django integration.

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

### Django Integration

This module is made to be run with the agl-home-django backend.

In a Django project, Vue code typically needs to be organized in a specific way to integrate properly. Here's how to structure it:

First, create a frontend directory in your Django project:

Copyyour_django_project/
├── manage.py
├── your_app/
│   ├── views.py
│   ├── urls.py
│   └── ...
└── frontend/                  # Create this directory
    ├── src/
    │   ├── components/
    │   │   └── AuthCheck.vue  # Put your Vue component here
    │   ├── App.vue
    │   └── main.js
    ├── package.json
    └── vite.config.js         # or vue.config.js if using Vue CLI

# Serving static files:

cp -r dist/* ../../agl-home-django/frontend/static/frontend/

Setting up the Django settings for static file deployment:

### settings.py

import os

#### Add static files configuration
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "frontend/static"),
]

## Configuring Django as the development server

Initialize a Vue project in the frontend directory:

bashCopycd your_django_project
mkdir frontend
cd frontend
npm init vue@latest  # Or your preferred Vue setup method

Configure your Vue build to output to Django's static files. Add this to your vite.config.ts:

javascriptCopyimport { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../your_app/static/your_app/js',
    assetsDir: '.',
    manifest: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/user-status': 'http://localhost:8000',
    }
  }
})

In your Django template (e.g., base.html):
```html
htmlCopy{% load static %}
<!DOCTYPE html>
<html>
<head>
    <title>Your App</title>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="{% static 'your_app/js/main.js' %}"></script>
</body>
</html>
```
Update Django settings to handle static files:

pythonCopy# settings.py
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / "frontend" / "dist",
]

Development workflow:
bashCopy# Terminal 1 - Django
python manage.py runserver

# Terminal 2 - Vue
cd frontend
npm run dev


This setup allows you to:

Develop Vue components with hot reloading
Have Vue handle frontend routing
Make API calls to your Django backend
Bundle and serve your Vue app through Django in production


