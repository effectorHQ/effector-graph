/**
 * Embeddable Web Components for effector-graph.
 *
 * Usage:
 *   <script src="https://unpkg.com/@effectorhq/graph/src/web/widget.js"></script>
 *   <effector-graph registry="http://localhost:4200/api/graph" height="600" theme="dark" trust></effector-graph>
 *   <effector-spectrum registry="http://localhost:4200/api/spectrum" highlight="CodeDiff,ReviewReport" height="400"></effector-spectrum>
 */

// D3 loader — inject CDN script if not already loaded
function ensureD3() {
  if (window.d3) return Promise.resolve(window.d3);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) { existing.addEventListener('load', () => resolve(window.d3)); return; }
    const s = document.createElement('script');
    s.src = 'https://d3js.org/d3.v7.min.js';
    s.onload = () => resolve(window.d3);
    s.onerror = () => reject(new Error('Failed to load D3.js'));
    document.head.appendChild(s);
  });
}

// ── Shared styles ──
const SHARED_STYLES = `
  :host { display: block; }
  .container { width: 100%; height: 100%; position: relative; overflow: hidden; border-radius: 8px; }
  .dark { background: #0F0F0F; color: #F5F0EB; }
  .light { background: #fff; color: #333; }
  svg { width: 100%; height: 100%; }
  .tooltip { position: absolute; padding: 8px 12px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 6px; font-size: 12px; color: #F5F0EB; pointer-events: none; z-index: 10; display: none; max-width: 240px; font-family: system-ui, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
  .tooltip.visible { display: block; }
`;

const TYPE_COLORS = {
  skill: '#4CAF50', extension: '#2196F3', workflow: '#FF9800',
  workspace: '#9C27B0', bridge: '#00BCD4', prompt: '#FFC107', default: '#607D8B',
};

// ══════════════════════════════════════════
// <effector-graph> — Force-directed graph
// ══════════════════════════════════════════
class EffectorGraph extends HTMLElement {
  static observedAttributes = ['registry', 'data', 'filter', 'height', 'theme', 'trust'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = null;
  }

  connectedCallback() {
    const height = this.getAttribute('height') || '500';
    const theme = this.getAttribute('theme') || 'dark';
    this.shadowRoot.innerHTML = `
      <style>${SHARED_STYLES}</style>
      <div class="container ${theme}" style="height:${height}px">
        <svg></svg>
        <div class="tooltip"></div>
      </div>
    `;
    this._loadData();
  }

  attributeChangedCallback(name) {
    if (name === 'registry' || name === 'data') this._loadData();
    if (name === 'filter' || name === 'trust') this._applyFilter();
  }

  async _loadData() {
    const dataAttr = this.getAttribute('data');
    if (dataAttr) {
      try { this._data = JSON.parse(dataAttr); } catch { return; }
      this._render();
      return;
    }
    const registry = this.getAttribute('registry');
    if (registry) {
      try {
        const res = await fetch(registry);
        this._data = await res.json();
        this._render();
      } catch (e) { console.error('[effector-graph] Failed to load:', e); }
    }
  }

  async _render() {
    if (!this._data) return;

    const d3 = await ensureD3();
    const container = this.shadowRoot.querySelector('.container');
    const svgEl = this.shadowRoot.querySelector('svg');
    const tooltip = this.shadowRoot.querySelector('.tooltip');
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const showTrust = this.hasAttribute('trust');

    const svg = d3.select(svgEl).attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    defs.append('marker').attr('id', 'wg-arrow').attr('viewBox', '0 0 10 10')
      .attr('refX', 28).attr('refY', 5).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0 0L10 5L0 10z').attr('fill', '#555');

    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.2, 5]).on('zoom', e => g.attr('transform', e.transform)));

    const nodes = this._data.nodes.map(n => ({ ...n }));
    const edges = this._data.edges.map(e => ({ ...e }));

    // Filter
    const filter = this.getAttribute('filter');
    let filteredNodeIds = null;
    if (filter) {
      const [key, val] = filter.split(':');
      filteredNodeIds = new Set(nodes.filter(n => {
        if (key === 'input') return n.interface?.input === val;
        if (key === 'output') return n.interface?.output === val;
        if (key === 'type') return n.type === val;
        return true;
      }).map(n => n.id));
    }

    const link = g.selectAll('line').data(edges).enter().append('line')
      .attr('stroke', '#444').attr('stroke-width', 1.5).attr('stroke-opacity', 0.5)
      .attr('marker-end', 'url(#wg-arrow)');

    const node = g.selectAll('g').data(nodes).enter().append('g')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append('circle').attr('r', 18)
      .attr('fill', d => TYPE_COLORS[d.type] || TYPE_COLORS.default)
      .attr('stroke', d => {
        if (!showTrust) return '#fff';
        return d.trust?.audited ? '#4CAF50' : d.trust?.signedBy ? '#FFC107' : '#E03E3E';
      })
      .attr('stroke-width', 2).attr('opacity', d => filteredNodeIds && !filteredNodeIds.has(d.id) ? 0.15 : 0.9);

    node.append('text').attr('dy', 30).attr('text-anchor', 'middle')
      .attr('fill', '#aaa').attr('font-size', '10px').text(d => d.name);

    node.on('mouseenter', (e, d) => {
      tooltip.innerHTML = `<strong>${d.name}@${d.version}</strong><br>${d.interface?.input||'*'} → ${d.interface?.output||'*'}`;
      tooltip.classList.add('visible');
    }).on('mousemove', e => {
      const rect = container.getBoundingClientRect();
      tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
    }).on('mouseleave', () => tooltip.classList.remove('visible'));

    const sim = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-250))
      .force('link', d3.forceLink(edges).id(d => d.id).distance(110))
      .force('center', d3.forceCenter(width/2, height/2))
      .force('collision', d3.forceCollide(28))
      .on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });
  }
}

