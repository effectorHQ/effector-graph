/**
 * Registry loader for effector-graph.
 *
 * Scans directories for effector.toml manifests and builds an array
 * suitable for buildGraph(). Zero external dependencies.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Parse an effector.toml file into an EffectorDef object.
 *
 * @param {string} content - Raw effector.toml content
 * @returns {object} EffectorDef with name, version, type, interface
 */
export function parseEffectorToml(content) {
  const name = extractField(content, 'name');
  const version = extractField(content, 'version');
  const type = extractField(content, 'type');
  const description = extractField(content, 'description');

  const input = extractField(content, 'input');
  const output = extractField(content, 'output');
  const contextMatch = content.match(/^\s*context\s*=\s*\[([^\]]*)\]/m);
  const context = contextMatch
    ? contextMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean)
    : [];

  const network = extractBoolField(content, 'network');
  const subprocess = extractBoolField(content, 'subprocess');

  return {
    name,
    version,
    type,
    description,
    interface: { input, output, context },
    permissions: { network, subprocess },
  };
}

function extractField(content, key) {
  const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*"(.+?)"`, 'm'));
  return match ? match[1] : null;
}

function extractBoolField(content, key) {
  const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*(true|false)`, 'm'));
  return match ? match[1] === 'true' : false;
}

/**
 * Scan a directory for effector.toml files and return an array of EffectorDefs
 * suitable for buildGraph().
 *
 * @param {string} searchDir - Directory to scan
 * @returns {Array<object>} Array of EffectorDef objects
 */
export function loadRegistry(searchDir) {
  const effectors = [];

  if (!existsSync(searchDir)) return effectors;

  const rootToml = join(searchDir, 'effector.toml');
  if (existsSync(rootToml)) {
    const def = parseEffectorToml(readFileSync(rootToml, 'utf-8'));
    if (def.name) effectors.push(def);
  }

  try {
    const entries = readdirSync(searchDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const tomlPath = join(searchDir, entry.name, 'effector.toml');
      if (existsSync(tomlPath)) {
        const def = parseEffectorToml(readFileSync(tomlPath, 'utf-8'));
        if (def.name) effectors.push(def);
      }
    }
  } catch { /* directory not readable */ }

  return effectors;
}
