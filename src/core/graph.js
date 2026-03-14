/**
 * Capability graph construction from typed Effectors.
 * Nodes are capabilities, edges are composition relationships.
 */

import { isTypeCompatible } from './type-checker.js';

/**
 * Build a capability graph from a collection of typed Effectors.
 * @param {Array<EffectorDef>} effectors - Collection of typed Effector definitions
 * @returns {Graph}
 */
export function buildGraph(effectors) {
  const nodes = new Map();
  const edges = [];

  // Create nodes
  for (const eff of effectors) {
    const id = `${eff.name}@${eff.version}`;
    nodes.set(id, {
      id,
      name: eff.name,
      version: eff.version,
      type: eff.type,
      interface: eff.interface || {},
      trust: eff.trust || {},
      resources: eff.resources || {},
    });
  }

  // Create edges based on type compatibility
  const effectorList = [...nodes.values()];
  for (const a of effectorList) {
    for (const b of effectorList) {
      if (a.id === b.id) continue;

      // Check if A's output can feed B's input (structural subtyping)
      if (a.interface.output && b.interface.input) {
        const compat = isTypeCompatible(a.interface.output, b.interface.input);
        if (compat) {
          edges.push({
            source: a.id,
            target: b.id,
            type: 'sequential',
            weight: compat.precision,
          });
        }
      }

      // Check explicit composition hints
      if (a.compose?.chainsBefore?.includes(b.name)) {
        const existing = edges.find((e) => e.source === a.id && e.target === b.id);
        if (!existing) {
          edges.push({ source: a.id, target: b.id, type: 'declared', weight: 1.0 });
        }
      }

      if (a.compose?.parallelWith?.includes(b.name)) {
        edges.push({ source: a.id, target: b.id, type: 'parallel', weight: 0.5 });
      }
    }
  }

  return {
    nodes: [...nodes.values()],
    edges,
    stats: {
      nodeCount: nodes.size,
      edgeCount: edges.length,
      density: nodes.size > 1 ? edges.length / (nodes.size * (nodes.size - 1)) : 0,
    },
  };
}

// isTypeCompatible is imported from ./type-checker.js
// Supports: exact match (1.0), alias (0.95), subtype (0.9), wildcard (0.8)

/**
 * Find all valid composition paths between two Effectors.
 * @param {Graph} graph
 * @param {string} sourceId
 * @param {string} targetId
 * @param {number} maxDepth
 * @returns {Array<string[]>}
 */
export function findPaths(graph, sourceId, targetId, maxDepth = 5) {
  const paths = [];
  const visited = new Set();

  function dfs(current, path) {
    if (path.length > maxDepth) return;
    if (current === targetId) {
      paths.push([...path]);
      return;
    }

    visited.add(current);
    const outEdges = graph.edges.filter((e) => e.source === current && !visited.has(e.target));

    for (const edge of outEdges) {
      dfs(edge.target, [...path, edge.target]);
    }
    visited.delete(current);
  }

  dfs(sourceId, [sourceId]);
  return paths;
}

/**
 * Find composition paths between two types.
 *
 * Given an input type (what you have) and an output type (what you want),
 * find all chains of effectors that transform one into the other.
 *
 * Example: findPathByType(graph, 'ImageRef', 'Markdown')
 * → Finds: image-ocr (ImageRef→String) → summarize (String→Markdown)
 *
 * @param {Graph} graph
 * @param {string} fromType - Input type you have
 * @param {string} toType - Output type you want
 * @param {number} maxDepth - Maximum chain length
 * @returns {Array<{path: Array<{id: string, input: string, output: string}>, weight: number}>}
 */
export function findPathByType(graph, fromType, toType, maxDepth = 5) {
  const results = [];

  // Find nodes that accept fromType as input
  const startNodes = graph.nodes.filter(n => {
    if (!n.interface.input) return false;
    return isTypeCompatible(fromType, n.interface.input) !== null;
  });

  // Find node IDs that produce toType as output
  const endNodeIds = new Set(
    graph.nodes
      .filter(n => {
        if (!n.interface.output) return false;
        return isTypeCompatible(n.interface.output, toType) !== null;
      })
      .map(n => n.id)
  );

  for (const start of startNodes) {
    const visited = new Set();

    function dfs(currentId, chain, totalWeight) {
      if (chain.length > maxDepth) return;

      if (endNodeIds.has(currentId) && chain.length > 0) {
        results.push({
          path: chain.map(id => {
            const node = graph.nodes.find(n => n.id === id);
            return {
              id: node.id,
              input: node.interface.input || '?',
              output: node.interface.output || '?',
            };
          }),
          weight: totalWeight / chain.length,
        });
      }

      visited.add(currentId);
      const outEdges = graph.edges.filter(
        e => e.source === currentId && !visited.has(e.target) && e.type === 'sequential'
      );

      for (const edge of outEdges) {
        dfs(edge.target, [...chain, edge.target], totalWeight + edge.weight);
      }
      visited.delete(currentId);
    }

    dfs(start.id, [start.id], 0);
  }

  results.sort((a, b) => b.weight - a.weight || a.path.length - b.path.length);
  return results;
}

/**
 * Query the graph by type signature.
 * @param {Graph} graph
 * @param {{ input?: string, output?: string }} query
 * @returns {Array<GraphNode>}
 */
export function queryByType(graph, query) {
  return graph.nodes.filter((node) => {
    if (query.input && node.interface.input) {
      const inputMatch = isTypeCompatible(
        typeof node.interface.input === 'string' ? node.interface.input : 'object',
        query.input
      );
      if (!inputMatch) return false;
    }
    if (query.output && node.interface.output) {
      const outputMatch = isTypeCompatible(
        typeof node.interface.output === 'string' ? node.interface.output : 'object',
        query.output
      );
      if (!outputMatch) return false;
    }
    return true;
  });
}
