/**
 * Capability graph construction from typed Effectors.
 * Nodes are capabilities, edges are composition relationships.
 */

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

/**
 * Check structural type compatibility.
 * @returns {{ precision: number } | null}
 */
function isTypeCompatible(outputType, inputType) {
  // String-based type names
  if (typeof outputType === 'string' && typeof inputType === 'string') {
    if (outputType === inputType) return { precision: 1.0 };
    // Wildcard matching (e.g., "*Report" matches "ReviewReport")
    if (inputType.includes('*')) {
      const pattern = inputType.replace('*', '');
      if (outputType.includes(pattern)) return { precision: 0.8 };
    }
    // Suffix matching (e.g., "SecurityReport" ends with "Report")
    if (outputType.endsWith(inputType.replace('*', ''))) return { precision: 0.6 };
    return null;
  }

  // Object-based structural comparison
  if (typeof outputType === 'object' && typeof inputType === 'object') {
    const inputKeys = Object.keys(inputType);
    const outputKeys = Object.keys(outputType);
    const matchedKeys = inputKeys.filter((k) => outputKeys.includes(k));

    if (matchedKeys.length === inputKeys.length) {
      const precision = matchedKeys.length / Math.max(outputKeys.length, 1);
      return { precision };
    }
    return null;
  }

  return null;
}

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
