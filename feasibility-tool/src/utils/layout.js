import {
  BAY_W, BAY_D, ACC_W, ACC_D, AISLE_W,
  SPINE_D, CORR_W, DOOR_R,
  STRAT_L, STRAT_WING, STRAT_CLUSTER, STRAT_NAMES, NQF,
  ZONE_COLOR,
} from "../data/constants.js";
import { r1, r2, pBounds, pArea, pInset, pClip } from "./geometry.js";

// ── HELPERS ───────────────────────────────────────────────────────────────────
function roomFill(z, ag) {
  if (z === "classroom") return ZONE_COLOR[ag] || ZONE_COLOR.default;
  return ZONE_COLOR[z] || ZONE_COLOR.default;
}

function mkRoom(id, n, m, z, x, y, w, h, extra = {}) {
  return { id, n, m: r1(m), z, x: r2(x), y: r2(y), w: r2(w), h: r2(h), ...extra };
}

// Door: which wall faces corridor (0=top,1=right,2=bottom,3=left) + position along wall
function doorSide(room, corrY, corrX) {
  // For rooms in row above corridor: door on bottom (side 2)
  // For rooms in row below corridor: door on top (side 0)
  // For rooms in left column: door on right (side 1)
  if (corrY !== undefined) {
    return room.y + room.h <= corrY + 0.5 ? 2 : 0;
  }
  if (corrX !== undefined) {
    return room.x + room.w <= corrX + 0.5 ? 1 : 3;
  }
  return 2;
}

