/**
 * Spectrum SVG renderer — circular capability visualization.
 *
 * Renders all 36+ Effector types as a polar chart with 8 thematic sectors
 * and 4 concentric rings (Primitive → Domain → Structured → Complex).
 *
 * @example
 * import { renderSpectrum } from '@effectorhq/graph';
 * const svg = renderSpectrum();                           // all types
 * const svg = renderSpectrum({ highlight: {               // highlight a tool
 *   input: 'CodeDiff', output: 'ReviewReport', context: ['Repository']
 * }});
 */

import { SECTORS, RINGS } from '../spectrum/sectors.js';
import { layoutTypes, polarToCartesian, getSectorBoundaryAngles, getSectorLabelPositions } from '../spectrum/layout.js';

const DEFAULTS = {
  size: 800,
  bg: '#0F0F0F',
  textColor: '#F5F0EB',
  gridColor: '#222',
  highlightInput: '#E03E3E',
  highlightOutput: '#F27A3A',
  highlightContext: '#555',
  dotRadius: 5,
  fontSize: 10,
  labelFontSize: 13,
};

/**
 * Render the Spectrum as an SVG string.
 *
 * @param {object} [options]
 * @param {number} [options.size=800]
 * @param {object} [options.highlight] - { input: string, output: string, context: string[] }
 * @param {'dark'|'light'} [options.theme='dark']
 * @returns {string} Complete SVG document
 */
