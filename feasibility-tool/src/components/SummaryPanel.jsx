import React from "react";
import { C } from "../data/constants.js";
import { r1 } from "../utils/geometry.js";
import { Pill, MRow, cS, cT } from "./Ui.jsx";

export default function SummaryPanel({ calc, proj, co }) {
  if (!calc || !proj) return null;
  return (
    <div style={{ width:235, minWidth:235, borderLeft:`1px solid ${C.border}`, overflowY:"auto", padding:10, display:"flex", flexDirection:"column", gap:8 }}>

      {/* Quick stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
        {[
          [calc.totCh,     "Children",    C.text],
          [calc.totSt,     "Staff",       C.accent],
          [calc.site+"m²", "Site",        C.text],
          [calc.gfa+"m²",  "GFA req.",    C.green],
          [calc.outReq+"m²","Min outdoor",C.amber],
          [calc.totPk+" sp","Parking",    C.accent],
        ].map(([v,l,col]) => (
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:"6px 8px" }}>
            <div style={{ fontSize:8, color:C.muted }}>{l}</div>
            <div style={{ fontSize:14, fontWeight:"bold", color:col }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Room schedule */}
      <div style={cS}>
        <div style={cT}>◈ Room schedule</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:9 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {["Room","Kids","Stf","Req m²","Out m²"].map(h =>
                <th key={h} style={{ padding:"2px 3px", textAlign:"left", color:C.muted, fontSize:8, textTransform:"uppercase" }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {calc.rms.map(r => (
              <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}22` }}>
                <td style={{ padding:"3px", color:C.text, maxWidth:55, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.lbl}</td>
                <td style={{ padding:"3px", fontWeight:"bold" }}>{r.ch}</td>
                <td style={{ padding:"3px", color:C.accent }}>{r.stReq}</td>
                <td style={{ padding:"3px", color:C.green }}>{r.aReq}</td>
                <td style={{ padding:"3px", color:C.amber }}>{r.ch*7}</td>
              </tr>
            ))}
            <tr style={{ background:C.bg, borderTop:`1px solid ${C.border}` }}>
              <td style={{ padding:"3px", fontWeight:"bold", color:C.label }}>TOTAL</td>
              <td style={{ padding:"3px", fontWeight:"bold" }}>{calc.totCh}</td>
              <td style={{ padding:"3px", fontWeight:"bold", color:C.accent }}>{calc.totSt}</td>
              <td style={{ padding:"3px", fontWeight:"bold", color:C.green }}>{calc.clNLA}</td>
              <td style={{ padding:"3px", fontWeight:"bold", color:C.amber }}>{calc.outReq}</td>
            </tr>
          </tbody>
        </table>

        {/* Outdoor play callout */}
        <div style={{ marginTop:8, padding:"7px 9px", background:C.bg, borderRadius:4, border:`1px solid ${C.amber}44` }}>
          <div style={{ fontSize:9, color:C.amber, fontWeight:"bold", marginBottom:2 }}>Min outdoor play (NQF)</div>
          <div style={{ fontSize:20, fontWeight:"bold", color:C.amber }}>{calc.outReq}m²</div>
          <div style={{ fontSize:9, color:C.muted }}>{calc.totCh} children × 7m²/child</div>
        </div>
      </div>

      {/* Floor areas */}
      <div style={cS}>
        <div style={cT}>◈ Floor areas</div>
        <MRow label="Classroom NLA"   val={calc.clNLA}  unit="m²" />
        <MRow label="Ancillary NLA"   val={calc.anNLA}  unit="m²" />
        <MRow label={`Circulation (${proj.circ}%)`} val={calc.cirM2} unit="m²" />
        <MRow label="Total GFA"       val={calc.gfa}    unit="m²" />
        <MRow label="Buildable envelope" val={calc.env} unit="m²" status={calc.ok_gfa}
          note={(calc.env-calc.gfa>=0?"+":"")+r1(calc.env-calc.gfa)+"m² headroom"} />
        <MRow label="Coverage" val={calc.cov} unit={`% (max ${co.maxCov}%)`} status={calc.ok_cov} />
      </div>

      {/* Compliance table */}
      <div style={cS}>
        <div style={cT}>◈ NQF compliance</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:9 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {["Space","Req m²","Prov m²","✓"].map(h =>
                <th key={h} style={{ padding:"2px 3px", textAlign:"left", color:C.muted, fontSize:8, textTransform:"uppercase" }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {calc.compliance.map(row => (
              <tr key={row.id} style={{ borderBottom:`1px solid ${C.border}22` }}>
                <td style={{ padding:"3px", color:C.text, maxWidth:60, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{row.label}</td>
                <td style={{ padding:"3px", color:C.muted }}>{row.req}</td>
                <td style={{ padding:"3px", color:row.pass?C.green:C.red }}>{row.prov}</td>
                <td style={{ padding:"3px" }}>{row.pass ? "✅" : "❌"}</td>
              </tr>
            ))}
            <tr style={{ borderBottom:`1px solid ${C.border}22` }}>
              <td style={{ padding:"3px", color:C.text }}>Outdoor play</td>
              <td style={{ padding:"3px", color:C.muted }}>{calc.outReq}</td>
              <td style={{ padding:"3px", color:C.green }}>{calc.outReq}</td>
              <td style={{ padding:"3px" }}>✅</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Verdict */}
      <div style={{ ...cS, border:`1px solid ${calc.ok_gfa==="pass"&&calc.ok_cov==="pass"&&calc.ok_w==="pass"?C.green+"55":C.red+"55"}` }}>
        <div style={cT}>◈ Verdict</div>
        {[
          ["GFA fits envelope", calc.ok_gfa, calc.ok_gfa==="pass"?"FITS":"OVER"],
          ["Site coverage",     calc.ok_cov, calc.ok_cov==="pass"?calc.cov+"% OK":calc.cov+"% OVER"],
          ["Min site width",    calc.ok_w,   r1(calc.b.x1-calc.b.x0)+"m"],
        ].map(([l,s,t]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0", borderBottom:`1px solid ${C.border}22` }}>
            <span style={{ fontSize:10, color:C.label }}>{l}</span>
            <Pill status={s}>{t}</Pill>
          </div>
        ))}
        <div style={{ marginTop:6, fontSize:9, color:C.muted }}>
          Remaining (site − GFA − outdoor):{" "}
          <span style={{ fontWeight:"bold", color:calc.rem>=0?C.green:C.red }}>{calc.rem}m²</span>
        </div>
      </div>

      {/* Notes */}
      <div style={cS}>
        <div style={cT}>◈ Notes</div>
        <textarea
          style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:3, padding:"4px 7px", color:C.text, fontSize:11, fontFamily:"'DM Mono',monospace", outline:"none", height:60, resize:"vertical", lineHeight:1.5 }}
          value={proj.notes} placeholder="Notes..."
          onChange={e => {/* handled by parent */}}
          readOnly
        />
      </div>
    </div>
  );
}
