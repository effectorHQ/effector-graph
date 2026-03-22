/**
 * Registry statistics — aggregation over capability graphs.
 *
 * Powers the Dashboard view with type distribution, trust coverage,
 * most-composed effectors, and edge breakdowns.
 */

import { SECTORS, getAllTypes } from '../spectrum/sectors.js';

/**
 * Compute dashboard statistics from a capability graph.
 * @param {Graph} graph
 * @returns {Object} Statistics object
 */
export function computeStats(graph) {
  const { nodes, edges } = graph;

  // Type distribution by sector
  const typeDistribution = {};
  for (const sector of SECTORS) {
    typeDistribution[sector.name] = 0;
  }
  for (const node of nodes) {
    for (const sector of SECTORS) {
      const inp = node.interface?.input;
      const out = node.interface?.output;
      if (sector.types.includes(inp) || sector.types.includes(out)) {
        typeDistribution[sector.name]++;
      }
    }
  }

  // Most-composed effectors (by edge count)
  const edgeCounts = new Map();
  for (const node of nodes) {
    edgeCounts.set(node.id, { inDegree: 0, outDegree: 0 });
  }
  for (const edge of edges) {
    const src = edgeCounts.get(edge.source);
    const tgt = edgeCounts.get(edge.target);
    if (src) src.outDegree++;
    if (tgt) tgt.inDegree++;
  }
  const mostComposed = nodes
    .map(n => {
      const c = edgeCounts.get(n.id) || { inDegree: 0, outDegree: 0 };
      return { name: n.name, id: n.id, inDegree: c.inDegree, outDegree: c.outDegree, totalEdges: c.inDegree + c.outDegree };
    })
    .sort((a, b) => b.totalEdges - a.totalEdges)
    .slice(0, 10);

  // Trust coverage
  const trustCoverage = { signed: 0, unsigned: 0, audited: 0, local: 0 };
  for (const node of nodes) {
    if (node.trust?.audited) trustCoverage.audited++;
    else if (node.trust?.signedBy) trustCoverage.signed++;
    else if (node.type === 'workspace' || !node.trust?.signedBy) {
      if (node.type === 'workspace') trustCoverage.local++;
      else trustCoverage.unsigned++;
    }
  }

  // Type coverage — how many of the 40 standard types are used
  const allTypes = getAllTypes();
  const usedTypes = new Set();
  for (const node of nodes) {
    if (node.interface?.input) usedTypes.add(node.interface.input);
    if (node.interface?.output) usedTypes.add(node.interface.output);
  }
  const typeCoverage = {
    used: [...usedTypes].filter(t => allTypes.includes(t)).length,
    total: allTypes.length,
    percentage: allTypes.length > 0 ? [...usedTypes].filter(t => allTypes.includes(t)).length / allTypes.length : 0,
  };

  // Edge type breakdown
  const edgeBreakdown = { sequential: 0, parallel: 0, declared: 0 };
  for (const edge of edges) {
    if (edgeBreakdown[edge.type] !== undefined) edgeBreakdown[edge.type]++;
  }

  return {
    typeDistribution,
    mostComposed,
    trustCoverage,
    typeCoverage,
    edgeBreakdown,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}
