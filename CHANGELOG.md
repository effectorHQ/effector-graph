# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · [Semantic Versioning](https://semver.org/)

---

## [1.1.0] — 2026-03-21

### Added

- **`serve` command** — launches a local HTTP server (`node:http`) at `localhost:4200` with a full interactive UI; auto-opens browser, supports `--port` and `--no-open`
- **Interactive web UI** (`src/web/app.html`) — single-file D3.js v7 application with five views:
  - **Explorer** — force-directed graph (drag, pan/zoom, type filter chips, search, trust overlay toggle)
  - **Spectrum** — interactive polar chart; hover/click types cross-filters Explorer
  - **Dashboard** — type distribution bars, trust-coverage donut chart, most-composed ranked list, edge-type breakdown
  - **Pipeline** — upload `pipeline.effector.yml` and see a typed step-flow diagram
  - **Diff** — color-coded comparison of two graphs (green=added, red=removed, yellow=modified)
- **HTTP API** (`src/web/server.js`):
  - `GET /api/graph` — full graph JSON from registry
  - `GET /api/spectrum` — polar layout data for all 40 types
  - `GET /api/stats` — `computeStats()` output
  - `GET /api/trust` — trust metadata from `.effector-sig` files
  - `GET /api/types` — type catalog
  - `POST /api/diff` — `diffGraphs()` over two provided graphs
  - `GET /widget.js` — web component bundle
  - Falls back to a 12-effector demo dataset when registry is empty
- **Web Components** (`src/web/widget.js`) — two Shadow DOM custom elements embeddable in any page:
  - `<effector-graph registry="…" height theme trust filter data>` — D3 force graph
  - `<effector-spectrum registry="…" height theme highlight>` — D3 polar chart
  - D3 injected from CDN on demand; re-renders on all attribute changes
- **VS Code extension** (`vscode/`) — webview panel showing live capability graph:
  - Activates on `workspaceContains:**/effector.toml`
  - Commands: `effectorGraph.show`, `effectorGraph.showSpectrum`
  - Scans workspace for `effector.toml` files, builds graph in-process
  - File watcher pushes updates when effector manifests change
  - CJS-safe ESM interop via `pathToFileURL` + dynamic `import()`
- **`diffGraphs(graphA, graphB)`** (`src/core/diff.js`) — computes added/removed/modified nodes and added/removed edges between two graphs
- **`computeStats(graph)`** (`src/core/stats.js`) — aggregates type distribution, most-composed effectors, trust coverage, type coverage %, and edge type breakdown
- New exports in `src/index.js`: `diffGraphs`, `computeStats`
- `--port` and `--no-open` flags in CLI
- `vscode/` added to `files` in `package.json`
- 20 new tests (diff, stats, server); total: 43 tests, all passing

### Fixed

- Widget re-render was silently blocked by a `_rendered = true` flag that was never cleared; removed the guard and rely on `svg.selectAll('*').remove()` to reset state
- `EffectorSpectrum.attributeChangedCallback` referenced `_updateHighlight()` which was never implemented; replaced with `if (name === 'highlight' && this._data) this._render()`
- `EffectorSpectrum._render()` did not clear the SVG before re-drawing, causing duplicate elements on highlight changes

---

## [1.0.0] — 2026-03-19

First stable release. Published as `@effectorhq/graph`.

### Added
- **Capability graph** — builds a directed graph of effector definitions with typed edges (edge exists when output type of A is compatible with input type of B)
- **CLI subcommands**:
  - `query --input <type>` — find all effectors compatible with a given input type
  - `query --output <type>` — find all effectors that produce a given output type
  - `path <effectorA> <effectorB>` — find composition paths between two effectors
  - `export --format json` — export full graph as JSON for custom visualization
- **Type-checked edges** — uses `@effectorhq/core` `checkTypeCompatibility()` for edge construction
- **Registry loader** — discovers effector definitions from local directories
- 12 tests

### Changed
- All cross-repo relative imports replaced with `@effectorhq/core ^1.0.0` package specifier
- Package name: `effector-graph` → `@effectorhq/graph`
- `dependencies` updated from `file:../effector-core` → `"@effectorhq/core": "^1.0.0"`
- `files` field: `["src/", "bin/", "README.md", "LICENSE"]`
- `prepublishOnly` script added
