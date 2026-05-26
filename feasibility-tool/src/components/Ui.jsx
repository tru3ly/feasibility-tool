import React from "react";
import { C } from "../data/constants.js";

export function Pill({ status, children }) {
  const col = status === "pass" ? C.green : status === "warn" ? C.amber : C.red;
  return (
    <span style={{
      background:`${col}22`, border:`1px solid ${col}44`,
      borderRadius:20, padding:"1px 8px",
      fontSize:9, color:col, fontWeight:"bold", textTransform:"uppercase",
    }}>{children}</span>
  );
}

export function MRow({ label, val, unit, status, note }) {
  const col = status === "pass" ? C.green : status === "fail" ? C.red : C.amber;
  return (
    <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between",
      padding:"5px 0", borderBottom:`1px solid ${C.border}22` }}>
      <div>
        <span style={{ color:C.label, fontSize:10 }}>{label}</span>
        {note && <div style={{ fontSize:9, color:C.muted, marginTop:1 }}>{note}</div>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontWeight:"bold", fontSize:12, color:status ? col : C.text }}>
          {val}<span style={{ fontSize:9, color:C.muted }}> {unit}</span>
        </span>
        {status && <Pill status={status}>{status === "pass" ? "OK" : "FAIL"}</Pill>}
      </div>
    </div>
  );
}

export const iS = {
  width:"100%", background:C.bg, border:`1px solid ${C.border}`,
  borderRadius:3, padding:"4px 7px", color:C.text,
  fontSize:11, fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box",
};
export const bS  = { background:"transparent", border:`1px solid ${C.border}`, borderRadius:3, padding:"3px 9px", color:C.text, fontSize:10, fontFamily:"'DM Mono',monospace", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 };
export const bSp = { ...bS, background:C.acdim, border:`1px solid ${C.accent}`, color:C.accent, fontWeight:"bold" };
export const bSg = { ...bS, background:"#162a16", border:`1px solid ${C.green}`,  color:C.green,  fontWeight:"bold" };
export const bSd = { ...bS, border:"1px solid #3a1515", color:C.red };
export const cS  = { background:C.card, border:`1px solid ${C.border}`, borderRadius:7, padding:"11px 13px" };
export const cT  = { fontSize:9, fontWeight:"bold", letterSpacing:"0.14em", textTransform:"uppercase", color:C.accent, marginBottom:9 };
export const lS  = { fontSize:10, color:C.label, marginBottom:2, display:"block" };
export const g2  = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 };
