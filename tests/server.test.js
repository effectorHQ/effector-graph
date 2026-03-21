import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../src/web/server.js';

let server;
let port;

function fetch_(path, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = http.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, headers: res.headers, text: () => body, json: () => JSON.parse(body) });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

describe('Graph server', () => {
  before(async () => {
    server = createServer({ registry: '.' });
    await new Promise(resolve => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  it('GET / returns HTML', async () => {
    const res = await fetch_('/');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    const html = res.text();
    assert.ok(html.includes('effector-graph'));
  });

  it('GET /api/graph returns JSON with nodes and edges', async () => {
    const res = await fetch_('/api/graph');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data.nodes));
    assert.ok(Array.isArray(data.edges));
    assert.ok(data.stats);
  });

  it('GET /api/spectrum returns layout data', async () => {
    const res = await fetch_('/api/spectrum');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data.types));
    assert.ok(Array.isArray(data.sectors));
    assert.ok(Array.isArray(data.rings));
  });

  it('GET /api/stats returns statistics', async () => {
    const res = await fetch_('/api/stats');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(data.typeDistribution);
    assert.ok(data.trustCoverage);
    assert.ok(Array.isArray(data.mostComposed));
  });

  it('GET /api/trust returns trust data', async () => {
    const res = await fetch_('/api/trust');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data.effectors));
  });

  it('POST /api/diff returns diff result', async () => {
    const body = JSON.stringify({
      a: { nodes: [{ id: 'x@1', name: 'x', version: '1', type: 'skill', interface: {} }], edges: [] },
      b: { nodes: [], edges: [] },
    });
    const res = await fetch_('/api/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data.removed));
    assert.equal(data.removed.length, 1);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await fetch_('/api/nope');
    assert.equal(res.status, 404);
  });
});