// ══════════════════════════════════════════
// <effector-spectrum> — Interactive polar chart
// ══════════════════════════════════════════
class EffectorSpectrum extends HTMLElement {
  static observedAttributes = ['registry', 'highlight', 'height', 'theme'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = null;
  }

  connectedCallback() {
    const height = this.getAttribute('height') || '400';
    const theme = this.getAttribute('theme') || 'dark';
    this.shadowRoot.innerHTML = `
      <style>${SHARED_STYLES}</style>
      <div class="container ${theme}" style="height:${height}px">
        <svg></svg>
        <div class="tooltip"></div>
      </div>
    `;
    this._loadData();
  }

  attributeChangedCallback(name) {
    if (name === 'registry') this._loadData();
    if (name === 'highlight' && this._data) this._render(); // re-render with new highlights
  }

  async _loadData() {
    const registry = this.getAttribute('registry');
    if (!registry) return;
    try {
      const res = await fetch(registry);
      this._data = await res.json();
      this._render();
    } catch (e) { console.error('[effector-spectrum] Failed to load:', e); }
  }

  async _render() {
    if (!this._data) return;

    const d3 = await ensureD3();
    const container = this.shadowRoot.querySelector('.container');
    const svgEl = this.shadowRoot.querySelector('svg');
    const tooltip = this.shadowRoot.querySelector('.tooltip');
    const size = Math.min(container.clientWidth, container.clientHeight) || 400;
    const cx = size/2, cy = size/2, maxR = size/2 - 50;

    const svg = d3.select(svgEl).attr('viewBox', `0 0 ${size} ${size}`);
    svg.selectAll('*').remove();

    // Background + rings
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', maxR + 20)
      .attr('fill', '#1A1A1A').attr('stroke', '#2A2A2A');

    const ringRadii = this._data.rings.map(r => r.radius * maxR);
    ringRadii.forEach(r => {
      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', r)
        .attr('fill', 'none').attr('stroke', '#333').attr('stroke-dasharray', '4,4');
    });

    // Sector boundaries
    this._data.boundaries.forEach(angle => {
      const rad = (angle - 90) * Math.PI / 180;
      svg.append('line').attr('x1', cx).attr('y1', cy)
        .attr('x2', cx + (maxR + 10) * Math.cos(rad))
        .attr('y2', cy + (maxR + 10) * Math.sin(rad))
        .attr('stroke', '#333');
    });

    // Sector labels
    this._data.labels.forEach(l => {
      const rad = (l.angle - 90) * Math.PI / 180;
      svg.append('text')
        .attr('x', cx + (maxR + 35) * Math.cos(rad))
        .attr('y', cy + (maxR + 35) * Math.sin(rad))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', l.color).attr('font-size', '11px').attr('font-weight', '700')
        .text(l.name);
    });

    // Highlight set
    const highlights = (this.getAttribute('highlight') || '').split(',').filter(Boolean);
    const highlightSet = new Set(highlights);

    // Type dots
    const scale = size / 800;
    const dots = svg.selectAll('.s-dot').data(this._data.types).enter().append('g')
      .attr('transform', d => `translate(${d.x * scale},${d.y * scale})`);

    dots.append('circle')
      .attr('r', d => highlightSet.has(d.name) ? 10 : 6)
      .attr('fill', d => d.sectorColor)
      .attr('opacity', d => highlightSet.size === 0 || highlightSet.has(d.name) ? 0.9 : 0.25)
      .attr('stroke', d => highlightSet.has(d.name) ? '#fff' : 'none')
      .attr('stroke-width', 2);

    dots.append('text').attr('dy', -10).attr('text-anchor', 'middle')
      .attr('fill', '#aaa').attr('font-size', '8px')
      .text(d => highlightSet.size === 0 || highlightSet.has(d.name) ? d.name : '');

    dots.on('mouseenter', (e, d) => {
      tooltip.innerHTML = `<strong>${d.name}</strong><br>${d.ring} / ${d.sector}`;
      tooltip.classList.add('visible');
    }).on('mousemove', e => {
      const rect = container.getBoundingClientRect();
      tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
    }).on('mouseleave', () => tooltip.classList.remove('visible'));
  }
}

// Register custom elements
if (!customElements.get('effector-graph')) {
  customElements.define('effector-graph', EffectorGraph);
}
if (!customElements.get('effector-spectrum')) {
  customElements.define('effector-spectrum', EffectorSpectrum);
}
