import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderSpectrum, wrapInHTML } from '../src/renderers/spectrum.js';
import { SECTORS, RINGS, getAllTypes, getTypeRing, getTypeSector } from '../src/spectrum/sectors.js';
import { layoutTypes, polarToCartesian } from '../src/spectrum/layout.js';

describe('Spectrum sectors', () => {
  it('has 8 sectors', () => {
    assert.equal(SECTORS.length, 8);
  });

  it('has 4 rings', () => {
    assert.equal(RINGS.length, 4);
  });

  it('every type belongs to exactly one sector', () => {
    const allTypes = getAllTypes();
    for (const t of allTypes) {
      const sector = getTypeSector(t);
      assert.ok(sector, `${t} should have a sector`);
    }
  });

  it('every type has a ring assignment', () => {
    const allTypes = getAllTypes();
    for (const t of allTypes) {
      const ring = getTypeRing(t);
      assert.ok(['Primitive', 'Domain', 'Structured', 'Complex'].includes(ring),
        `${t} should have a valid ring, got "${ring}"`);
    }
  });
});

describe('Spectrum layout', () => {
  it('polarToCartesian converts correctly', () => {
    // 0 degrees (top) should give x=center, y=center-radius
    const p = polarToCartesian(400, 400, 100, 0);
    assert.ok(Math.abs(p.x - 400) < 0.01, `x should be ~400, got ${p.x}`);
    assert.ok(Math.abs(p.y - 300) < 0.01, `y should be ~300, got ${p.y}`);
  });

  it('layouts all types with x,y positions', () => {
    const positions = layoutTypes(800);
    assert.ok(positions.length >= 36, `should have 36+ positions, got ${positions.length}`);
    for (const p of positions) {
      assert.ok(typeof p.x === 'number' && !isNaN(p.x), `${p.name} x should be a number`);
      assert.ok(typeof p.y === 'number' && !isNaN(p.y), `${p.name} y should be a number`);
      assert.ok(p.x >= 0 && p.x <= 800, `${p.name} x should be in bounds`);
      assert.ok(p.y >= 0 && p.y <= 800, `${p.name} y should be in bounds`);
    }
  });
});

describe('Spectrum SVG renderer', () => {
  it('produces valid SVG', () => {
    const svg = renderSpectrum();
    assert.ok(svg.startsWith('<svg'), 'should start with <svg');
    assert.ok(svg.endsWith('</svg>'), 'should end with </svg>');
    assert.ok(svg.includes('viewBox="0 0 800 800"'), 'should have viewBox');
  });

  it('contains all type labels', () => {
    const svg = renderSpectrum();
    const allTypes = getAllTypes();
    for (const t of allTypes) {
      assert.ok(svg.includes(`>${t}<`), `SVG should contain type label "${t}"`);
    }
  });

  it('contains sector labels', () => {
    const svg = renderSpectrum();
    for (const s of SECTORS) {
      assert.ok(svg.includes(`>${s.name}<`), `SVG should contain sector label "${s.name}"`);
    }
  });

  it('highlight mode adds glow filters', () => {
    const svg = renderSpectrum({
      highlight: { input: 'CodeDiff', output: 'ReviewReport', context: ['Repository'] },
    });
    assert.ok(svg.includes('filter="url(#glow-input)"'), 'should have input glow');
    assert.ok(svg.includes('filter="url(#glow-output)"'), 'should have output glow');
    assert.ok(svg.includes('filter="url(#glow-context)"'), 'should have context glow');
  });

  it('wrapInHTML produces valid HTML', () => {
    const svg = renderSpectrum();
    const html = wrapInHTML(svg);
    assert.ok(html.includes('<!DOCTYPE html>'), 'should be HTML document');
    assert.ok(html.includes('<svg'), 'should contain SVG');
    assert.ok(html.includes('Effector Capability Spectrum'), 'should have title');
  });
});
