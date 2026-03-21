/**
 * Effector Graph — VS Code Extension
 *
 * Shows an interactive capability graph in a webview panel.
 * Automatically scans the workspace for effector.toml files,
 * builds the graph, and sends it to the webview for D3.js rendering.
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let graphPanel = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Command: Show Capability Graph
  context.subscriptions.push(
    vscode.commands.registerCommand('effectorGraph.show', async () => {
      if (graphPanel) {
        graphPanel.reveal();
        return;
      }
      graphPanel = createWebviewPanel(context, 'graph');
      graphPanel.onDidDispose(() => { graphPanel = null; });
      await loadAndSendGraph(graphPanel);
    })
  );

  // Command: Show Type Spectrum
  context.subscriptions.push(
    vscode.commands.registerCommand('effectorGraph.showSpectrum', async () => {
      const panel = createWebviewPanel(context, 'spectrum');
      await loadAndSendGraph(panel);
    })
  );

  // File watcher — re-scan when effector.toml changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/effector.toml');
  watcher.onDidChange(async () => {
    if (graphPanel) await loadAndSendGraph(graphPanel);
  });
  watcher.onDidCreate(async () => {
    if (graphPanel) await loadAndSendGraph(graphPanel);
  });
  watcher.onDidDelete(async () => {
    if (graphPanel) await loadAndSendGraph(graphPanel);
  });
  context.subscriptions.push(watcher);
}

function createWebviewPanel(context, defaultView) {
  const panel = vscode.window.createWebviewPanel(
    'effectorGraph',
    'Effector Graph',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(context.extensionPath, '..')),
      ],
    }
  );

  // Load the app.html from the parent package
  const appHtmlPath = path.join(context.extensionPath, '..', 'src', 'web', 'app.html');
  let html = '';
  try {
    html = fs.readFileSync(appHtmlPath, 'utf-8');
  } catch {
    html = '<html><body style="color:#fff;background:#0F0F0F;padding:40px"><h2>Could not load app.html</h2><p>Make sure @effectorhq/graph is installed.</p></body></html>';
  }

  // Inject VS Code detection and default view
  html = html.replace('</head>', `
    <script>
      window.__VSCODE__ = true;
      window.__DEFAULT_VIEW__ = '${defaultView}';
    </script>
  </head>`);

  panel.webview.html = html;
  return panel;
}

async function loadAndSendGraph(panel) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    panel.webview.postMessage({ type: 'graphData', data: { nodes: [], edges: [], stats: { nodeCount: 0, edgeCount: 0, density: 0 } } });
    return;
  }

  // Scan for effector.toml files
  const effectors = [];
  const tomlFiles = await vscode.workspace.findFiles('**/effector.toml', '**/node_modules/**', 50);

  for (const uri of tomlFiles) {
    try {
      const content = (await vscode.workspace.fs.readFile(uri)).toString();
      const def = parseEffectorTomlBasic(content);
      if (def.name) effectors.push(def);
    } catch {}
  }

  // Build graph in-process (lightweight version)
  const nodes = [];
  const edges = [];

  for (const eff of effectors) {
    const id = `${eff.name}@${eff.version || '0.0.0'}`;
    nodes.push({
      id,
      name: eff.name,
      version: eff.version || '0.0.0',
      type: eff.type || 'skill',
      interface: eff.interface || {},
      trust: {},
    });
  }

  // Build edges based on type matching
  for (const a of nodes) {
    for (const b of nodes) {
      if (a.id === b.id) continue;
      if (a.interface.output && b.interface.input && a.interface.output === b.interface.input) {
        edges.push({ source: a.id, target: b.id, type: 'sequential', weight: 1.0 });
      }
    }
  }

  const graph = {
    nodes,
    edges,
    stats: { nodeCount: nodes.length, edgeCount: edges.length, density: nodes.length > 1 ? edges.length / (nodes.length * (nodes.length - 1)) : 0 },
  };

  panel.webview.postMessage({ type: 'graphData', data: graph });

  // Also send spectrum and stats data — use dynamic import() since parent package is ESM
  try {
    const { pathToFileURL } = require('url');
    const layoutMod = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'spectrum', 'layout.js')).href);
    const sectorsMod = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'spectrum', 'sectors.js')).href);
    panel.webview.postMessage({
      type: 'spectrumData',
      data: {
        types: layoutMod.layoutTypes(),
        sectors: sectorsMod.SECTORS,
        rings: sectorsMod.RINGS,
        boundaries: layoutMod.getSectorBoundaryAngles(),
        labels: layoutMod.getSectorLabelPositions(),
      },
    });
  } catch (e) {
    console.error('[effector-graph] Failed to load spectrum data:', e.message);
  }
}

/**
 * Basic TOML parser for effector.toml — extracts name, version, type, interface.
 * Does not depend on @effectorhq/core (which may not be installed).
 */
function parseEffectorTomlBasic(content) {
  const def = { interface: {} };
  let section = '';

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed === '') continue;

    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) { section = sectionMatch[1]; continue; }

    const kvMatch = trimmed.match(/^(\w+)\s*=\s*"?([^"]*)"?$/);
    if (!kvMatch) continue;

    const [, key, value] = kvMatch;

    if (section === 'effector' || section === '') {
      if (key === 'name') def.name = value;
      if (key === 'version') def.version = value;
      if (key === 'type') def.type = value;
    }
    if (section === 'effector.interface') {
      if (key === 'input') def.interface.input = value;
      if (key === 'output') def.interface.output = value;
    }
  }

  return def;
}

function deactivate() {}

module.exports = { activate, deactivate };
