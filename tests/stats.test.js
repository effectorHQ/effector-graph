import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../src/core/stats.js';

const mkGraph = (nodes, edges = []) => ({
  nodes,
  edges,
  stats: { nodeCount: nodes.length, edgeCount: edges.length },
});

describe('computeStats', () => {
  it('computes type distribution', () => {
    const graph = mkGraph([
      { id: 'a@1', name: 'a', interface: { input: 'CodeDiff', output: 'ReviewReport' }, trust: {} },
      { id: 'b@1', name: 'b', interface: { input: 'String', output: 'Markdown' }, trust: {} },
    ]);
    const stats = computeStats(graph);
    assert.ok(stats.typeDistribution.Code > 0);
    assert.ok(stats.typeDistribution.Data > 0 || stats.typeDistribution.Communication > 0);
  });

  it('identifies most-composed effectors', () => {
    const graph = mkGraph(
      [
        { id: 'a@1', name: 'a', interface: {}, trust: {} },
        { id: 'b@1', name: 'b', interface: {}, trust: {} },
      ],
      [{ source: 'a@1', target: 'b@1', type: 'sequential' }],
    );
    const stats = computeStats(graph);
    assert.ok(stats.mostComposed.length > 0);
    assert.ok(stats.mostComposed[0].totalEdges > 0);
  });

  it('computes trust coverage', () => {
    const graph = mkGraph([
      { id: 'a@1', name: 'a', interface: {}, trust: { signedBy: 'x', audited: true } },
      { id: 'b@1', name: 'b', interface: {}, trust: { signedBy: 'y' } },
      { id: 'c@1', name: 'c', interface: {}, trust: {} },
    ]);
    const stats = computeStats(graph);
    assert.equal(stats.trustCoverage.audited, 1);
    assert.equal(stats.trustCoverage.signed, 1);
    assert.equal(stats.trustCoverage.unsigned, 1);
  });

  it('returns zero counts for empty graph', () => {
    const stats = computeStats(mkGraph([]));
    assert.equal(stats.nodeCount, 0);
    assert.equal(stats.edgeCount, 0);
    assert.equal(stats.typeCoverage.used, 0);
  });

  it('computes edge type breakdown', () => {
    const graph = mkGraph(
      [{ id: 'a@1', name: 'a', interface: {}, trust: {} }],
      [
        { source: 'a', target: 'b', type: 'sequential' },
        { source: 'a', target: 'c', type: 'parallel' },
      ],
    );
    const stats = computeStats(graph);
    assert.equal(stats.edgeBreakdown.sequential, 1);
    assert.equal(stats.edgeBreakdown.parallel, 1);
  });

  it('computes type coverage against standard types', () => {
    const graph = mkGraph([
      { id: 'a@1', name: 'a', interface: { input: 'CodeDiff', output: 'ReviewReport' }, trust: {} },
    ]);
    const stats = computeStats(graph);
    assert.equal(stats.typeCoverage.used, 2); // CodeDiff + ReviewReport
    assert.ok(stats.typeCoverage.total > 30);
    assert.ok(stats.typeCoverage.percentage > 0);
  });
});
