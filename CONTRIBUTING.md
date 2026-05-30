# Contributing to ERD Markdown

Thanks for your interest in contributing!

## Prerequisites

- VSCode 1.85+
- Node.js 20+

## Getting started

```bash
git clone https://github.com/PabloGonzalezMartin/ERD-markdown.git
cd ERD-markdown

npm install
cd webview && npm install && cd ..
npm run build
```

Press **F5** in VSCode to launch the Extension Development Host, then open any `.ermd` file.

## Development workflow

1. **F5** → opens Extension Development Host
2. Open `examples/crowfoot-bookstore-example.csv` or any `.ermd` file
3. Edit WebView source → `npm run build:webview` → `Ctrl+Shift+P` → **Developer: Reload Window**

For hot-reload of the WebView in isolation (no extension host):

```bash
cd webview && npm run dev
```

The diagram starts empty in dev mode since `acquireVsCodeApi` is stubbed.

## Build commands

| Command | What it does |
|---|---|
| `npm install` | Install extension host deps |
| `cd webview && npm install` | Install WebView deps |
| `npm run compile` | Compile extension host TypeScript → `out/` |
| `npm run build:webview` | Build React WebView with Vite → `media/` |
| `npm run build` | Both of the above in sequence |
| `npx tsc --noEmit` | Type-check extension host |
| `cd webview && npx tsc --noEmit` | Type-check WebView |

## Repository layout

```
ERD-markdown/
├── shared/          # Types shared by extension host and WebView
│   ├── DiagramModel.ts
│   └── messages.ts
├── src/             # Extension host (Node.js)
│   ├── extension.ts
│   ├── ErmdPanel.ts
│   ├── ErmdParser.ts
│   ├── ErmdSerializer.ts
│   ├── DdlExporter.ts
│   └── DdlDiffer.ts
├── webview/         # React WebView
│   └── src/
│       ├── components/
│       ├── store/
│       └── util/
├── examples/
└── CLAUDE.md        # Architecture and conventions for AI assistants
```

## Tech stack

| Layer | Technology |
|---|---|
| Extension host | TypeScript, VSCode Extension API, js-yaml |
| WebView UI | React 18, @xyflow/react v12, Zustand + zundo, dagre |
| Build | Vite (WebView), tsc + esbuild (extension host) |

## Before submitting a PR

- [ ] `npx tsc --noEmit` passes (repo root)
- [ ] `cd webview && npx tsc --noEmit` passes
- [ ] `npm run build` produces `media/webview.js` and `media/webview.css` without errors
- [ ] Manually tested with `examples/crowfoot-bookstore-example.csv`
- [ ] `CLAUDE.md` updated if architecture or conventions changed
- [ ] `README.md` updated if user-visible features changed
