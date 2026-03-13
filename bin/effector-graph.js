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
import { loadRegistry } from '../src/registry.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    registry: { type: 'string', short: 'r', default: '.' },
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
  serve                     Launch interactive web UI (coming in v0.2)
  render <pipeline.yml>     Render pipeline as SVG/PNG/HTML
  query                     Search by interface type (--input, --output)
  path <source> <target>    Find composition paths between Effectors
  export                    Export full graph (--format json|svg)

Options:
  -r, --registry <dir>  Directory to scan for effector.toml files (default: .)
  --input <type>        Filter by input type
  --output <type>       Filter by output type
  -f, --format <fmt>    Output format: svg, png, html, json (default: svg)
  --trust               Show trust overlay (signed/unsigned/audited)
  -h, --help            Show this help
  -v, --version         Show version
`);
  process.exit(0);
}

const [command, ...args] = positionals;

// Demo data used as fallback when no registry is provided
const DEMO_EFFECTORS = [
  { name: 'code-review', version: '1.2.0', type: 'skill', interface: { input: 'CodeDiff', output: 'ReviewReport' } },
  { name: 'security-scan', version: '2.0.0', type: 'skill', interface: { input: 'CodeDiff', output: 'SecurityReport' } },
  { name: 'aggregate-report', version: '1.0.0', type: 'workflow', interface: { input: 'ReviewReport', output: 'AggregateReport' } },
  { name: 'slack-notify', version: '0.5.0', type: 'skill', interface: { input: 'AggregateReport', output: 'Notification' } },
];

/**
 * Load effectors from registry or fall back to demo data.
 */
function loadEffectors() {
  const registryDir = values.registry;
  const effectors = loadRegistry(registryDir);

  if (effectors.length > 0) {
    console.error(`Loaded ${effectors.length} effector(s) from registry`);
    return effectors;
  }

  if (registryDir !== '.') {
    console.error(`Warning: No effector.toml files found in "${registryDir}"`);
    return [];
  }

  // Fall back to demo data when no --registry flag and no local effectors
  return DEMO_EFFECTORS;
}

async function main() {
  switch (command) {
    case 'serve':
      console.log('Interactive web UI is coming in v0.2.');
      console.log('For now, use "render" to generate static visualizations.');
      process.exit(0);

    case 'render': {
      const pipelinePath = args[0];
      if (!pipelinePath) {
        console.error('Usage: effector-graph render <pipeline.yml> [--registry <dir>]');
        process.exit(1);
      }
      const effectors = loadEffectors();
      const graph = buildGraph(effectors);
      const svg = renderSVG(graph, { showTrust: values.trust });
      const outPath = pipelinePath.replace(/\.\w+$/, '.svg');
      writeFileSync(outPath, svg);
      console.log(`Rendered to ${outPath} (${graph.stats.nodeCount} nodes, ${graph.stats.edgeCount} edges)`);
      process.exit(0);
    }

    case 'query': {
      const effectors = loadEffectors();
      if (effectors.length === 0) {
        console.error('No effectors found. Use --registry <dir> to point to Effector packages.');
        process.exit(1);
      }
      const graph = buildGraph(effectors);
      const results = queryByType(graph, {
        input: values.input || undefined,
        output: values.output || undefined,
      });

      console.log(`\nFound ${results.length} matching effector(s):\n`);
      for (const node of results) {
        const inputLabel = node.interface.input || '*';
        const outputLabel = node.interface.output || '*';
        console.log(`  ${node.name}@${node.version}  (${inputLabel} -> ${outputLabel})`);
      }
      console.log('');
      process.exit(0);
    }

    case 'path': {
      const [source, target] = args;
      if (!source || !target) {
        console.error('Usage: effector-graph path <source> <target> [--registry <dir>]');
        process.exit(1);
      }
      const effectors = loadEffectors();
      if (effectors.length === 0) {
        console.error('No effectors found. Use --registry <dir>.');
        process.exit(1);
      }
      const graph = buildGraph(effectors);
      const paths = findPaths(graph, source, target);

      if (paths.length === 0) {
        console.log(`\nNo composition paths found from "${source}" to "${target}".`);
        console.log('Hint: source and target should be in the format "name@version".\n');
      } else {
        console.log(`\nFound ${paths.length} path(s) from "${source}" to "${target}":\n`);
        for (let i = 0; i < paths.length; i++) {
          console.log(`  ${i + 1}. ${paths[i].join(' -> ')}`);
        }
        console.log('');
      }
      process.exit(0);
    }

    case 'export': {
      const effectors = loadEffectors();
      if (effectors.length === 0) {
        console.error('No effectors found. Use --registry <dir>.');
        process.exit(1);
      }
      const graph = buildGraph(effectors);
      const format = values.format || 'json';

      if (format === 'json') {
        console.log(JSON.stringify(graph, null, 2));
      } else if (format === 'svg') {
        const svg = renderSVG(graph, { showTrust: values.trust });
        console.log(svg);
      } else {
        console.error(`Unknown format: ${format}. Supported: json, svg`);
        process.exit(1);
      }
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