// ── PARKING LAYOUT ────────────────────────────────────────────────────────────
// Analyses polygon boundaries and chooses: single-row, double-row, L-run, or split
function buildParking(pts, sb, dob, seed, totCh) {
  const b   = pBounds(pts);
  const cp  = 4;
  const cSp = Math.ceil(totCh / cp);
  const acc = cSp > 0 ? 1 : 0;
  const std = Math.max(0, cSp - acc);
  const total = std + acc + dob;

  // Envelope
  const ex0 = b.x0 + sb.d;
  const ex1 = b.x1 - sb.b;
  const ey0 = b.y0 + sb.a;

  // Front strip available width and height
  const frontW  = ex1 - ex0;
  const frontH  = b.y0 + sb.a - b.y0; // gap between boundary and setback

  // Width of one row of all bays
  const rowW = r2(std * BAY_W + acc * ACC_W + dob * BAY_W);

  // Strategy selection based on seed and site shape
  const pkStrat = seed % 3; // 0=front single, 1=front double, 2=front+side

  const bays    = [];
  let usedH     = 0;

  if (pkStrat === 0 || rowW <= frontW + 0.1) {
    // Single row along front boundary
    const startX = r2(ex0 + Math.max(0, (frontW - rowW) * 0.3));
    const bayY   = r2(b.y0 + 0.3);
    let cx = startX;

    for (let i = 0; i < std; i++) {
      if (cx + BAY_W > ex1 + 0.1) break;
      bays.push({ t:"std",  x:r2(cx), y:bayY, w:BAY_W, h:BAY_D, lbl:String(i+1) });
      cx += BAY_W;
    }
    if (acc > 0 && cx + ACC_W <= ex1 + 0.1) {
      bays.push({ t:"acc", x:r2(cx), y:bayY, w:ACC_W, h:ACC_D, lbl:"\u267F" });
      cx += ACC_W;
    }
    for (let i = 0; i < dob && cx + BAY_W <= ex1 + 0.1; i++) {
      bays.push({ t:"dob", x:r2(cx), y:bayY, w:BAY_W, h:BAY_D, lbl:"D/O" });
      cx += BAY_W;
    }
    const aisleW = r2(cx - startX);
    if (aisleW > 0) bays.push({ t:"aisle", x:r2(startX), y:r2(bayY+BAY_D), w:aisleW, h:AISLE_W, isAisle:true });
    usedH = BAY_D + AISLE_W;

  } else if (pkStrat === 1) {
    // Double row (back-to-back) along front boundary
    const halfN = Math.ceil(total / 2);
    const half2 = total - halfN;
    let cx = ex0, bayY = r2(b.y0 + 0.3);

    // Row 1
    let count = 0;
    for (let i = 0; i < std && count < halfN; i++, count++) {
      bays.push({ t:"std", x:r2(cx), y:bayY, w:BAY_W, h:BAY_D, lbl:String(i+1) });
      cx += BAY_W;
    }
    if (acc > 0 && count < halfN) {
      bays.push({ t:"acc", x:r2(cx), y:bayY, w:ACC_W, h:ACC_D, lbl:"\u267F" });
      cx += ACC_W; count++;
    }
    for (let i = 0; i < dob && count < halfN; i++, count++) {
      bays.push({ t:"dob", x:r2(cx), y:bayY, w:BAY_W, h:BAY_D, lbl:"D/O" });
      cx += BAY_W;
    }
    const r1w = r2(cx - ex0);
    if (r1w > 0) bays.push({ t:"aisle", x:ex0, y:r2(bayY+BAY_D), w:r1w, h:AISLE_W, isAisle:true });

    // Row 2
    cx = ex0; bayY = r2(bayY + BAY_D + AISLE_W);
    count = 0;
    const stdDone = Math.min(halfN, std);
    const accDone = acc > 0 && halfN > std ? 1 : 0;
    for (let i = stdDone; i < std && count < half2; i++, count++) {
      bays.push({ t:"std", x:r2(cx), y:bayY, w:BAY_W, h:BAY_D, lbl:String(i+1) });
      cx += BAY_W;
    }
    if (acc > 0 && accDone === 0 && count < half2) {
      bays.push({ t:"acc", x:r2(cx), y:bayY, w:ACC_W, h:ACC_D, lbl:"\u267F" });
      cx += ACC_W; count++;
    }
    const r2w = r2(cx - ex0);
    if (r2w > 0) bays.push({ t:"aisle", x:ex0, y:r2(bayY+BAY_D), w:r2w, h:AISLE_W, isAisle:true });
    usedH = (BAY_D + AISLE_W) * 2;

  } else {
    // Split: main batch front, overflow on side boundary (L-run)
    const frontFit = Math.floor(frontW / BAY_W);
    const sideFit  = total - frontFit;

    let cx = r2(ex0), bayY = r2(b.y0 + 0.3);
    let count = 0;
    for (let i = 0; i < std && count < frontFit; i++, count++) {
      bays.push({ t:"std", x:r2(cx), y:bayY, w:BAY_W, h:BAY_D, lbl:String(i+1) });
      cx += BAY_W;
    }
    if (acc > 0 && count < frontFit) {
      bays.push({ t:"acc", x:r2(cx), y:bayY, w:ACC_W, h:ACC_D, lbl:"\u267F" });
      cx += ACC_W; count++;
    }
    for (let i = 0; i < dob && count < frontFit; i++, count++) {
      bays.push({ t:"dob", x:r2(cx), y:bayY, w:BAY_W, h:BAY_D, lbl:"D/O" });
      cx += BAY_W;
    }
    const fw = r2(cx - ex0);
    if (fw > 0) bays.push({ t:"aisle", x:r2(ex0), y:r2(bayY+BAY_D), w:fw, h:AISLE_W, isAisle:true });
    usedH = BAY_D + AISLE_W;

    // Side bays along right boundary (rotated 90°)
    if (sideFit > 0) {
      let sideY = r2(ey0 + 0.3);
      let remaining = sideFit;
      const stdLeft = Math.max(0, std - Math.min(frontFit, std));
      let sdone = 0;
      for (let i = 0; i < stdLeft && sdone < remaining; i++, sdone++) {
        bays.push({ t:"std", x:r2(b.x1-BAY_D-sb.b), y:r2(sideY), w:BAY_D, h:BAY_W, lbl:String(frontFit+i+1), rotated:true });
        sideY += BAY_W;
      }
      if (sdone < remaining) {
        bays.push({ t:"aisle", x:r2(b.x1-BAY_D-AISLE_W-sb.b), y:r2(ey0+0.3), w:AISLE_W, h:r2(sdone*BAY_W), isAisle:true, vertical:true });
      }
    }
  }

  return { bays, usedH, std, acc, total };
}

// ── ADMIN ROOM LIST (ordered per reference plans) ─────────────────────────────
function adminRoomList(totCh) {
  return [
    { id:"waste",  n:"Waste",        m:14,  z:"service" },
    { id:"extst",  n:"Ext. Storage", m:16,  z:"service" },
    { id:"entry",  n:"Entry",        m:10,  z:"entry",   isEntry:true },
    { id:"recept", n:"Reception",    m:12,  z:"entry"   },
    { id:"awc",    n:"Acc WC",       m:8,   z:"entry"   },
    { id:"comms",  n:"Comms",        m:4,   z:"entry"   },
    { id:"office", n:"Office",       m:10,  z:"admin"   },
    { id:"prog",   n:"Program Room", m:12,  z:"admin"   },
    { id:"staff",  n:"Staff Room",   m: totCh > 80 ? 29 : 22, z:"admin" },
    { id:"kitch",  n:"Kitchen",      m:20,  z:"admin"   },
    { id:"pantry", n:"Pantry",       m:8,   z:"admin"   },
    { id:"lndry",  n:"Laundry",      m:12,  z:"admin"   },
  ];
}

