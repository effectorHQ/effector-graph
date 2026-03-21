import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diffGraphs } from '../src/core/diff.js';

const mkGraph = (nodes, edges = []) => ({ nodes, edges, stats: {} });

describe('diffGraphs', () => {
  it('returns empty diff for identical graphs', () => {
    const g = mkGraph([{ id: 'a@1', name: 'a', version: '1', type: 'skill', interface: { input: 'X', output: 'Y' } }]);
    const result = diffGraphs(g, g);
    assert.equal(result.added.length, 0);
    assert.equal(result.removed.length, 0);
    assert.equal(result.modified.length, 0);
    assert.equal(result.addedEdges.length, 0);
    assert.equal(result.removedEdges.length, 0);
  });

  it('detects added nodes', () => {
    const a = mkGraph([{ id: 'x@1', name: 'x', version: '1', type: 'skill', interface: {} }]);
    const b = mkGraph([
      { id: 'x@1', name: 'x', version: '1', type: 'skill', interface: {} },
      { id: 'y@1', name: 'y', version: '1', type: 'skill', interface: {} },
    ]);
    const result = diffGraphs(a, b);
    assert.equal(result.added.length, 1);
    assert.equal(result.added[0].id, 'y@1');
  });

  it('detects removed nodes', () => {
    const a = mkGraph([
      { id: 'x@1', name: 'x', version: '1', type: 'skill', interface: {} },
      { id: 'y@1', name: 'y', version: '1', type: 'skill', interface: {} },
    ]);
    const b = mkGraph([{ id: 'x@1', name: 'x', version: '1', type: 'skill', interface: {} }]);
    const result = diffGraphs(a, b);
    assert.equal(result.removed.length, 1);
    assert.equal(result.removed[0].id, 'y@1');
  });

  it('detects modified nodes', () => {
    const a = mkGraph([{ id: 'x@1', name: 'x', version: '1', type: 'skill', interface: { input: 'A', output: 'B' } }]);
    const b = mkGraph([{ id: 'x@1', name: 'x', version: '1', type: 'workflow', interface: { input: 'A', output: 'C' } }]);
    const result = diffGraphs(a, b);
    assert.equal(result.modified.length, 1);
    assert.equal(result.modified[0].id, 'x@1');
    assert.ok(result.modified[0].changes.type);
    assert.ok(result.modified[0].changes.output);
  });

  it('detects added and removed edges', () => {
    const a = mkGraph([], [{ source: 'x', target: 'y', type: 'sequential' }]);
    const b = mkGraph([], [{ source: 'y', target: 'z', type: 'sequential' }]);
    const result = diffGraphs(a, b);
    assert.equal(result.addedEdges.length, 1);
    assert.equal(result.removedEdges.length, 1);
  });

  it('handles empty graphs', () => {
    const result = diffGraphs(mkGraph([]), mkGraph([]));
    assert.equal(result.added.length, 0);
    assert.equal(result.removed.length, 0);
  });

  it('handles completely different graphs', () => {
    const a = mkGraph([{ id: 'a@1', name: 'a', version: '1', type: 'skill', interface: {} }]);
    const b = mkGraph([{ id: 'b@1', name: 'b', version: '1', type: 'skill', interface: {} }]);
    const result = diffGraphs(a, b);
    assert.equal(result.added.length, 1);
    assert.equal(result.removed.length, 1);
  });
});
