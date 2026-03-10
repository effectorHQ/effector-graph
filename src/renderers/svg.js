/**
 * SVG renderer for capability graphs.
 * Generates static SVG visualizations of Effector pipelines and capability networks.
 */

const COLORS = {
  skill: '#4CAF50',
  extension: '#2196F3',
  workflow: '#FF9800',
  workspace: '#9C27B0',
  bridge: '#00BCD4',
  prompt: '#FFC107',
  default: '#607D8B',
};

const TRUST_COLORS = {
  signed: '#4CAF50',
  unsigned: '#F44336',
  audited: '#2196F3',
  local: '#9E9E9E',
};

/**
 * Render a capability graph as SVG.
 * @param {Graph} graph
 * @param {{ width?: number, height?: number, showTrust?: boolean }} options
 * @returns {string} SVG markup
 */
export function renderSVG(graph, options = {}) {
  const { width = 1200, height = 800, showTrust = false } = options;

  // Simple force-directed layout (spring embedding)
  const positions = layoutNodes(graph.nodes, graph.edges, width, height);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
  svg += `<style>
    .node-label { font-family: 'Inter', system-ui, sans-serif; font-size: 11px; fill: #333; }
    .type-label { font-family: 'Inter', system-ui, sans-serif; font-size: 9px; fill: #666; }
    .edge { stroke: #ccc; stroke-width: 1.5; fill: none; }
    .edge-sequential { stroke: #999; marker-end: url(#arrow); }
    .edge-parallel { stroke: #999; stroke-dasharray: 5,5; }
  </style>`;

  // Arrow marker
  svg += `<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#999"/></marker></defs>`;

  // Render edges
  for (const edge of graph.edges) {
    const src = positions.get(edge.source);
    const tgt = positions.get(edge.target);
    if (!src || !tgt) continue;

    const edgeClass = edge.type === 'parallel' ? 'edge edge-parallel' : 'edge edge-sequential';
    svg += `<line class="${edgeClass}" x1="${src.x}" y1="${src.y}" x2="${tgt.x}" y2="${tgt.y}"/>`;
  }

  // Render nodes
  for (const node of graph.nodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;

    const color = COLORS[node.type] || COLORS.default;
    const trustColor = showTrust ? (TRUST_COLORS[node.trust?.signedBy ? 'signed' : 'unsigned']) : color;
    const radius = 24;

    svg += `<g transform="translate(${pos.x},${pos.y})">`;
    svg += `<circle r="${radius}" fill="${showTrust ? trustColor : color}" opacity="0.85" stroke="#fff" stroke-width="2"/>`;
    svg += `<text class="node-label" text-anchor="middle" dy="${radius + 16}">${node.name}</text>`;
    if (node.interface.output) {
      const outputLabel = typeof node.interface.output === 'string' ? node.interface.output : 'Object';
      svg += `<text class="type-label" text-anchor="middle" dy="${radius + 28}">→ ${outputLabel}</text>`;
    }
    svg += `</g>`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Simple force-directed layout.
 */
function layoutNodes(nodes, edges, width, height) {
  const positions = new Map();
  const padding = 60;

  // Initialize positions in a circle
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - padding;

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    positions.set(node.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });

  // Spring embedding iterations
  const iterations = 50;
  const k = Math.sqrt((width * height) / Math.max(nodes.length, 1));

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map();
    nodes.forEach((n) => forces.set(n.id, { fx: 0, fy: 0 }));

    // Repulsive forces between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const pi = positions.get(nodes[i].id);
        const pj = positions.get(nodes[j].id);
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (k * k) / dist;

        const fi = forces.get(nodes[i].id);
        const fj = forces.get(nodes[j].id);
        fi.fx += (dx / dist) * force;
        fi.fy += (dy / dist) * force;
        fj.fx -= (dx / dist) * force;
        fj.fy -= (dy / dist) * force;
      }
    }

    // Attractive forces along edges
    for (const edge of edges) {
      const pi = positions.get(edge.source);
      const pj = positions.get(edge.target);
      if (!pi || !pj) continue;

      const dx = pi.x - pj.x;
      const dy = pi.y - pj.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist * dist) / k;

      const fi = forces.get(edge.source);
      const fj = forces.get(edge.target);
      if (fi) { fi.fx -= (dx / dist) * force; fi.fy -= (dy / dist) * force; }
      if (fj) { fj.fx += (dx / dist) * force; fj.fy += (dy / dist) * force; }
    }

    // Apply forces with cooling
    const temp = 1 - iter / iterations;
    for (const node of nodes) {
      const pos = positions.get(node.id);
      const f = forces.get(node.id);
      pos.x = Math.max(padding, Math.min(width - padding, pos.x + f.fx * temp * 0.1));
      pos.y = Math.max(padding, Math.min(height - padding, pos.y + f.fy * temp * 0.1));
    }
  }

  return positions;
}

/**
 * Render a pipeline (linear + parallel) as SVG.
 * @param {Pipeline} pipeline
 * @param {{ width?: number, height?: number }} options
 * @returns {string}
 */
export function renderPipelineSVG(pipeline, options = {}) {
  const { width = 1000, height = 400 } = options;
  const stepWidth = 160;
  const stepHeight = 60;
  const gap = 80;
  const startX = 60;
  const centerY = height / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
  svg += `<style>
    .step-rect { rx: 8; ry: 8; stroke: #ddd; stroke-width: 1.5; }
    .step-name { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; fill: #333; font-weight: 600; }
    .step-effector { font-family: 'Inter', system-ui, sans-serif; font-size: 10px; fill: #666; }
    .connector { stroke: #999; stroke-width: 1.5; fill: none; marker-end: url(#arrow2); }
  </style>`;
  svg += `<defs><marker id="arrow2" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#999"/></marker></defs>`;

  let x = startX;
  for (let i = 0; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i];
    const y = step.parallelWith ? centerY - stepHeight - 10 : centerY - stepHeight / 2;

    // Step box
    svg += `<rect class="step-rect" x="${x}" y="${y}" width="${stepWidth}" height="${stepHeight}" fill="#f8f9fa"/>`;
    svg += `<text class="step-name" x="${x + stepWidth / 2}" y="${y + 24}" text-anchor="middle">${step.id}</text>`;
    svg += `<text class="step-effector" x="${x + stepWidth / 2}" y="${y + 42}" text-anchor="middle">${step.effector || ''}</text>`;

    // Connector to next step
    if (i < pipeline.steps.length - 1) {
      svg += `<line class="connector" x1="${x + stepWidth}" y1="${centerY}" x2="${x + stepWidth + gap}" y2="${centerY}"/>`;
    }

    x += stepWidth + gap;
  }

  svg += `</svg>`;
  return svg;
}