// Classroom + support rooms
function clsRoomList(rooms) {
  const ordered = [...rooms].sort((a, c) => {
    const o = { u2:2, "2to3":1, "3to5":0 };
    return (o[a.ag] || 0) - (o[c.ag] || 0);
  });
  const out = [];
  ordered.forEach(cr => {
    const ag = NQF.find(a => a.id === cr.ag);
    if (!ag) return;
    const area = r1(cr.ch * ag.indoorM2);
    // Vary room depth 5-8m based on area
    const depth = r1(Math.min(8, Math.max(5, Math.sqrt(area) * 1.1)));
    const width = r1(Math.max(3, area / depth));
    const wc = cr.ch <= 12 ? 9 : cr.ch <= 20 ? 14 : 18;
    out.push({ id:"cls_"+cr.id, n:cr.lbl, m:area, z:"classroom", ag:cr.ag, ch:cr.ch, isCls:true, prefW:width, prefH:depth });
    out.push({ id:"wc_"+cr.id,  n:"WC",   m:wc,   z:"support",   prefW: wc/SPINE_D, prefH:SPINE_D });
    if (cr.ag === "u2") {
      const cotM2 = r1(Math.max(15, Math.ceil(cr.ch/2)*2.5));
      out.push({ id:"cot_"+cr.id, n:"Cot Room",    m:cotM2, z:"support", prefW: cotM2/SPINE_D, prefH:SPINE_D });
      out.push({ id:"bot_"+cr.id, n:"Bottle Prep", m:7,     z:"support", prefW: 7/SPINE_D,     prefH:SPINE_D });
    }
  });
  return out;
}

// ── STRATEGY 0: L-SHAPED ─────────────────────────────────────────────────────
// Admin wing: horizontal across top of envelope
// Classroom wing: vertical down left side
// Outdoor: fills the corner + bottom right
function strategyL(bldX0, bldY0, bldX1, bldY1, adminRms, clsRms, pts) {
  const placed = [];
  const bldW = bldX1 - bldX0;
  const bldH = bldY1 - bldY0;

  // Admin horizontal bar
  const adminBarH = SPINE_D;
  const corrH     = CORR_W;
  const adminCorrY = r2(bldY0 + adminBarH);
  let ax = r2(bldX0 + 0.2);
  const maxAdX = r2(bldX1 - 0.2);
  adminRms.forEach(rm => {
    const w = Math.max(1.5, r2(rm.m / adminBarH));
    if (ax + w > maxAdX) return;
    placed.push(mkRoom(rm.id, rm.n, rm.m, rm.z, ax, bldY0, w, adminBarH, { isEntry:rm.isEntry, doorSide:2 }));
    ax += w;
  });

  // Corridor horizontal
  placed.push(mkRoom("circ_h", "Circulation", r1((ax - bldX0 - 0.2) * corrH), "circ",
    r2(bldX0+0.2), adminCorrY, r2(ax - bldX0 - 0.2), corrH, { isCirc:true }));

  // Classroom vertical wing: left side, below admin row
  const clsWingX  = r2(bldX0);
  const clsWingW  = Math.min(bldW * 0.55, r2(bldX0 + SPINE_D * 1.5));
  const clsStartY = r2(adminCorrY + corrH);
  let cy = clsStartY;
  const maxCY = r2(bldY1 - 0.2);
  clsRms.forEach(rm => {
    const h = rm.prefH || SPINE_D;
    const w = Math.min(clsWingW, Math.max(3, rm.prefW || r2(rm.m / h)));
    if (cy + h > maxCY) return;
    placed.push(mkRoom(rm.id, rm.n, rm.m, rm.z, clsWingX, cy, w, h,
      { isCls: rm.isCls, ag: rm.ag, doorSide: 1 }));
    cy += h + 0.1;
  });

  // Corridor vertical (right side of cls wing)
  const vertCorrX  = r2(clsWingX + clsWingW);
  const vertCorrH  = r2(cy - clsStartY);
  if (vertCorrH > 0) {
    placed.push(mkRoom("circ_v", "Corridor", r1(vertCorrH * corrH), "circ",
      vertCorrX, clsStartY, corrH, vertCorrH, { isCirc:true }));
  }

  // Outdoor play: remaining polygon clipped to bottom-right area
  const outX0 = r2(vertCorrX + corrH + 0.3);
  const outY0 = r2(adminCorrY);
  const outPoly = pClip(pts, outX0, bldX1 + 5, outY0, bldY1 + 5);
  if (outPoly.length >= 3) {
    placed.push({ id:"outdoor", n:"Outdoor Play", m:r1(pArea(outPoly)), z:"outdoor",
      isOut:true, poly:outPoly });
  }
  // Also outdoor below classrooms
  const outBot = pClip(pts, bldX0, bldX1 + 5, r2(cy + 0.5), bldY1 + 5);
  if (outBot.length >= 3 && pArea(outBot) > 1) {
    placed.push({ id:"outdoor_b", n:"Outdoor Play", m:r1(pArea(outBot)), z:"outdoor",
      isOut:true, poly:outBot });
  }

  return placed;
}

