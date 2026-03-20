/**
 * Polar coordinate math for the Spectrum visualization.
 *
 * Converts sector/ring assignments into (x, y) positions on an SVG canvas.
 */

import { SECTORS, RINGS, getTypeRing } from './sectors.js';

/**
 * Convert polar coordinates to Cartesian.
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} radius - Distance from center
 * @param {number} angleDeg - Angle in degrees (0 = top, clockwise)
 * @returns {{ x: number, y: number }}
 */
export function polarToCartesian(cx, cy, radius, angleDeg) {
  // Convert to math radians: 0 deg = top (negative Y axis), clockwise
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

/**
 * Layout all types from the sector/ring definitions onto an SVG canvas.
 *
 * Each type gets a unique position determined by:
 *   - Its sector (angular position)
 *   - Its ring (radial distance from center)
 *   - Its index within the sector (spread evenly across the sector arc)
 *
 * @param {number} svgSize - Width/height of the SVG viewBox (square)
 * @returns {Array<{ name: string, x: number, y: number, ring: string, sector: string, angle: number, sectorColor: string }>}
 */
export function layoutTypes(svgSize = 800) {
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const maxRadius = svgSize / 2 - 70; // leave room for labels

  const sectorCount = SECTORS.length;
  const sectorArc = 360 / sectorCount; // degrees per sector

  const ringRadii = {};
  for (const ring of RINGS) {
    ringRadii[ring.name] = ring.radius * maxRadius;
  }

  const results = [];

  for (let si = 0; si < sectorCount; si++) {
    const sector = SECTORS[si];
    const sectorStartAngle = si * sectorArc;
    const typeCount = sector.types.length;

    for (let ti = 0; ti < typeCount; ti++) {
      const typeName = sector.types[ti];
      const ringName = getTypeRing(typeName);
      const radius = ringRadii[ringName] || ringRadii['Domain'];

      // Spread types across the sector arc with padding on both sides
      const padding = sectorArc * 0.1;
      const usableArc = sectorArc - 2 * padding;
      const angle = typeCount === 1
        ? sectorStartAngle + sectorArc / 2
        : sectorStartAngle + padding + (usableArc * ti) / (typeCount - 1);

      const { x, y } = polarToCartesian(cx, cy, radius, angle);

      results.push({
        name: typeName,
        x,
        y,
        ring: ringName,
        sector: sector.name,
        angle,
        sectorColor: sector.color,
      });
    }
  }

  return results;
}

/**
 * Get the angle of each sector boundary line (the line between sectors).
 * @returns {number[]} Angles in degrees for sector divider lines.
 */
export function getSectorBoundaryAngles() {
  const sectorArc = 360 / SECTORS.length;
  const angles = [];
  for (let i = 0; i < SECTORS.length; i++) {
    angles.push(i * sectorArc);
  }
  return angles;
}

/**
 * Get the midpoint angle for each sector (for label placement).
 * @returns {Array<{ name: string, angle: number, color: string }>}
 */
export function getSectorLabelPositions() {
  const sectorArc = 360 / SECTORS.length;
  return SECTORS.map((sector, i) => ({
    name: sector.name,
    angle: i * sectorArc + sectorArc / 2,
    color: sector.color,
  }));
}
