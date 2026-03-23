# @effectorhq/graph

[![npm](https://img.shields.io/npm/v/@effectorhq/graph?color=E03E3E&logo=npm&logoColor=white)](https://www.npmjs.com/package/@effectorhq/graph)
[![CI](https://github.com/effectorHQ/effector-graph/actions/workflows/test.yml/badge.svg)](https://github.com/effectorHQ/effector-graph/actions/workflows/test.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache-2.0-blue.svg)](LICENSE)

Capability graph and **Spectrum** polar visualization for typed AI agent tools. Build, query, visualize, and interactively explore the composition graph that emerges from typed Effectors.

## Quick Start

```bash
# Launch interactive UI (D3 force graph, Spectrum, Dashboard, Diff)
npx @effectorhq/graph serve --registry ./skills
# → opens http://localhost:4200

# Render the full 40-type Spectrum as HTML
npx @effectorhq/graph spectrum > spectrum.html

# Highlight a specific tool's types on the Spectrum
npx @effectorhq/graph spectrum ./my-tool > my-tool-spectrum.html

# Query by interface type
npx @effectorhq/graph query --input CodeDiff --registry ./skills

# Find composition paths between two tools
npx @effectorhq/graph path code-review@1.2.0 slack-notify@0.5.0 --registry ./skills

# Find paths by type
npx @effectorhq/graph find-path --from CodeDiff --to Notification --registry ./skills

# Export graph as JSON or SVG
npx @effectorhq/graph export --format json --registry ./skills
npx @effectorhq/graph export --format svg --registry ./skills
```

## Spectrum

The **Spectrum** is a polar chart that maps all 40 standard capability types across two dimensions:

- **8 sectors** (capability domains): Code, Data, Research, Communication, Security, Infrastructure, API, Orchestration
- **4 concentric rings** (complexity tiers):
  - **Primitive** (inner) — String, JSON, Number, Boolean
  - **Domain** — CodeDiff, FilePath, Repository, EnvConfig, etc.
  - **Structured** — ReviewReport, SecurityReport, Markdown, APIResponse, etc.
  - **Complex** (outer) — Pipeline, Workspace, MultiStepPlan, ResearchReport

```bash
# Full spectrum (all 40 types)
npx @effectorhq/graph spectrum > spectrum.html

# Highlight your tool — input/output/context types glow on the chart
npx @effectorhq/graph spectrum ./my-tool > my-tool.html

# SVG only (no HTML wrapper)
npx @effectorhq/graph spectrum --format svg > spectrum.svg
```

When you pass a tool directory, the Spectrum highlights:
- **Input type** with a red glow
- **Output type** with an orange glow
- **Context types** with a subtle glow

This lets you visually position any tool within the capability landscape and spot under-served sectors.

## Graph Commands

### `serve` — Interactive UI

```bash
npx @effectorhq/graph serve --registry ./skills
npx @effectorhq/graph serve --port 4200 --no-open
```

Launches a local HTTP server at `localhost:4200` with a full D3.js interactive UI:

- **Explorer** — Force-directed graph; drag nodes, pan/zoom, filter by type, click to inspect
- **Spectrum** — Interactive polar chart; hover/click types to cross-filter the Explorer
- **Dashboard** — Type distribution, trust coverage donut, most-composed effectors ranked list
- **Pipeline** — Upload a `pipeline.effector.yml` and see it rendered as a typed step flow
- **Diff** — Compare two graphs or pipelines with color-coded added/removed/modified nodes and edges

A demo dataset (12 effectors) loads automatically when the registry directory is empty, so `serve` works out of the box.

**Web Components** — embed in any page after running `serve`:

```html
<script src="https://unpkg.com/@effectorhq/graph/src/web/widget.js"></script>
<effector-graph registry="http://localhost:4200/api/graph" height="600" theme="dark" trust></effector-graph>
<effector-spectrum registry="http://localhost:4200/api/spectrum" highlight="CodeDiff,ReviewReport" height="400"></effector-spectrum>
```

**VS Code Extension** — install from `vscode/` to show the graph inline while editing Effectors.

---

### `query` — Search by interface type

```bash
npx @effectorhq/graph query --input CodeDiff --registry ./skills
npx @effectorhq/graph query --output ReviewReport --registry ./skills
```

Finds all Effectors in a registry directory that match the given input/output types.

### `path` — Find composition paths

```bash
npx @effectorhq/graph path code-review@1.2.0 slack-notify@0.5.0 --registry ./skills
```

Discovers all valid composition chains between two named Effectors using BFS traversal.

### `find-path` — Find paths by type

```bash
npx @effectorhq/graph find-path --from CodeDiff --to Notification --registry ./skills
```

Like `path`, but searches by type signature instead of tool name. Finds all Effector chains where the first tool accepts `--from` type and the last produces `--to` type.

### `render` — Pipeline SVG

```bash
npx @effectorhq/graph render ./pipeline.effector.yml --registry ./skills
```

Renders a capability graph as a static SVG file.

### `export` — Export graph data

```bash
npx @effectorhq/graph export --format json --registry ./skills > graph.json
npx @effectorhq/graph export --format svg --registry ./skills > graph.svg
```

## Programmatic API

```js
import { buildGraph, findPaths, findPathByType, queryByType } from '@effectorhq/graph';
import { diffGraphs, computeStats } from '@effectorhq/graph';
import { renderSVG } from '@effectorhq/graph/renderers/svg';
import { renderSpectrum, wrapInHTML } from '@effectorhq/graph/renderers/spectrum';
import { SECTORS, RINGS, getTypeRing, getTypeSector, getAllTypes } from '@effectorhq/graph/spectrum/sectors';
import { layoutTypes, polarToCartesian } from '@effectorhq/graph/spectrum/layout';
import { loadRegistry } from '@effectorhq/graph/registry';

// Build graph from a directory of Effector packages
const effectors = loadRegistry('./skills');
const graph = buildGraph(effectors);

// Query
const codeTools = queryByType(graph, { input: 'CodeDiff' });
const paths = findPathByType(graph, 'CodeDiff', 'Notification');

// Diff two graphs
const diff = diffGraphs(graphA, graphB);
// → { added, removed, modified, addedEdges, removedEdges }

// Dashboard statistics
const stats = computeStats(graph);
// → { typeDistribution, mostComposed, trustCoverage, typeCoverage, edgeBreakdown }

// Render static SVG/HTML
const svg = renderSpectrum({ highlight: { input: 'CodeDiff', output: 'ReviewReport' } });
const html = wrapInHTML(svg);
```

## Architecture

```
effector-graph/
  bin/effector-graph.js       CLI entry point (serve, spectrum, query, path, find-path, render, export)
  src/
    index.js                  Barrel exports (graph, diff, stats)
    registry.js               Load effector.toml files from a directory tree
    core/
      graph.js                Graph construction, BFS path finding, type-based queries
      diff.js                 diffGraphs() — added/removed/modified nodes and edges
      stats.js                computeStats() — type distribution, trust coverage, most-composed
      type-checker.js         Structural subtype checking (backed by @effectorhq/types)
    renderers/
      svg.js                  Static SVG graph renderer
      spectrum.js             Polar SVG spectrum renderer (40 types, 8 sectors, 4 rings)
    spectrum/
      sectors.js              8 sector definitions + type-to-ring/sector mapping
      layout.js               Polar coordinate math for Spectrum positioning
    web/
      server.js               HTTP server (node:http) — serves app.html + REST API
      app.html                Single-file interactive UI (D3 force graph, Spectrum, Dashboard, Pipeline, Diff)
      widget.js               Web Components: <effector-graph> and <effector-spectrum> (Shadow DOM)
  vscode/
    package.json              VS Code extension manifest
    extension.js              Webview panel — scans workspace effector.toml, live file watching
  tests/
    *.test.js                 43 tests (node:test, zero dependencies)
```

## Options

```
-r, --registry <dir>   Directory to scan for effector.toml files (default: .)
    --port <n>         Port for the serve command (default: 4200)
    --no-open          Do not auto-open browser when serving
    --input <type>     Filter by input type
    --output <type>    Filter by output type
    --from <type>      Source type for find-path
    --to <type>        Target type for find-path
-f, --format <fmt>     Output format: svg, html, json (default: svg)
    --trust            Show trust overlay (signed/unsigned/audited)
-h, --help             Show help
-v, --version          Show version
```

## License

[Apache-2.0](./LICENSE)

This project is currently licensed under the Apache 2.0 License 。
---

<sub>Part of <a href="https://github.com/effectorHQ">effectorHQ</a>. We build hands for AI that moves first.</sub>
