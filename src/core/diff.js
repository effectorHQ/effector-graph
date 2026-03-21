/**
 * Graph diffing — compare two capability graphs.
 *
 * Used by the Diff view and VS Code extension to detect
 * additions, removals, and modifications between graph snapshots.
 */

/**
 * Diff two capability graphs.
 * @param {Graph} graphA - The "before" graph
 * @param {Graph} graphB - The "after" graph
 * @returns {{ added: Node[], removed: Node[], modified: Array<{id: string, changes: Object}>, addedEdges: Edge[], removedEdges: Edge[] }}
 */
export function diffGraphs(graphA, graphB) {
  const nodesA = new Map(graphA.nodes.map(n => [n.id, n]));
  const nodesB = new Map(graphB.nodes.map(n => [n.id, n]));

  const added = [];
  const removed = [];
  const modified = [];

  // Find added and modified nodes
  for (const [id, nodeB] of nodesB) {
    const nodeA = nodesA.get(id);
    if (!nodeA) {
      added.push(nodeB);
      continue;
    }
    // Check for field-level changes
    const changes = {};
    if (nodeA.type !== nodeB.type) changes.type = { old: nodeA.type, new: nodeB.type };
    if (nodeA.interface?.input !== nodeB.interface?.input) changes.input = { old: nodeA.interface?.input, new: nodeB.interface?.input };
    if (nodeA.interface?.output !== nodeB.interface?.output) changes.output = { old: nodeA.interface?.output, new: nodeB.interface?.output };
    if (JSON.stringify(nodeA.trust || {}) !== JSON.stringify(nodeB.trust || {})) changes.trust = { old: nodeA.trust, new: nodeB.trust };
    if (Object.keys(changes).length > 0) {
      modified.push({ id, changes });
    }
  }

  // Find removed nodes
  for (const [id, nodeA] of nodesA) {
    if (!nodesB.has(id)) removed.push(nodeA);
  }

  // Diff edges
  const edgeKey = e => `${e.source}|${e.target}|${e.type}`;
  const edgesA = new Set(graphA.edges.map(edgeKey));
  const edgesB = new Set(graphB.edges.map(edgeKey));

  const addedEdges = graphB.edges.filter(e => !edgesA.has(edgeKey(e)));
  const removedEdges = graphA.edges.filter(e => !edgesB.has(edgeKey(e)));

  return { added, removed, modified, addedEdges, removedEdges };
}