export function renderSpectrum(options = {}) {
  const size = options.size || DEFAULTS.size;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 70;
  const highlight = options.highlight || {};
  const highlightSet = new Set([
    ...(highlight.input ? [highlight.input] : []),
    ...(highlight.output ? [highlight.output] : []),
    ...(highlight.context || []),
  ]);

  const parts = [];

  // SVG header
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`);
  parts.push(`<rect width="${size}" height="${size}" fill="${DEFAULTS.bg}"/>`);

  // Defs for glow filters
  parts.push(`<defs>`);
  parts.push(`<filter id="glow-input" x="-50%" y="-50%" width="200%" height="200%">`);
  parts.push(`<feGaussianBlur stdDeviation="6" result="blur"/>`);
  parts.push(`<feFlood flood-color="${DEFAULTS.highlightInput}" flood-opacity="0.8"/>`);
  parts.push(`<feComposite in2="blur" operator="in"/>`);
  parts.push(`<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>`);
  parts.push(`</filter>`);
  parts.push(`<filter id="glow-output" x="-50%" y="-50%" width="200%" height="200%">`);
  parts.push(`<feGaussianBlur stdDeviation="6" result="blur"/>`);
  parts.push(`<feFlood flood-color="${DEFAULTS.highlightOutput}" flood-opacity="0.8"/>`);
  parts.push(`<feComposite in2="blur" operator="in"/>`);
  parts.push(`<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>`);
  parts.push(`</filter>`);
  parts.push(`<filter id="glow-context" x="-50%" y="-50%" width="200%" height="200%">`);
  parts.push(`<feGaussianBlur stdDeviation="4" result="blur"/>`);
  parts.push(`<feFlood flood-color="${DEFAULTS.highlightContext}" flood-opacity="0.6"/>`);
  parts.push(`<feComposite in2="blur" operator="in"/>`);
  parts.push(`<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>`);
  parts.push(`</filter>`);
  parts.push(`</defs>`);

  // Draw concentric ring circles
  for (const ring of RINGS) {
    const r = ring.radius * maxRadius;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${DEFAULTS.gridColor}" stroke-width="0.5" stroke-dasharray="4 4"/>`);
  }

  // Draw sector boundary lines
  const boundaryAngles = getSectorBoundaryAngles();
  for (const angle of boundaryAngles) {
    const outer = polarToCartesian(cx, cy, maxRadius + 20, angle);
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${outer.x}" y2="${outer.y}" stroke="${DEFAULTS.gridColor}" stroke-width="0.5"/>`);
  }

  // Ring labels along the 0-degree line (top)
  for (const ring of RINGS) {
    const r = ring.radius * maxRadius;
    parts.push(`<text x="${cx + 8}" y="${cy - r + 4}" fill="#444" font-size="9" font-family="system-ui, sans-serif">${ring.name}</text>`);
  }

  // Sector labels around the outside
  const sectorLabels = getSectorLabelPositions();
  for (const label of sectorLabels) {
    const pos = polarToCartesian(cx, cy, maxRadius + 45, label.angle);
    // Rotate text to align with the angle
    const textAnchor = (label.angle > 90 && label.angle < 270) ? 'end' : 'start';
    const rotation = (label.angle > 90 && label.angle < 270) ? label.angle + 180 : label.angle;
    parts.push(`<text x="${pos.x}" y="${pos.y}" fill="${label.color}" font-size="${DEFAULTS.labelFontSize}" font-weight="600" font-family="system-ui, sans-serif" text-anchor="${textAnchor}" dominant-baseline="central" transform="rotate(${rotation}, ${pos.x}, ${pos.y})">${label.name}</text>`);
  }

  // Draw type dots and labels
  const typePositions = layoutTypes(size);
  for (const tp of typePositions) {
    let filter = '';
    let dotColor = tp.sectorColor;
    let dotRadius = DEFAULTS.dotRadius;
    let opacity = highlightSet.size > 0 && !highlightSet.has(tp.name) ? 0.25 : 1;

    if (tp.name === highlight.input) {
      filter = ' filter="url(#glow-input)"';
      dotColor = DEFAULTS.highlightInput;
      dotRadius = 8;
      opacity = 1;
    } else if (tp.name === highlight.output) {
      filter = ' filter="url(#glow-output)"';
      dotColor = DEFAULTS.highlightOutput;
      dotRadius = 8;
      opacity = 1;
    } else if (highlight.context && highlight.context.includes(tp.name)) {
      filter = ' filter="url(#glow-context)"';
      dotRadius = 6;
      opacity = 1;
    }

    // Dot
    parts.push(`<circle cx="${tp.x}" cy="${tp.y}" r="${dotRadius}" fill="${dotColor}" opacity="${opacity}"${filter}/>`);

    // Label
    const labelOffset = dotRadius + 6;
    // Place label to the right, unless it would go off-screen
    const labelX = tp.x + labelOffset;
    const anchor = labelX > size - 80 ? 'end' : 'start';
    const finalX = anchor === 'end' ? tp.x - labelOffset : labelX;
    parts.push(`<text x="${finalX}" y="${tp.y + 3}" fill="${DEFAULTS.textColor}" font-size="${DEFAULTS.fontSize}" font-family="system-ui, sans-serif" text-anchor="${anchor}" opacity="${opacity}">${tp.name}</text>`);
  }

  // Title
  parts.push(`<text x="${cx}" y="28" fill="${DEFAULTS.textColor}" font-size="16" font-weight="700" font-family="system-ui, sans-serif" text-anchor="middle">Effector Capability Spectrum</text>`);
  if (highlight.input || highlight.output) {
    const subtitle = [
      highlight.input ? `Input: ${highlight.input}` : '',
      highlight.output ? `Output: ${highlight.output}` : '',
    ].filter(Boolean).join(' → ');
    parts.push(`<text x="${cx}" y="48" fill="#666" font-size="12" font-family="system-ui, sans-serif" text-anchor="middle">${subtitle}</text>`);
  }

  parts.push('</svg>');
  return parts.join('\n');
}

/**
 * Wrap the SVG in a minimal HTML page for browser viewing.
 * @param {string} svg
 * @returns {string}
 */
export function wrapInHTML(svg) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Effector Capability Spectrum</title>
<style>
  body { margin: 0; background: #0F0F0F; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  svg { max-width: 90vmin; max-height: 90vmin; }
</style>
</head>
<body>
${svg}
</body>
</html>`;
}
