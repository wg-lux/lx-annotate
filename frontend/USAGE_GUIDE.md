# Before running

direnv allow
uv sync
mkdir 

## TypeSript compilation

Typescript compilation runs automatically after changing files and running vue build.
Changes are visible in the frontend.

## Entry files

General order of loading:

App.vue -> router.ts -> views from frontend/views folder -> component from components folder -> stores, api etc.


## Components

You will mostly work in components, these consist of HTML with vue elements (eg. v-f) and typescript code and css below.

Components are loaded into views.

IMPORTANT COMPONENTS:

NavbarComponent.vue -> toplevel menu
SidebarComponent.vue -> New components need to be registered here


## Views

Here, your components need to be registered. If creating a new one, just copy and pate old one, change name and text in HTML and import correct component.

## Stores

Pinia stores are used for data persistance across pages and even sessions. They are used by components to store the data in the browser cache.
This is useful to reduce the amount of API interactions as well as to keep data in a multi page workflow like the one in the Anonymizer folder or the Video annotation.

Refer:

anonymizationStore.ts
videoStore.ts

## Router

The router.ts file registers all URLs. If making a new page or looking for the correct url to redirect, look here.

The router also supports the functionality to push to a new route.

## API helper

axiosInstance.ts appends the correct prefix for the backend.

## Importing Videos or PDFs

When running the server, the file watcher is active. The import starts after placing files in lx-annotate/data/raw-videos or lx-annotate/data/raw-pdf. Caution: running the server also starts the watcher.
