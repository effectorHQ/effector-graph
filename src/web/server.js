/**
 * Interactive graph visualization server.
 *
 * Routes:
 *   GET  /              → app.html (interactive D3.js UI)
 *   GET  /api/graph     → full capability graph as JSON
 *   GET  /api/spectrum  → spectrum layout data
 *   GET  /api/types     → type catalog
 *   GET  /api/stats     → dashboard statistics
 *   GET  /api/trust     → trust overlay data
 *   POST /api/diff      → diff two graphs
 *   GET  /widget.js     → web components script
 */

import { createServer as httpCreateServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph, queryByType } from '../core/graph.js';
import { computeStats } from '../core/stats.js';
import { diffGraphs } from '../core/diff.js';
import { loadRegistry } from '../registry.js';
import { layoutTypes, getSectorBoundaryAngles, getSectorLabelPositions } from '../spectrum/layout.js';
import { SECTORS, RINGS, getAllTypes } from '../spectrum/sectors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function loadTypeCatalog() {
  const paths = [
    join(__dirname, '..', '..', '..', 'effector-core', 'src', 'types-catalog.json'),
    join(__dirname, '..', '..', 'node_modules', '@effectorhq', 'core', 'src', 'types-catalog.json'),
  ];
  for (const p of paths) {
    try { return JSON.parse(readFileSync(p, 'utf-8')); } catch {}
  }
  return { types: { input: {}, output: {}, context: {} } };
}

/**
 * Create the graph visualization server.
 * @param {{ registry?: string }} options
 */
export function createServer(options = {}) {
  const registryDir = options.registry || '.';

  // Pre-build graph data
  let effectors = loadRegistry(registryDir);
  if (effectors.length === 0) {
    // Demo data
    effectors = [
      { name: 'code-review', version: '1.2.0', type: 'skill', interface: { input: 'CodeDiff', output: 'ReviewReport' }, trust: { signedBy: 'effectorhq', audited: true } },
      { name: 'security-scan', version: '2.0.0', type: 'skill', interface: { input: 'CodeDiff', output: 'SecurityReport' }, trust: { signedBy: 'effectorhq' } },
      { name: 'lint-check', version: '1.5.0', type: 'skill', interface: { input: 'CodeSnippet', output: 'LintReport' }, trust: {} },
      { name: 'aggregate-report', version: '1.0.0', type: 'workflow', interface: { input: 'ReviewReport', output: 'Markdown' }, trust: { signedBy: 'team-lead' } },
      { name: 'slack-notify', version: '0.5.0', type: 'skill', interface: { input: 'Markdown', output: 'Notification' }, trust: {} },
      { name: 'discord-notify', version: '0.3.0', type: 'extension', interface: { input: 'Markdown', output: 'DiscordMessage' }, trust: {} },
      { name: 'translate', version: '1.1.0', type: 'skill', interface: { input: 'String', output: 'TranslatedText' }, trust: { signedBy: 'i18n-team' } },
      { name: 'summarize', version: '2.0.0', type: 'skill', interface: { input: 'String', output: 'Summary' }, trust: { signedBy: 'nlp-team', audited: true } },
      { name: 'docker-deploy', version: '0.8.0', type: 'skill', interface: { input: 'JSON', output: 'DeploymentStatus' }, trust: {} },
      { name: 'api-fetch', version: '1.0.0', type: 'skill', interface: { input: 'URL', output: 'JSON' }, trust: { signedBy: 'core-team' } },
      { name: 'data-transform', version: '1.3.0', type: 'workflow', interface: { input: 'JSON', output: 'DataTable' }, trust: {} },
      { name: 'test-runner', version: '2.1.0', type: 'skill', interface: { input: 'Repository', output: 'TestResult' }, trust: { signedBy: 'ci-team', audited: true } },
    ];
  }

  const graph = buildGraph(effectors);
  const stats = computeStats(graph);
  const spectrumData = {
    types: layoutTypes(),
    sectors: SECTORS,
    rings: RINGS,
    boundaries: getSectorBoundaryAngles(),
    labels: getSectorLabelPositions(),
    allTypes: getAllTypes(),
  };

  const appHtml = readFileSync(join(__dirname, 'app.html'), 'utf-8');
  let widgetJs = '';
  try { widgetJs = readFileSync(join(__dirname, 'widget.js'), 'utf-8'); } catch {}

  return httpCreateServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
      // GET / — serve UI
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(appHtml);
        return;
      }

      // GET /widget.js — serve web components
      if (req.method === 'GET' && url.pathname === '/widget.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' });
        res.end(widgetJs);
        return;
      }

      // GET /api/graph
      if (req.method === 'GET' && url.pathname === '/api/graph') {
        json(res, graph);
        return;
      }

      // GET /api/spectrum
      if (req.method === 'GET' && url.pathname === '/api/spectrum') {
        json(res, spectrumData);
        return;
      }

      // GET /api/types
      if (req.method === 'GET' && url.pathname === '/api/types') {
        json(res, loadTypeCatalog());
        return;
      }

      // GET /api/stats
      if (req.method === 'GET' && url.pathname === '/api/stats') {
        json(res, stats);
        return;
      }

      // GET /api/trust
      if (req.method === 'GET' && url.pathname === '/api/trust') {
        const trustData = graph.nodes.map(n => ({
          id: n.id,
          name: n.name,
          signed: !!n.trust?.signedBy,
          signedBy: n.trust?.signedBy || null,
          audited: !!n.trust?.audited,
          trustLevel: n.trust?.audited ? 'verified' : n.trust?.signedBy ? 'signed' : n.type === 'workspace' ? 'local' : 'unsigned',
        }));
        json(res, { effectors: trustData });
        return;
      }

      // POST /api/diff
      if (req.method === 'POST' && url.pathname === '/api/diff') {
        const body = await readBody(req);
        const graphA = body.a || { nodes: [], edges: [], stats: {} };
        const graphB = body.b || { nodes: [], edges: [], stats: {} };
        const diff = diffGraphs(graphA, graphB);
        json(res, diff);
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch (e) {
      json(res, { error: e.message }, 500);
    }
  });
}
