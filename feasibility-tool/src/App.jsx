import React, { useState, useEffect, useCallback } from "react";
import { C, NQF } from "./data/constants.js";
import { DEF_COUNCILS, ROOM_PRESETS, blankProject } from "./data/defaults.js";
import { calcAll } from "./utils/calc.js";
import { buildLayout } from "./utils/layout.js";
import { uid, r1 } from "./utils/geometry.js";
import SiteCanvas from "./components/SiteCanvas.jsx";
import SummaryPanel from "./components/SummaryPanel.jsx";
import CouncilForm from "./components/CouncilForm.jsx";
import EdgePanel from "./components/EdgePanel.jsx";
import { Pill, MRow, iS, bS, bSp, bSg, bSd, cS, cT, lS, g2 } from "./components/Ui.jsx";

// ── Persistence ───────────────────────────────────────────────────────────────
const PK = "ccf8_p", CK = "ccf8_c";
function loadP() { try{ return JSON.parse(localStorage.getItem(PK)||"[]"); }catch(_){ return []; } }
function saveP(d) { try{ localStorage.setItem(PK, JSON.stringify(d)); }catch(_){} }
function loadC() { try{ return JSON.parse(localStorage.getItem(CK)||"null")||DEF_COUNCILS; }catch(_){ return DEF_COUNCILS; } }
function saveC(d) { try{ localStorage.setItem(CK, JSON.stringify(d)); }catch(_){} }

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [projs,   setProjs]   = useState(() => loadP());
  const [couns,   setCouns]   = useState(() => loadC());
  const [aid,     setAid]     = useState(null);
  const [tab,     setTab]     = useState("site");
  const [showCE,  setShowCE]  = useState(false);
  const [ecid,    setEcid]    = useState(null);
  const [layout,  setLayout]  = useState(null);
  const [flash,   setFlash]   = useState(false);

  useEffect(() => { saveP(projs); }, [projs]);
  useEffect(() => { saveC(couns); }, [couns]);

  const proj = projs.find(p => p.id === aid) || null;
  const co   = proj ? (couns.find(c => c.id === proj.cid) || couns[0]) : couns[0];
  const cl   = proj ? calcAll(proj, co) : null;

  // Regenerate layout on any change
  useEffect(() => {
    if (!proj || !co) { setLayout(null); return; }
    try {
      setLayout(buildLayout(proj, co, proj.seed || 1));
    } catch(e) {
      console.error("Layout error:", e);
      setLayout(null);
    }
  }, [aid, projs, co]);

  const upd = useCallback(fn => {
    setProjs(prev => prev.map(p => p.id === aid ? { ...fn(p), upd: Date.now() } : p));
  }, [aid]);

  function newP() { const p=blankProject(); setProjs(prev=>[p,...prev]); setAid(p.id); setTab("site"); }
  function doSave() { saveP(projs); setFlash(true); setTimeout(()=>setFlash(false),1500); }
  function newLayout() { upd(p => ({ ...p, seed: ((p.seed||1) % 5) + 1 })); }

  function tBtn(id, lbl) {
    return (
      <button key={id} onClick={() => setTab(id)} style={{
        padding:"5px 12px", cursor:"pointer", fontSize:9,
        letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:"bold",
        color: tab===id ? C.accent : C.muted,
        background:"transparent", border:"none",
        borderBottom: `2px solid ${tab===id ? C.accent : "transparent"}`,
        fontFamily:"'DM Mono',monospace",
      }}>{lbl}</button>
    );
  }

  // ── SITE TAB ─────────────────────────────────────────────────────────────
  function renderSite() {
    if (!proj) return null;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>

        <div style={cS}>
          <div style={cT}>◈ Aerial underlay</div>
          <input type="file" accept="image/*" style={{ fontSize:10, color:C.muted, width:"100%" }}
            onChange={e => {
              const f = e.target.files[0]; if(!f) return;
              const rd = new FileReader();
              rd.onload = ev => upd(p => ({...p, img:ev.target.result, showImg:true}));
              rd.readAsDataURL(f);
            }}
          />
          {proj.img && (
            <div style={{ marginTop:7, display:"flex", flexDirection:"column", gap:5 }}>
              <div>
                <label style={lS}>Scale (metres per pixel)</label>
                <input type="number" step={0.01} style={iS} value={proj.imgSc||1}
                  onChange={e => upd(p=>({...p,imgSc:parseFloat(e.target.value)||1}))} />
              </div>
              <div style={{ display:"flex", gap:5 }}>
                <button style={{...bS,flex:1}} onClick={() => upd(p=>({...p,showImg:!p.showImg}))}>
                  {proj.showImg ? "👁 Hide" : "👁 Show"} aerial
                </button>
                <button style={bSd} onClick={() => upd(p=>({...p,img:null,showImg:true}))}>✕ Remove</button>
              </div>
            </div>
          )}
        </div>

        <div style={cS}>
          <div style={cT}>◈ Site polygon</div>
          <div style={{ fontSize:9, color:C.muted, lineHeight:1.7, marginBottom:6 }}>
            Click to add · Drag=move · Right-click=delete
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            <button style={bS} onClick={() => upd(p=>({...p,pts:[]}))}>✕ Clear</button>
            <button style={bS} onClick={() => upd(p=>({...p,pts:[{x:0,y:0},{x:30,y:0},{x:30,y:40},{x:0,y:40}]}))}>□ 30×40m</button>
            <button style={bS} onClick={() => upd(p=>({...p,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:15},{x:35,y:15},{x:35,y:45},{x:0,y:45}]}))}>L-shape</button>
            <button style={bS} onClick={() => upd(p=>({...p,pts:[{x:0,y:5},{x:8,y:0},{x:30,y:0},{x:35,y:35},{x:20,y:45},{x:0,y:40}]}))}>Irregular</button>
          </div>
          <EdgePanel pts={proj.pts||[]} onChange={pts => upd(p=>({...p,pts}))} />
        </div>

        <div style={cS}>
          <div style={cT}>◈ Setbacks (m) — drawn inside boundary</div>
          <div style={{ fontSize:9, color:C.muted, marginBottom:7, lineHeight:1.6 }}>
            Side A = front/top · B = right · C = rear/bottom · D = left
          </div>
          <div style={g2}>
            {["a","b","c","d"].map(k => {
              const lbls={a:"Side A — Front",b:"Side B — Right",c:"Side C — Rear",d:"Side D — Left"};
              return (
                <div key={k}>
                  <label style={lS}>{lbls[k]}</label>
                  <input type="number" step={0.5} style={iS}
                    value={(proj.sbOv?.[k]) ?? co.sb[k]}
                    onChange={e => {
                      const v = parseFloat(e.target.value)||0;
                      upd(p => ({...p, sbOv:{...(p.sbOv||co.sb),[k]:v}}));
                    }}
                  />
                </div>
              );
            })}
          </div>
          <button style={{...bS,marginTop:6,fontSize:9}} onClick={() => upd(p=>({...p,sbOv:null}))}>
            ↺ Council defaults
          </button>
        </div>
      </div>
    );
  }

  // ── PARKING TAB ───────────────────────────────────────────────────────────
  function renderParking() {
    if (!proj) return null;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <div style={cS}>
          <div style={cT}>◈ Parking ratios</div>
          <div style={{ padding:"6px 8px", background:C.bg, borderRadius:3, fontSize:9, color:C.muted, lineHeight:1.9, marginBottom:8 }}>
            <b style={{color:C.accent}}>Standard: </b>2.6×5.4m = 14.04m²<br/>
            <b style={{color:C.amber}}>Accessible (AS2890.6): </b>3.8×8.0m = 30.4m²<br/>
            <b style={{color:C.muted}}>Aisle (AS2890.1 90°): </b>6.2m<br/>
            <b style={{color:C.green}}>Layout: </b>auto-selected per site shape + seed
          </div>
          <div style={{marginBottom:8}}>
            <label style={lS}>1 space per N children</label>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input type="number" style={{...iS,flex:1}} min={1}
                placeholder={co.pk.childPer+" (council default)"}
                value={proj.pkOv?.cp??""}
                onChange={e=>upd(p=>({...p,pkOv:{...(p.pkOv||{}),cp:e.target.value===""?null:parseInt(e.target.value)||4}}))}
              />
              {cl && <span style={{fontSize:10,color:C.green,whiteSpace:"nowrap"}}>→ {cl.cSp} sp</span>}
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <label style={lS}>1 space per N staff (0=none)</label>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input type="number" style={{...iS,flex:1}} min={0}
                placeholder={co.pk.staffPer+" (council default)"}
                value={proj.pkOv?.sp??""}
                onChange={e=>upd(p=>({...p,pkOv:{...(p.pkOv||{}),sp:e.target.value===""?null:parseInt(e.target.value)||0}}))}
              />
              {cl&&cl.sSp>0&&<span style={{fontSize:10,color:C.green,whiteSpace:"nowrap"}}>→ {cl.sSp} sp</span>}
            </div>
          </div>
          <div>
            <label style={lS}>Drop-off bays</label>
            <input type="number" style={iS} min={0} value={proj.dob}
              onChange={e=>upd(p=>({...p,dob:parseInt(e.target.value)||0}))} />
          </div>
          <button style={{...bS,marginTop:6,fontSize:9}} onClick={()=>upd(p=>({...p,pkOv:{cp:null,sp:null}}))}>
            ↺ Council defaults
          </button>
        </div>

        {layout && (
          <div style={cS}>
            <div style={cT}>◈ Current parking layout</div>
            <div style={{fontSize:10,color:C.muted,lineHeight:1.7}}>
              <b style={{color:C.text}}>Strategy:</b> {["Single row","Double row","L-run / split"][(proj.seed-1)%3]}<br/>
              <b style={{color:C.text}}>Total bays:</b> {layout.parking?.total || 0}<br/>
              <b style={{color:C.text}}>Accessible:</b> {layout.parking?.acc || 0} × AS2890.6<br/>
              <b style={{color:C.text}}>Drop-off:</b> {proj.dob}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ROOMS TAB ─────────────────────────────────────────────────────────────
  function renderRooms() {
    if (!proj) return null;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <div style={cS}>
          <div style={cT}>◈ Classrooms</div>
          {proj.rooms.map(cr => {
            const ag = NQF.find(a => a.id === cr.ag);
            return (
              <div key={cr.id} style={{ border:`1px solid ${C.border}`, borderRadius:4, padding:8, marginBottom:7 }}>
                <div style={{ display:"flex", gap:5, marginBottom:5, alignItems:"flex-end" }}>
                  <div style={{flex:1}}>
                    <label style={lS}>Label</label>
                    <input style={iS} value={cr.lbl}
                      onChange={e=>upd(p=>({...p,rooms:p.rooms.map(r=>r.id===cr.id?{...r,lbl:e.target.value}:r)}))} />
                  </div>
                  <button style={bSd} onClick={()=>upd(p=>({...p,rooms:p.rooms.filter(r=>r.id!==cr.id)}))}>✕</button>
                </div>
                <div style={g2}>
                  <div>
                    <label style={lS}>Age group</label>
                    <select style={{...iS,cursor:"pointer"}} value={cr.ag}
                      onChange={e=>upd(p=>({...p,rooms:p.rooms.map(r=>r.id===cr.id?{...r,ag:e.target.value}:r)}))}>
                      {NQF.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lS}>Children</label>
                    <input type="number" style={iS} value={cr.ch}
                      onChange={e=>upd(p=>({...p,rooms:p.rooms.map(r=>r.id===cr.id?{...r,ch:Math.max(1,parseInt(e.target.value)||1)}:r)}))} />
                  </div>
                </div>
                {ag && (
                  <div style={{ display:"flex", gap:5, marginTop:5 }}>
                    {[
                      [r1(cr.ch*ag.indoorM2)+"m²","Min area",C.green],
                      [Math.ceil(cr.ch/ag.staffPer)+" ("+ag.ratio+")","Staff",C.accent],
                      [cr.ch*7+"m²","Outdoor",C.amber],
                    ].map(([v,l,col]) => (
                      <div key={l} style={{ flex:1, background:C.bg, borderRadius:3, padding:"4px 6px" }}>
                        <div style={{ fontSize:8, color:C.muted }}>{l}</div>
                        <div style={{ fontSize:11, fontWeight:"bold", color:col }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <button style={bS} onClick={() => upd(p=>({...p,rooms:[...p.rooms,{id:uid(),ag:"3to5",ch:20,lbl:`Room ${p.rooms.length+1}`}]}))}>
            + Add room
          </button>
        </div>

        <div style={cS}>
          <div style={cT}>◈ Ancillary rooms</div>
          {proj.anc.map(rm => (
            <div key={rm.id} style={{ display:"flex", gap:5, marginBottom:5, alignItems:"flex-end" }}>
              <div style={{flex:1}}>
                <label style={lS}>Room</label>
                <input style={iS} value={rm.n}
                  onChange={e=>upd(p=>({...p,anc:p.anc.map(r=>r.id===rm.id?{...r,n:e.target.value}:r)}))} />
              </div>
              <div style={{width:58}}>
                <label style={lS}>m²</label>
                <input type="number" style={iS} value={rm.m}
                  onChange={e=>upd(p=>({...p,anc:p.anc.map(r=>r.id===rm.id?{...r,m:Number(e.target.value)}:r)}))} />
              </div>
              <button style={bSd} onClick={()=>upd(p=>({...p,anc:p.anc.filter(r=>r.id!==rm.id)}))}>✕</button>
            </div>
          ))}
          <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap" }}>
            <button style={bS} onClick={()=>upd(p=>({...p,anc:[...p.anc,{id:uid(),n:"New room",m:10}]}))}>+ Custom</button>
            <select style={{...iS,flex:1,cursor:"pointer"}} value=""
              onChange={e=>{
                if(!e.target.value) return;
                const pr=ROOM_PRESETS.find(r=>r.n===e.target.value);
                if(pr) upd(p=>({...p,anc:[...p.anc,{id:uid(),n:pr.n,m:pr.m}]}));
                e.target.value="";
              }}>
              <option value="">+ Add preset…</option>
              {ROOM_PRESETS.map(r=><option key={r.n} value={r.n}>{r.n} ~{r.m}m²</option>)}
            </select>
          </div>
          <div style={{marginTop:8}}>
            <label style={lS}>Circulation / walls (%)</label>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              <input type="number" style={{...iS,width:55}} value={proj.circ} min={5} max={30}
                onChange={e=>upd(p=>({...p,circ:parseInt(e.target.value)||15}))} />
              <span style={{fontSize:9,color:C.muted}}>of NLA — 12–18% typical</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height:"100vh", background:C.bg, color:C.text, fontFamily:"'DM Mono','Courier New',monospace", fontSize:12, display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ background:C.panel, borderBottom:`1px solid ${C.border}`, padding:"10px 18px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:"bold", letterSpacing:"0.12em", color:C.accent, textTransform:"uppercase" }}>Childcare Feasibility</span>
        <span style={{ color:C.muted, fontSize:9 }}>NSW · AS2890 · NQF · 3 Layout Strategies</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          <button style={{...bSg, background:flash?C.green:"#162a16"}} onClick={doSave}>{flash?"✓ Saved!":"💾 Save"}</button>
          {proj && <button style={bSg} onClick={newLayout}>⟳ New Layout ({["L-shaped","Wing","Cluster"][((proj.seed||1)-1)%3]})</button>}
          <button style={bS} onClick={()=>setShowCE(true)}>⚙ Councils</button>
          {proj && <button style={bS} onClick={()=>window.print()}>⎙ Print</button>}
          {proj && <button style={bS} onClick={()=>{
            const cp={...JSON.parse(JSON.stringify(proj)),id:uid(),name:proj.name+" (copy)",ts:Date.now(),upd:Date.now()};
            setProjs(prev=>[cp,...prev]); setAid(cp.id);
          }}>⧉ Copy</button>}
        </div>
      </div>

      {/* Body */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* Sidebar */}
        <div style={{ width:185, minWidth:185, background:C.panel, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflowY:"auto", flexShrink:0 }}>
          <div style={{padding:"8px 8px 7px"}}>
            <button style={{...bSp,width:"100%"}} onClick={newP}>+ New Project</button>
          </div>
          <div style={{fontSize:8,letterSpacing:"0.12em",textTransform:"uppercase",color:C.muted,padding:"5px 10px 2px"}}>Projects</div>
          {projs.length===0 && <div style={{padding:"7px 10px",color:C.muted,fontSize:10}}>No projects yet</div>}
          {projs.map(p => (
            <div key={p.id} onClick={()=>setAid(p.id)} style={{
              padding:"7px 10px", cursor:"pointer",
              background:p.id===aid?C.acdim+"88":"transparent",
              borderLeft:`2px solid ${p.id===aid?C.accent:"transparent"}`,
            }}>
              <div style={{fontSize:10,fontWeight:"bold",color:p.id===aid?C.accent:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
              <div style={{fontSize:9,color:C.muted,marginTop:1}}>{p.address||"No address"}</div>
              <div style={{fontSize:8,color:C.muted}}>{new Date(p.upd).toLocaleDateString("en-AU")}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        {!proj ? (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:C.muted}}>
            <div style={{fontSize:32}}>⬛</div>
            <div style={{fontSize:12,letterSpacing:"0.1em",textTransform:"uppercase"}}>Select or create a project</div>
            <button style={bSp} onClick={newP}>+ New Project</button>
          </div>
        ) : (
          <div style={{flex:1,display:"flex",overflow:"hidden"}}>

            {/* Controls */}
            <div style={{width:295,minWidth:295,borderRight:`1px solid ${C.border}`,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
              <div style={cS}>
                <div style={cT}>◈ Project</div>
                <div style={{marginBottom:6}}>
                  <label style={lS}>Name</label>
                  <input style={iS} value={proj.name} onChange={e=>upd(p=>({...p,name:e.target.value}))} />
                </div>
                <div style={{marginBottom:6}}>
                  <label style={lS}>Address</label>
                  <input style={iS} value={proj.address} placeholder="123 Example St" onChange={e=>upd(p=>({...p,address:e.target.value}))} />
                </div>
                <div style={{marginBottom:6}}>
                  <label style={lS}>Council</label>
                  <select style={{...iS,cursor:"pointer"}} value={proj.cid} onChange={e=>upd(p=>({...p,cid:e.target.value}))}>
                    {couns.map(c=><option key={c.id} value={c.id}>{c.name} — {c.zone}</option>)}
                  </select>
                </div>
                {co && <div style={{padding:"5px 7px",background:C.bg,borderRadius:3,fontSize:9,color:C.muted,lineHeight:1.6}}>{co.notes}</div>}
                <div style={{marginTop:7,display:"flex",gap:5,justifyContent:"flex-end"}}>
                  <button style={bSd} onClick={()=>{setProjs(prev=>prev.filter(p=>p.id!==aid));setAid(null);}}>✕ Delete</button>
                </div>
              </div>

              <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
                {tBtn("site","Site")}{tBtn("parking","Parking")}{tBtn("rooms","Rooms")}
              </div>

              {tab==="site"    && renderSite()}
              {tab==="parking" && renderParking()}
              {tab==="rooms"   && renderRooms()}
            </div>

            {/* Canvas */}
            <div style={{flex:1,overflow:"hidden",position:"relative",background:C.bg,display:"flex",flexDirection:"column"}}>
              <div style={{flex:1,overflow:"hidden"}}>
                <SiteCanvas
                  pts={proj.pts||[]}
                  onPts={pts=>upd(p=>({...p,pts}))}
                  sbOv={proj.sbOv}
                  coSb={co.sb}
                  calc={cl}
                  img={proj.img||null}
                  imgSc={proj.imgSc||1}
                  showImg={proj.showImg!==false}
                  layout={layout}
                />
              </div>
              <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6,background:C.panel+"ee",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 10px"}}>
                <span style={{fontSize:9,color:C.muted,alignSelf:"center"}}>Click=add · Drag=move · Right-click=delete · 0.5m snap</span>
                <button style={bSg} onClick={newLayout}>⟳ New layout</button>
              </div>
            </div>

            {/* Summary */}
            <SummaryPanel calc={cl} proj={proj} co={co} />
          </div>
        )}
      </div>

      {/* Council modal */}
      {showCE && (
        <div style={{position:"fixed",inset:0,background:"#000b",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{...cS,width:560,maxHeight:"80vh",overflowY:"auto",border:`1px solid ${C.accent}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div style={cT}>◈ Council database</div>
              <button style={bS} onClick={()=>{setShowCE(false);setEcid(null);}}>✕ Close</button>
            </div>
            {couns.map(c=>(
              <div key={c.id} style={{border:`1px solid ${C.border}`,borderRadius:4,padding:9,marginBottom:7}}>
                {ecid===c.id
                  ? <CouncilForm council={c} onSave={u=>{setCouns(prev=>prev.map(x=>x.id===c.id?u:x));setEcid(null);}} onCancel={()=>setEcid(null)} />
                  : (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontWeight:"bold",color:C.text,fontSize:11}}>{c.name}</div>
                        <div style={{fontSize:9,color:C.muted,marginTop:1}}>
                          {c.zone} | A:{c.sb.a}m B:{c.sb.b}m C:{c.sb.c}m D:{c.sb.d}m | 1/{c.pk.childPer} children | {c.maxCov}% cov
                        </div>
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        <button style={bS} onClick={()=>setEcid(c.id)}>Edit</button>
                        {couns.length>1 && <button style={bSd} onClick={()=>setCouns(prev=>prev.filter(x=>x.id!==c.id))}>✕</button>}
                      </div>
                    </div>
                  )
                }
              </div>
            ))}
            <button style={bSp} onClick={()=>{
              const nc={...JSON.parse(JSON.stringify(DEF_COUNCILS[0])),id:uid(),name:"New Council"};
              setCouns(prev=>[...prev,nc]); setEcid(nc.id);
            }}>+ Add council</button>
          </div>
        </div>
      )}
    </div>
  );
}
