# Playground Web App

This directory contains the browser application served by `server.py`. The app is a hybrid:

- `public/` is the static shell and the legacy sections.
- `ui/` contains the new React + Tailwind + shadcn Playground source.
- `public/playground-ui/` contains the built React assets that the static app loads at runtime.

## Start The App

From the repository root:

```bash
npm install --prefix playground/ui
npm start
```

Open [http://localhost:8085](http://localhost:8085).

If the Playground bundle is already built and you only want to serve the app:

```bash
npm run serve
```

## Playground UI Development

Watch and rebuild the React Playground bundle:

```bash
npm run dev:playground-ui
```

Serve the static app in another terminal:

```bash
npm run serve
```

The integrated app always loads the built files from `public/playground-ui/`, not the Vite dev server directly.

## Layout

```text
playground/
├── public/
│   ├── index.html
│   ├── js/
│   ├── pkg/
│   └── playground-ui/
├── server.py
└── ui/
    ├── src/app/
    ├── src/components/ui/
    └── src/lib/
```

## Notes

- `public/js/app.js` still owns navigation and non-Playground bootstrapping.
- The redesigned Playground mounts into `#playground-app-root`.
- If you change React Playground files, rebuild the bundle before manual testing unless the watch script is running.
