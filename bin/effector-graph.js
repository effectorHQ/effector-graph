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
import { buildGraph, findPaths, findPathByType, queryByType } from '../src/core/graph.js';
import { renderSVG, renderPipelineSVG } from '../src/renderers/svg.js';
import { renderSpectrum, wrapInHTML } from '../src/renderers/spectrum.js';
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
    from: { type: 'string' },
    to: { type: 'string' },
    port: { type: 'string', short: 'p', default: '4200' },
    'no-open': { type: 'boolean', default: false },
  },
});

if (values.version) {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  console.log(`effector-graph ${pkg.version}`);
  process.exit(0);
}

if (values.help || positionals.length === 0) {
  console.log(`
effector-graph — Capability graph visualization

Commands:
  spectrum [dir]            Render capability spectrum (all 36+ types)
  serve                     Launch interactive web UI (D3.js, dashboard, diff)
  render <pipeline.yml>     Render pipeline as SVG/PNG/HTML
  query                     Search by interface type (--input, --output)
  path <source> <target>    Find composition paths between Effectors
  find-path                 Find paths by type: --from <type> --to <type>
  export                    Export full graph (--format json|svg)

Options:
  -r, --registry <dir>  Directory to scan for effector.toml files (default: .)
  --input <type>        Filter by input type
  --output <type>       Filter by output type
  -f, --format <fmt>    Output format: svg, png, html, json (default: svg)
  --trust               Show trust overlay (signed/unsigned/audited)
  -p, --port <port>     Port for serve command (default: 4200)
  --no-open             Don't auto-open browser
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
    case 'spectrum': {
      // Optionally load a tool definition to highlight
      const toolDir = args[0];
      let highlight = {};
      if (toolDir) {
        try {
          const { parseEffectorToml } = await import('@effectorhq/core/toml');
          const tomlContent = readFileSync(`${toolDir}/effector.toml`, 'utf-8');
          const def = parseEffectorToml(tomlContent);
          highlight = {
            input: def.interface?.input,
            output: def.interface?.output,
            context: def.interface?.context || [],
          };
        } catch {
          console.error(`Warning: Could not load effector.toml from "${toolDir}"`);
        }
      }

      const format = values.format || 'html';
      const svg = renderSpectrum({ highlight });

      if (format === 'html') {
        console.log(wrapInHTML(svg));
      } else {
        console.log(svg);
      }
      process.exit(0);
    }

    case 'serve': {
      const { createServer } = await import('../src/web/server.js');
      const { platform } = await import('node:os');
      const { exec } = await import('node:child_process');
      const port = parseInt(values.port || '4200', 10);
      const server = createServer({ registry: values.registry });
      server.listen(port, () => {
        console.log(`\n  effector-graph interactive UI`);
        console.log(`  http://localhost:${port}\n`);
        if (!values['no-open']) {
          const cmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start' : 'xdg-open';
          exec(`${cmd} http://localhost:${port}`);
        }
      });
      break;
    }

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

    case 'find-path': {
      const fromType = values.from;
      const toType = values.to;
      if (!fromType || !toType) {
        console.error('Usage: effector-graph find-path --from <type> --to <type> [--registry <dir>]');
        process.exit(1);
      }
      const effectors = loadEffectors();
      if (effectors.length === 0) {
        console.error('No effectors found. Use --registry <dir>.');
        process.exit(1);
      }
      const graph = buildGraph(effectors);
      const typePaths = findPathByType(graph, fromType, toType);

      if (typePaths.length === 0) {
        console.log(`\nNo composition paths found from ${fromType} to ${toType}.`);
        console.log('Available types:');
        const types = new Set();
        for (const n of graph.nodes) {
          if (n.interface.input) types.add(n.interface.input);
          if (n.interface.output) types.add(n.interface.output);
        }
        for (const t of types) console.log(`  ${t}`);
        console.log('');
      } else {
        console.log(`\nFound ${typePaths.length} path(s) from ${fromType} to ${toType}:\n`);
        for (let i = 0; i < typePaths.length; i++) {
          const p = typePaths[i];
          const chain = p.path.map(s => `${s.id} (${s.input}→${s.output})`).join(' → ');
          console.log(`  ${i + 1}. ${chain}  [weight: ${p.weight.toFixed(2)}]`);
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
