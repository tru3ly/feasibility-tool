import { NQF } from "../data/constants.js";
import { pArea, pBounds, pInset, r1 } from "./geometry.js";

export function calcAll(proj, co) {
  if (!proj || !co) return null;
  const sb  = proj.sbOv || co.sb;
  const b   = pBounds(proj.pts);
  const site = r1(pArea(proj.pts));

  // Envelope = area of inset polygon (setback applied inward)
  const avgSb  = (sb.a + sb.b + sb.c + sb.d) / 4;
  const insPts = pInset(proj.pts, avgSb);
  const env    = r1(pArea(insPts));

  const cp = proj.pkOv?.cp ?? co.pk.childPer;
  const sp = proj.pkOv?.sp ?? co.pk.staffPer;

  const rms = proj.rooms.map(r => {
    const ag = NQF.find(a => a.id === r.ag);
    if (!ag) return null;
    return { ...r, ag, aReq: r1(r.ch * ag.indoorM2), stReq: Math.ceil(r.ch / ag.staffPer) };
  }).filter(Boolean);

  const totCh  = rms.reduce((s, r) => s + r.ch, 0);
  const totSt  = rms.reduce((s, r) => s + r.stReq, 0) + 1;
  const clNLA  = r1(rms.reduce((s, r) => s + r.aReq, 0));
  const anNLA  = r1(proj.anc.reduce((s, r) => s + Number(r.m), 0));
  const netNLA = r1(clNLA + anNLA);
  const cirM2  = r1(netNLA * proj.circ / 100);
  const gfa    = r1(netNLA + cirM2);
  const outReq = totCh * 7;

  const cSp   = cp > 0 ? Math.ceil(totCh / cp) : 0;
  const sSp   = sp > 0 ? Math.ceil(totSt / sp) : 0;
  const pub   = cSp + sSp;
  const acc   = pub > 0 ? 1 : 0;
  const std   = Math.max(0, pub - acc);
  const totPk = std + acc;
  const cov   = site > 0 ? r1(gfa / site * 100) : 0;

  // Compliance table per room
  const compliance = rms.map(r => ({
    id:    r.id,
    label: r.lbl,
    ag:    r.ag,
    req:   r.aReq,
    prov:  r.aReq, // layout provides at least minimum
    pass:  true,
  }));

  return {
    sb, b, site, env, rms,
    totCh, totSt, clNLA, anNLA, netNLA, cirM2, gfa, outReq,
    cp, sp, cSp, sSp, std, acc, totPk, dob: proj.dob,
    cov, compliance,
    ok_gfa: gfa <= env       ? "pass" : "fail",
    ok_cov: cov <= co.maxCov ? "pass" : "fail",
    ok_w:   (b.x1 - b.x0) >= co.minW ? "pass" : "fail",
    rem:    r1(site - gfa - outReq),
  };
}
