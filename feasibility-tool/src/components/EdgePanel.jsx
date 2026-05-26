import React from "react";
import { iS } from "./Ui.jsx";
import { C } from "../data/constants.js";
import { edgeLens, rescaleEdge } from "../utils/geometry.js";

const SIDE_LABELS = ["Side A — Front", "Side B — Right", "Side C — Rear", "Side D — Left"];

export default function EdgePanel({ pts, onChange }) {
  if (!pts || pts.length < 2) return null;
  const lens = edgeLens(pts);
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", color:C.label, marginBottom:5 }}>
        Side dimensions — type to rescale live
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
        {lens.map((len, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:3 }}>
            <span style={{ fontSize:9, color:C.muted, minWidth:70 }}>{SIDE_LABELS[i] || `Side ${i+1}`}:</span>
            <input
              type="number" step={0.5} min={0.5}
              style={{ ...iS, width:62, fontSize:10 }}
              value={len}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (v > 0.4) onChange(rescaleEdge(pts, i, v));
              }}
            />
            <span style={{ fontSize:9, color:C.muted }}>m</span>
          </div>
        ))}
      </div>
    </div>
  );
}
