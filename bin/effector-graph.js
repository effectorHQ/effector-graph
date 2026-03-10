#!/usr/bin/env node

/**
 * effector-graph — Interactive visualization of the AI capability graph.
 *
 * Usage:
 *   effector-graph serve                        Launch interactive web UI
 *   effector-graph render <pipeline.yml>         Render pipeline as SVG
 *   effector-graph query --input <type>          Search by interface type
 *   effector-graph path <source> <target>        Find composition paths
 *   effector-graph export --format json          Export full graph
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { buildGraph, findPaths, queryByType } from '../src/core/graph.js';
import { renderSVG, renderPipelineSVG } from '../src/renderers/svg.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    input: { type: 'string' },
    output: { type: 'string' },
    format: { type: 'string', short: 'f', default: 'svg' },
    trust: { type: 'boolean', default: false },
  },
});

if (values.version) {
  console.log('effector-graph 0.1.0');
  process.exit(0);
}

if (values.help || positionals.length === 0) {
  console.log(`
effector-graph — Capability graph visualization

Commands:
  serve                     Launch interactive web UI (coming soon)
  render <pipeline.yml>     Render pipeline as SVG/PNG/HTML
  query                     Search by interface type (--input, --output)
  path <source> <target>    Find composition paths between Effectors
  export                    Export full graph (--format json|svg)

Options:
  --input <type>      Filter by input type
  --output <type>     Filter by output type
  -f, --format <fmt>  Output format: svg, png, html, json (default: svg)
  --trust             Show trust overlay (signed/unsigned/audited)
  -h, --help          Show this help
  -v, --version       Show version
`);
  process.exit(0);
}

const [command, ...args] = positionals;

async function main() {
  switch (command) {
    case 'serve':
      console.log('Interactive web UI is coming in v0.2.');
      console.log('For now, use "render" to generate static visualizations.');
      process.exit(0);

    case 'render': {
      const pipelinePath = args[0];
      if (!pipelinePath) {
        console.error('Usage: effector-graph render <pipeline.yml>');
        process.exit(1);
      }
      // For now, render a simple demo SVG
      const demoGraph = buildGraph([
        { name: 'code-review', version: '1.2.0', type: 'skill', interface: { input: 'CodeDiff', output: 'ReviewReport' } },
        { name: 'security-scan', version: '2.0.0', type: 'skill', interface: { input: 'CodeDiff', output: 'SecurityReport' } },
        { name: 'aggregate-report', version: '1.0.0', type: 'workflow', interface: { input: 'ReviewReport', output: 'AggregateReport' } },
        { name: 'slack-notify', version: '0.5.0', type: 'skill', interface: { input: 'AggregateReport', output: 'Notification' } },
      ]);
      const svg = renderSVG(demoGraph, { showTrust: values.trust });
      const outPath = pipelinePath.replace(/\.\w+$/, '.svg');
      writeFileSync(outPath, svg);
      console.log(`Rendered to ${outPath}`);
      process.exit(0);
    }

    case 'query': {
      console.log(`Querying for: input=${values.input || '*'}, output=${values.output || '*'}`);
      // In production, this would query a real registry
      console.log('Registry query is coming in v0.3. Connect to effector-types for type-based search.');
      process.exit(0);
    }

    case 'path': {
      const [source, target] = args;
      if (!source || !target) {
        console.error('Usage: effector-graph path <source> <target>');
        process.exit(1);
      }
      console.log(`Finding paths from ${source} to ${target}...`);
      console.log('Path finding requires a loaded graph. Coming in v0.3.');
      process.exit(0);
    }

    case 'export': {
      console.log('Graph export is coming in v0.3.');
      process.exit(0);
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
