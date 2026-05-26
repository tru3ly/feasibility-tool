import React, { useState } from "react";
import { iS, bSp, bS, g2, lS } from "./Ui.jsx";

export default function CouncilForm({ council, onSave, onCancel }) {
  const [f, setF] = useState(() => JSON.parse(JSON.stringify(council)));

  function set(path, val) {
    const parts = path.split(".");
    setF(prev => {
      const n = JSON.parse(JSON.stringify(prev));
      let o = n;
      for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      o[parts[parts.length - 1]] = val;
      return n;
    });
  }

  function fi(label, path, type) {
    const v = path.split(".").reduce((o, k) => o[k], f);
    return (
      <div key={path}>
        <label style={lS}>{label}</label>
        <input type={type || "text"} style={iS} value={v}
          onChange={e => set(path, type === "number" ? parseFloat(e.target.value) : e.target.value)} />
      </div>
    );
  }

  return (
    <div>
      <div style={g2}>
        {fi("Name", "name")}
        {fi("Zone", "zone")}
        {fi("Setback A — Front (m)", "sb.a", "number")}
        {fi("Setback B — Right (m)", "sb.b", "number")}
        {fi("Setback C — Rear (m)",  "sb.c", "number")}
        {fi("Setback D — Left (m)",  "sb.d", "number")}
        {fi("Parking: 1 per N children", "pk.childPer", "number")}
        {fi("Parking: 1 per N staff (0=none)", "pk.staffPer", "number")}
        {fi("Max coverage (%)",  "maxCov", "number")}
        {fi("Min site width (m)","minW",   "number")}
      </div>
      <div style={{ marginTop:5 }}>{fi("Notes", "notes")}</div>
      <div style={{ display:"flex", gap:5, marginTop:7 }}>
        <button style={bSp} onClick={() => onSave(f)}>✓ Save</button>
        <button style={bS}  onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