// ── STRATEGY 1: LINEAR WITH OFFSET WING ──────────────────────────────────────
// Two parallel bars (admin top, classrooms bottom) with horizontal offset
// Gives a dynamic non-perfectly-aligned appearance
function strategyWing(bldX0, bldY0, bldX1, bldY1, adminRms, clsRms, pts, seed) {
  const placed = [];
  const offset  = r2(((seed % 3) + 1) * 0.6); // 0.6–1.8m stagger
  const corrY   = r2(bldY0 + SPINE_D);
  const rowBY   = r2(corrY + CORR_W);
  const rowBH   = Math.min(SPINE_D, r2(bldY1 - rowBY - 0.5));

  // Admin bar (full width, no offset)
  let ax = r2(bldX0 + 0.2);
  const maxAdX = r2(bldX1 - 0.2);
  adminRms.forEach(rm => {
    const w = Math.max(1.5, r2(rm.m / SPINE_D));
    if (ax + w > maxAdX) return;
    placed.push(mkRoom(rm.id, rm.n, rm.m, rm.z, ax, bldY0, w, SPINE_D,
      { isEntry:rm.isEntry, doorSide:2 }));
    ax += w;
  });

  // Horizontal corridor
  const corrLen = r2(Math.min(ax - bldX0 - 0.2, bldX1 - bldX0 - 0.4));
  placed.push(mkRoom("circ_h", "Circulation "+CORR_W+"m wide", r1(corrLen*CORR_W), "circ",
    r2(bldX0+0.2), corrY, corrLen, CORR_W, { isCirc:true }));

  // Classroom bar (offset by `offset` metres)
  let bx = r2(bldX0 + 0.2 + offset);
  const maxBx = r2(bldX1 - 0.2);
  clsRms.forEach(rm => {
    const w = Math.max(1.5, r2((rm.prefW || r2(rm.m/rowBH)) ));
    if (bx + w > maxBx) return;
    placed.push(mkRoom(rm.id, rm.n, rm.m, rm.z, bx, rowBY, w, rowBH,
      { isCls:rm.isCls, ag:rm.ag, doorSide:0 }));
    bx += w + 0.1;
  });

  // Wing: remaining classrooms that didn't fit — perpendicular at right end
  // (any overflow rooms stack vertically on the right)
  const wingX = r2(bldX1 - SPINE_D - 0.2);
  let wingY   = r2(bldY0);
  clsRms.filter(rm => {
    const w = r2(rm.prefW || r2(rm.m/rowBH));
    return bx - offset > maxBx; // already overflowed
  }).slice(0, 3).forEach(rm => {
    const h = Math.min(SPINE_D, r2(bldY1 - wingY - 0.5));
    if (h < 2) return;
    placed.push(mkRoom(rm.id+"_w", rm.n, rm.m, rm.z, wingX, wingY, SPINE_D, h,
      { isCls:rm.isCls, ag:rm.ag, doorSide:1 }));
    wingY += h + 0.1;
  });

  // Outdoor below building
  const outY0 = r2(rowBY + rowBH + 0.4);
  const outPoly = pClip(pts, bldX0, bldX1+5, outY0, bldY1+5);
  if (outPoly.length >= 3) {
    placed.push({ id:"outdoor", n:"Outdoor Play", m:r1(pArea(outPoly)), z:"outdoor", isOut:true, poly:outPoly });
  }

  return placed;
}

