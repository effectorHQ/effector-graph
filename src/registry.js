/**
 * Registry loader for effector-graph.
 *
 * Delegates to @effectorhq/core for TOML parsing and directory scanning.
 * Re-exports as array (for buildGraph()) instead of Map.
 */

import {
  parseEffectorToml,
  loadRegistryAsArray,
} from '../../effector-core/src/toml-parser.js';

/**
 * Scan a directory for effector.toml files and return an array.
 * @param {string} searchDir - Directory to scan
 * @returns {Array<object>}
 */
export function loadRegistry(searchDir) {
  return loadRegistryAsArray(searchDir);
}

export { parseEffectorToml };
