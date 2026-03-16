# effector-graph

[![npm version](https://img.shields.io/badge/npm-effector--graph-E03E3E.svg)](https://www.npmjs.com/package/effector-graph)
[![CI](https://github.com/effectorHQ/effector-graph/actions/workflows/test.yml/badge.svg)](https://github.com/effectorHQ/effector-graph/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status: Alpha](https://img.shields.io/badge/status-alpha-orange.svg)](#)

**Interactive visualization of the AI capability graph.**

---

## What This Is

Every typed Effector declares an interface: what it accepts, what it produces, what it composes with. When you collect thousands of typed Effectors, a structure emerges — a **capability graph** where nodes are capabilities and edges are composition relationships.

`effector-graph` makes this graph visible, navigable, and interactive.

```
                    ┌─────────────┐
                    │  CodeDiff   │
                    └──────┬──────┘
                           │ input
              ┌────────────┼────────────┐
              ▼            ▼            ▼
      ┌──────────┐  ┌───────────┐  ┌────────┐
      │code-review│  │security-  │  │  lint  │
      │  @1.2.0  │  │scan @2.0  │  │ @3.1.0 │
      └────┬─────┘  └─────┬─────┘  └───┬────┘
           │              │             │
    ReviewReport    SecurityReport   LintReport
           │              │             │
           └──────────────┼─────────────┘
                          ▼
                 ┌────────────────┐
                 │aggregate-report│
                 │    @1.0.0     │
                 └───────┬───────┘
                         │
                  AggregateReport
                         │
                         ▼
                 ┌───────────────┐
                 │  slack-notify │
                 │    @0.5.0    │
                 └───────────────┘
```

This isn't a static diagram. It's a live, queryable visualization of what your agents **can** do and how their capabilities connect.

## Install

```bash
npm install effector-graph
```

You can also use the CLI directly without installing globally:

```bash
npx effector-graph ./skills
```

See the published package on npm: **https://www.npmjs.com/package/effector-graph**

## Why Visualize the Capability Graph

The capability graph is the emergent structure that arises when AI agent tools get typed interfaces. It's important for three reasons:

**1. Discovery.** Developers building agent workflows need to find capabilities that fit their pipeline. A visual graph lets you trace paths: "I have a CodeDiff — what can I do with it? Where does it lead?" You explore by following typed edges, not by searching keywords.

**2. Understanding.** Multi-agent systems are complex. A team deploying a 12-step agent workflow needs to see the full composition — types flowing between steps, parallel branches, conditional paths, fallback routes. Without visualization, composition errors hide until runtime.

**3. Trust.** The graph reveals the supply chain. Which Effectors are signed? Which have audit reports? Where are the unsigned community dependencies? Visual trust indicators make security posture legible at a glance.

Research supports this. The GAP framework (NeurIPS 2025, [arXiv:2510.25320](https://arxiv.org/abs/2510.25320)) showed that explicit dependency graphs outperform sequential agent planning. The MCP-Zero paper ([arXiv:2506.01056](https://arxiv.org/abs/2506.01056)) found that agents don't explore available tools — they need mechanisms for active discovery. `effector-graph` provides the human-facing interface for both.

## Features

### Interactive Web UI

```bash
npx effector-graph serve

  ✓ Loaded 847 typed Effectors from registry
  ✓ Graph: 847 nodes, 3,241 composition edges
  ✓ Serving at http://localhost:4200
```

Opens a browser-based visualization with:

- **Force-directed graph layout** — capabilities cluster by type affinity
- **Type-based filtering** — show only Effectors matching a type signature
- **Path tracing** — highlight all valid composition paths between two Effectors
- **Trust overlay** — color nodes by signing status (signed/unsigned/audited)
- **Cost heatmap** — visualize cost distribution across a pipeline
- **Search** — find Effectors by type, name, or description

### Pipeline Visualization

Render a specific pipeline from `effector-compose`:

```bash
npx effector-graph render ./pipeline.effector.yml --format svg
npx effector-graph render ./pipeline.effector.yml --format png
npx effector-graph render ./pipeline.effector.yml --format html  # interactive
```

### Embeddable Widget

Drop the graph into any web page:

```html
<script src="https://unpkg.com/effector-graph/widget.js"></script>
<effector-graph
  registry="https://registry.effectorhq.dev"
  filter="input:CodeDiff"
  height="600px"
/>
```

### CLI Exploration

For terminal-first workflows:

```bash
# Show all Effectors that accept CodeDiff
npx effector-graph query --input CodeDiff

# Show composition paths from code-review to slack-notify
npx effector-graph path code-review@1.2.0 slack-notify@0.5.0

# Show the dependency tree of a pipeline
npx effector-graph tree ./pipeline.effector.yml

# Export the full graph as JSON (for custom visualization)
npx effector-graph export --format json > graph.json
```

## Visualization Modes

### Capability Explorer

The default mode. Shows the full capability graph with type-colored nodes:

- 🟢 **Signed & audited** — verified by effector-audit
- 🟡 **Signed, not audited** — identity verified, content not scanned
- 🔴 **Unsigned** — no provenance information
- ⬜ **Local** — workspace-level Effectors, not published

Edges represent composition compatibility (structural subtype matching). Edge thickness indicates how many real pipelines use that composition.

### Pipeline View

Focused view for a single pipeline. Shows:
- Step sequence with type annotations on each edge
- Parallel branches rendered as swim lanes
- Conditional branches rendered as decision diamonds
- Cost per step and cumulative cost
- Permission aggregation across the pipeline

### Diff View

Compare two versions of a pipeline or two competing pipeline designs:

```bash
npx effector-graph diff pipeline-v1.yml pipeline-v2.yml
```

Highlights: added steps, removed steps, changed types, cost difference, permission changes.

### Registry Dashboard

Overview of a capability registry:

```bash
npx effector-graph dashboard --registry https://registry.effectorhq.dev
```

Shows: type distribution, most-composed Effectors, trust coverage, cost distribution, growth trends.

## Architecture

```
effector-graph
├── core/              # Graph data model and algorithms
│   ├── graph.js       # Capability graph construction from typed Effectors
│   ├── layout.js      # Force-directed and hierarchical layout algorithms
│   ├── query.js       # Type-based graph queries
│   └── path.js        # Composition path finding (typed BFS/DFS)
├── renderers/         # Output formats
│   ├── svg.js         # Static SVG rendering
│   ├── html.js        # Interactive HTML (D3.js-based)
│   ├── terminal.js    # ASCII art for CLI
│   └── json.js        # Machine-readable graph export
├── web/               # Browser-based UI
│   ├── app.jsx        # React application
│   ├── components/    # Explorer, Pipeline, Diff, Dashboard views
│   └── widget.js      # Embeddable web component
├── cli/               # Command-line interface
│   └── index.js       # CLI commands (serve, render, query, path, tree, export)
└── integrations/      # IDE and tool integrations
    ├── vscode.js      # VS Code extension API
    └── compose.js     # Integration with effector-compose
```

## Roadmap

- [x] **v0.1** — CLI graph queries (`query`, `path`, `export`), registry loader, type-checker backed by effector-types/types.json
- [ ] **v0.2** — Interactive web UI with force-directed layout
- [ ] **v0.3** — Trust overlay, cost heatmap, permission aggregation
- [ ] **v0.4** — Embeddable widget, registry dashboard
- [ ] **v0.5** — VS Code extension, IDE integration
- [ ] **v1.0** — Production-ready visualization platform

## Contributing

Visualization needs design sensibility. We especially need:

- **UX design** — The graph should be beautiful and intuitive, not just technically correct
- **Performance** — Rendering 10,000+ nodes smoothly requires WebGL or clever D3 optimization
- **Accessibility** — Screen reader support, color-blind safe palettes, keyboard navigation
- **Real-world testing** — Use the graph with your actual agent workflows and tell us what's missing

## License

[MIT](./LICENSE)

---

<sub>Part of the <a href="https://github.com/effectorHQ">effectorHQ</a> studio. We build hands for AI.</sub>