// ── STRATEGY 2: CLUSTER ───────────────────────────────────────────────────────
// Central circulation hub with rooms radiating on both sides
// More organic — rooms at different depths
function strategyCluster(bldX0, bldY0, bldX1, bldY1, adminRms, clsRms, pts) {
  const placed = [];
  const bldW   = bldX1 - bldX0;
  const midX   = r2(bldX0 + bldW / 2);
  const hubW   = Math.min(4, bldW * 0.15);
  const hubX   = r2(midX - hubW/2);
  const hubH   = r2(bldY1 - bldY0 - 0.5);

  // Central circulation hub (spine)
  placed.push(mkRoom("hub", "Circulation Hub "+CORR_W+"m", r1(hubW*hubH), "circ",
    hubX, r2(bldY0+0.2), hubW, hubH, { isCirc:true }));

  // Left side: admin rooms varying depth 5-7m
  let leftY = r2(bldY0 + 0.2);
  adminRms.forEach(rm => {
    const depth = r1(Math.min(7, Math.max(5, rm.m / 3.5)));
    const w     = r2(rm.m / depth);
    const lx    = r2(hubX - w - 0.1);
    if (lx < bldX0 || leftY + depth > bldY1 - 0.2) return;
    placed.push(mkRoom(rm.id, rm.n, rm.m, rm.z, lx, leftY, w, depth,
      { isEntry:rm.isEntry, doorSide:1 }));
    leftY += depth + 0.15;
  });

  // Right side: classrooms
  let rightY = r2(bldY0 + 0.2);
  clsRms.forEach(rm => {
    const depth = rm.prefH || SPINE_D;
    const w     = r2(rm.prefW || Math.max(3, rm.m / depth));
    const rx    = r2(hubX + hubW + 0.1);
    if (rx + w > bldX1 - 0.1 || rightY + depth > bldY1 - 0.2) return;
    placed.push(mkRoom(rm.id, rm.n, rm.m, rm.z, rx, rightY, w, depth,
      { isCls:rm.isCls, ag:rm.ag, doorSide:3 }));
    rightY += depth + 0.15;
  });

  // Outdoor below hub
  const outY0   = r2(Math.max(leftY, rightY) + 0.4);
  const outPoly = pClip(pts, bldX0, bldX1+5, outY0, bldY1+5);
  if (outPoly.length >= 3) {
    placed.push({ id:"outdoor", n:"Outdoor Play", m:r1(pArea(outPoly)), z:"outdoor", isOut:true, poly:outPoly });
  }

  return placed;
}

// ── MAIN ENTRY ────────────────────────────────────────────────────────────────
export function buildLayout(proj, co, seed) {
  const pts = proj.pts;
  if (!pts || pts.length < 3) return null;

  const sb   = proj.sbOv || co.sb;
  const b    = pBounds(pts);
  const totCh = proj.rooms.reduce((s, r) => s + r.ch, 0);

  // Envelope
  const ex0 = b.x0 + sb.d;
  const ex1 = b.x1 - sb.b;
  const ey0 = b.y0 + sb.a;
  const ey1 = b.y1 - sb.c;
  const eW  = Math.max(0, ex1 - ex0);
  const eH  = Math.max(0, ey1 - ey0);
  if (eW < 6 || eH < 6) return null;

  // Parking
  const pk = buildParking(pts, sb, proj.dob || 0, seed, totCh);

  // Building zone (after parking)
  const bldY0 = r2(Math.max(ey0, b.y0 + pk.usedH + 0.3));
  const bldY1 = r2(ey1);
  const bldX0 = r2(ex0);
  const bldX1 = r2(ex1);
  const bH    = bldY1 - bldY0;
  const bW    = bldX1 - bldX0;
  if (bH < 4 || bW < 4) return null;

  const adminRms = adminRoomList(totCh);
  const clsRms   = clsRoomList(proj.rooms);

  // Pick strategy: seed 1-5 maps to 3 strategies cyclically
  const stratIdx    = (seed - 1) % 3;
  const stratName   = ["L-shaped", "Linear with wing", "Cluster"][stratIdx];

  let rms;
  if (stratIdx === 0)      rms = strategyL(bldX0, bldY0, bldX1, bldY1, adminRms, clsRms, pts);
  else if (stratIdx === 1) rms = strategyWing(bldX0, bldY0, bldX1, bldY1, adminRms, clsRms, pts, seed);
  else                     rms = strategyCluster(bldX0, bldY0, bldX1, bldY1, adminRms, clsRms, pts);

  // Entry arrow point (from first entry-zone room)
  const entryRoom = rms.find(r => r.isEntry);
  const entryPt   = entryRoom
    ? { x: r2(entryRoom.x + entryRoom.w/2), y: r2(entryRoom.y) }
    : { x: r2((bldX0+bldX1)/2), y: bldY0 };

  // Staff entry: top-right of building or right boundary
  const staffEntry = { x: r2(bldX1 - 1), y: r2(bldY0) };

  return { rms, parking:pk, bldBox:{ x:bldX0,y:bldY0,w:bW,h:bH }, stratName, entryPt, staffEntry, seed };
}
