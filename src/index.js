/**
 * @effectorhq/graph — Capability graph builder and query engine.
 *
 * Build a directed graph from typed Effector definitions, query it by type,
 * find composition paths, and visualize capability chains.
 *
 * @example
 * import { buildGraph, queryByType, findPaths } from '@effectorhq/graph';
 * import { loadRegistry } from '@effectorhq/graph/registry';
 *
 * const effectors = loadRegistry('./skills');
 * const graph = buildGraph(effectors);
 *
 * // Find all effectors that accept CodeDiff as input
 * const matches = queryByType(graph, { input: 'CodeDiff' });
 *
 * // Find composition paths between two effectors
 * const paths = findPaths(graph, 'code-review@1.0.0', 'slack-notify@1.0.0');
 */

export { buildGraph, findPaths, findPathByType, queryByType } from './core/graph.js';
export { renderSVG, renderPipelineSVG } from './renderers/svg.js';
export { renderSpectrum, wrapInHTML } from './renderers/spectrum.js';
export { SECTORS, RINGS, getTypeRing, getTypeSector, getAllTypes } from './spectrum/sectors.js';
export { layoutTypes, polarToCartesian } from './spectrum/layout.js';
export { loadRegistry } from './registry.js';
export { diffGraphs } from './core/diff.js';
export { computeStats } from './core/stats.js';
