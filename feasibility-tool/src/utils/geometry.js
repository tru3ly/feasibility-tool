import { SNAP } from "../data/constants.js";

export const r1 = n => Math.round(n * 10) / 10;
export const r2 = n => Math.round(n * 100) / 100;
export const uid = () => Math.random().toString(36).slice(2,8);

// Shoelace polygon area
export function pArea(pts) {
  if (!pts || pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a / 2);
}

// Bounding box
export function pBounds(pts) {
  if (!pts || !pts.length) return { x0:0, x1:30, y0:0, y1:40 };
  return {
    x0: Math.min(...pts.map(p => p.x)),
    x1: Math.max(...pts.map(p => p.x)),
    y0: Math.min(...pts.map(p => p.y)),
    y1: Math.max(...pts.map(p => p.y)),
  };
}

// Inset polygon INWARD by distance d
// Uses edge normal bisector method — result is always inside the original
export function pInset(pts, d) {
  if (!pts || pts.length < 3 || d <= 0) return pts;
  const n = pts.length;
  const norms = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    const dx = q.x - p.x, dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    // Inward normal (for CW polygon this points inward)
    return { nx: dy / len, ny: -dx / len };
  });
  return pts.map((p, i) => {
    const prev = (i - 1 + n) % n;
    let mx = (norms[prev].nx + norms[i].nx) / 2;
    let my = (norms[prev].ny + norms[i].ny) / 2;
    const len = Math.hypot(mx, my) || 1;
    return { x: r2(p.x + d * mx / len), y: r2(p.y + d * my / len) };
  });
}

// Sutherland-Hodgman clip to axis-aligned rectangle
export function pClip(poly, x0, x1, y0, y1) {
  if (!poly || poly.length < 3) return [];
  const iX = (a, b, x) => {
    const t = (x - a.x) / ((b.x - a.x) || 0.0001);
    return { x, y: a.y + t * (b.y - a.y) };
  };
  const iY = (a, b, y) => {
    const t = (y - a.y) / ((b.y - a.y) || 0.0001);
    return { x: a.x + t * (b.x - a.x), y };
  };
  const clips = [
    { in: p => p.x >= x0, cut: (a,b) => iX(a,b,x0) },
    { in: p => p.x <= x1, cut: (a,b) => iX(a,b,x1) },
    { in: p => p.y >= y0, cut: (a,b) => iY(a,b,y0) },
    { in: p => p.y <= y1, cut: (a,b) => iY(a,b,y1) },
  ];
  let out = poly;
  for (const cl of clips) {
    const inp = out; out = [];
    if (!inp.length) break;
    for (let i = 0; i < inp.length; i++) {
      const c = inp[i], pr = inp[(i - 1 + inp.length) % inp.length];
      if (cl.in(c)) {
        if (!cl.in(pr)) out.push(cl.cut(pr, c));
        out.push(c);
      } else if (cl.in(pr)) {
        out.push(cl.cut(pr, c));
      }
    }
  }
  return out;
}

// Edge lengths of polygon
export function edgeLens(pts) {
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return r2(Math.hypot(q.x - p.x, q.y - p.y));
  });
}

// Rescale edge i of polygon to newLen by moving vertex i+1
export function rescaleEdge(pts, ei, newLen) {
  const n = pts.length;
  const a = pts[ei], b = pts[(ei + 1) % n];
  const dx = b.x - a.x, dy = b.y - a.y;
  const s = newLen / (Math.hypot(dx, dy) || 1);
  return pts.map((p, i) => i === (ei + 1) % n
    ? { x: r2(a.x + dx * s), y: r2(a.y + dy * s) }
    : p
  );
}

// Snap to grid
export function snap(v) {
  return Math.round(v / SNAP) * SNAP;
}

// Centroid of polygon
export function pCentroid(pts) {
  if (!pts || !pts.length) return { x: 0, y: 0 };
  const b = pBounds(pts);
  return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
}
