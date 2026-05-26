import React, { useRef, useEffect, useCallback, useState } from "react";
import { C, ZONE_COLOR, BAY_W, BAY_D, ACC_W, ACC_D, AISLE_W, DOOR_R } from "../data/constants.js";
import { r1, r2, pArea, pBounds, pInset, snap } from "../utils/geometry.js";

const CW = 760, CH = 580;

function rrect(ctx, x, y, w, h, r) {
  if (w <= 0 || h <= 0) return;
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function polyPath(ctx, pts, sc, ox, oy) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const px = ox+p.x*sc, py = oy+p.y*sc;
    i === 0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
  });
  ctx.closePath();
}

function zoneFill(z, ag) {
  if (z === "classroom") return ZONE_COLOR[ag] || ZONE_COLOR["3to5"];
  return ZONE_COLOR[z] || ZONE_COLOR.default;
}

// Draw door arc on room wall (side: 0=top,1=right,2=bottom,3=left)
function drawDoor(ctx, rpx, rpy, rw, rh, side, sc) {
  const dr = Math.min(DOOR_R * sc, Math.min(rw, rh) * 0.35);
  ctx.save();
  ctx.strokeStyle = "#ffffff88";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);
  // Door gap (thin rectangle) + arc
  let dx, dy, startAngle, endAngle;
  if (side === 2) {        // bottom wall
    dx = rpx + rw * 0.3; dy = rpy + rh;
    ctx.beginPath(); ctx.arc(dx, dy, dr, -Math.PI/2, 0); ctx.stroke();
    ctx.strokeRect(dx, rpy+rh-1, dr, 2);
  } else if (side === 0) { // top wall
    dx = rpx + rw * 0.3; dy = rpy;
    ctx.beginPath(); ctx.arc(dx, dy, dr, Math.PI/2, Math.PI); ctx.stroke();
    ctx.strokeRect(dx-dr, rpy, dr, 2);
  } else if (side === 1) { // right wall
    dx = rpx + rw; dy = rpy + rh * 0.3;
    ctx.beginPath(); ctx.arc(dx, dy, dr, Math.PI, 3*Math.PI/2); ctx.stroke();
    ctx.strokeRect(rpx+rw-1, dy, 2, dr);
  } else {                 // left wall
    dx = rpx; dy = rpy + rh * 0.3;
    ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI/2); ctx.stroke();
    ctx.strokeRect(rpx, dy, 2, dr);
  }
  ctx.restore();
}

// North arrow (top-left)
function drawNorthArrow(ctx) {
  ctx.save();
  const ax = 36, ay = 44, len = 18;
  ctx.fillStyle = C.text+"cc";
  ctx.strokeStyle = C.text+"cc";
  ctx.lineWidth = 1.5;
  // Arrow shaft
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay-len); ctx.stroke();
  // Arrow head
  ctx.beginPath(); ctx.moveTo(ax, ay-len); ctx.lineTo(ax-5,ay-len+8); ctx.lineTo(ax+5,ay-len+8); ctx.closePath();
  ctx.fill();
  ctx.font = "bold 10px DM Mono, monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("N", ax, ay-len-9);
  ctx.restore();
}

// Scale bar (bottom-left)
function drawScaleBar(ctx, sc) {
  const barM = 10; // 10 metres
  const barPx = barM * sc;
  const bx = 28, by = CH - 22;
  ctx.save();
  ctx.strokeStyle = C.text+"99"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+barPx,by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx,by-4); ctx.lineTo(bx,by+4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx+barPx,by-4); ctx.lineTo(bx+barPx,by+4); ctx.stroke();
  ctx.fillStyle = C.text+"99"; ctx.font = "9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText("0", bx, by-6); ctx.fillText(barM+"m", bx+barPx, by-6);
  ctx.fillText("Scale bar", bx+barPx/2, by+12);
  ctx.restore();
}

export default function SiteCanvas({ pts, onPts, sbOv, coSb, calc, img, imgSc, showImg, layout }) {
  const ref = useRef(null);
  const [drag, setDrag]       = useState(null);
  const [hovEdge, setHovEdge] = useState(null);

  const getT = useCallback(() => {
    const src = pts.length ? pts : [{x:0,y:0},{x:30,y:0},{x:30,y:40},{x:0,y:40}];
    const b   = pBounds(src);
    const mw  = (b.x1-b.x0)||30, mh = (b.y1-b.y0)||40;
    const pad = 68;
    const sc  = Math.min((CW-pad*2)/mw, (CH-pad*2)/mh);
    const ox  = (CW-mw*sc)/2-b.x0*sc;
    const oy  = (CH-mh*sc)/2-b.y0*sc;
    return { sc, ox, oy, b };
  }, [pts]);

  const tC = useCallback((rx,ry)=>{ const{sc,ox,oy}=getT(); return{px:ox+rx*sc,py:oy+ry*sc}; },[getT]);
  const tR = useCallback((px,py)=>{ const{sc,ox,oy}=getT(); return{x:snap((px-ox)/sc),y:snap((py-oy)/sc)}; },[getT]);

  useEffect(() => {
    const cv = ref.current; if(!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0,0,CW,CH);
    const {sc,ox,oy,b} = getT();
    const px = x => ox+x*sc, py = y => oy+y*sc;

    // Aerial
    if (img && showImg) {
      const im = new Image();
      im.onload = () => {
        const iw=im.width*imgSc*sc, ih=im.height*imgSc*sc;
        const ix=px(b.x0)-(iw-(b.x1-b.x0)*sc)/2;
        const iy=py(b.y0)-(ih-(b.y1-b.y0)*sc)/2;
        ctx.globalAlpha=0.45; ctx.drawImage(im,ix,iy,iw,ih); ctx.globalAlpha=1;
      };
      im.src = img;
    }

    // Grid
    const gs = sc>=10?5:sc>=5?10:20;
    ctx.strokeStyle=C.border+"44"; ctx.lineWidth=0.4;
    for(let gx=Math.floor(b.x0/gs)*gs; gx<=b.x1+gs; gx+=gs) {
      ctx.beginPath(); ctx.moveTo(px(gx),0); ctx.lineTo(px(gx),CH); ctx.stroke();
      ctx.fillStyle=C.border+"88"; ctx.font="8px monospace";
      ctx.textAlign="center"; ctx.textBaseline="alphabetic";
      ctx.fillText(gx+"m",px(gx),CH-3);
    }
    for(let gy=Math.floor(b.y0/gs)*gs; gy<=b.y1+gs; gy+=gs) {
      ctx.beginPath(); ctx.moveTo(0,py(gy)); ctx.lineTo(CW,py(gy)); ctx.stroke();
      ctx.fillStyle=C.border+"88"; ctx.textAlign="left";
      ctx.fillText(gy+"m",3,py(gy)-2);
    }

    if (!pts.length) {
      ctx.fillStyle=C.muted; ctx.font="13px monospace";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("Click to add site boundary vertices",CW/2,CH/2-12);
      ctx.font="10px monospace";
      ctx.fillText("Drag=move · Right-click=delete · Click edge=insert · 0.5m snap",CW/2,CH/2+10);
      return;
    }

    // Outdoor play (polygon-shaped)
    if (layout) {
      layout.rms.filter(r=>r.isOut).forEach(rm => {
        if (!rm.poly||rm.poly.length<3) return;
        polyPath(ctx,rm.poly,sc,ox,oy);
        ctx.fillStyle="#1a2e1a"; ctx.fill();
        ctx.strokeStyle=C.green+"66"; ctx.lineWidth=1; ctx.setLineDash([4,3]);
        polyPath(ctx,rm.poly,sc,ox,oy); ctx.stroke(); ctx.setLineDash([]);
        const ob=pBounds(rm.poly);
        const lcx=px((ob.x0+ob.x1)/2), lcy=py((ob.y0+ob.y1)/2);
        ctx.fillStyle=C.green+"aa"; ctx.font="bold 9px monospace";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("Outdoor Play",lcx,lcy-7);
        ctx.fillStyle=C.green+"77"; ctx.font="8px monospace";
        ctx.fillText(rm.m+"m²",lcx,lcy+5);
      });
    }

    // Building rooms
    if (layout) {
      layout.rms.filter(r=>!r.isOut).forEach(rm => {
        const rpx=px(rm.x), rpy=py(rm.y), rw=rm.w*sc, rh=rm.h*sc;
        if(rw<1||rh<1) return;
        ctx.fillStyle = zoneFill(rm.z, rm.ag);
        rrect(ctx,rpx,rpy,rw,rh,2); ctx.fill();
        // Hatching for circulation corridor
        if (rm.isCirc) {
          ctx.save();
          ctx.clip();
          ctx.strokeStyle="#f59e0b33"; ctx.lineWidth=0.6;
          for(let d=-rw-rh; d<rw+rh; d+=6) {
            ctx.beginPath(); ctx.moveTo(rpx+d,rpy); ctx.lineTo(rpx+d+rh,rpy+rh); ctx.stroke();
          }
          ctx.restore();
          ctx.strokeStyle=C.amber+"55"; ctx.lineWidth=1; ctx.setLineDash([]);
        } else {
          ctx.strokeStyle="#ffffff18"; ctx.lineWidth=0.7; ctx.setLineDash([]);
        }
        rrect(ctx,rpx,rpy,rw,rh,2); ctx.stroke();

        // Room label
        if(rw>16&&rh>10){
          const fs=Math.min(9,Math.min(rw,rh)*0.17);
          ctx.fillStyle=rm.isCirc?C.amber+"bb":C.text+"bb";
          ctx.font=(rm.isCls?"bold ":"")+fs+"px monospace";
          ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(rm.n,rpx+rw/2,rpy+rh/2-(rm.m>0?4:0),rw-4);
          if(rm.m>0){
            ctx.fillStyle=C.muted+"88";
            ctx.font=Math.min(8,fs*.88)+"px monospace";
            ctx.fillText(rm.m+"m²",rpx+rw/2,rpy+rh/2+5,rw-4);
          }
        }

        // Door symbol
        if (!rm.isCirc && !rm.isOut && rw>20 && rh>12) {
          drawDoor(ctx, rpx, rpy, rw, rh, rm.doorSide ?? 2, sc);
        }
      });

      // Entry arrow
      if (layout.entryPt) {
        const epx=px(layout.entryPt.x), epy=py(layout.entryPt.y);
        ctx.save();
        ctx.fillStyle=C.green; ctx.strokeStyle=C.green; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(epx,epy-28); ctx.lineTo(epx,epy-2);
        ctx.lineTo(epx-8,epy-12); ctx.moveTo(epx,epy-2); ctx.lineTo(epx+8,epy-12); ctx.stroke();
        ctx.font="bold 8px monospace"; ctx.textAlign="center"; ctx.textBaseline="alphabetic";
        ctx.fillText("ENTRY",epx,epy-30);
        ctx.restore();
      }

      // Staff entry arrow (different colour)
      if (layout.staffEntry) {
        const spx=px(layout.staffEntry.x), spy=py(layout.staffEntry.y);
        ctx.save();
        ctx.fillStyle=C.muted; ctx.strokeStyle=C.muted; ctx.lineWidth=1.5;
        ctx.setLineDash([3,2]);
        ctx.beginPath(); ctx.moveTo(spx,spy-20); ctx.lineTo(spx,spy-2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font="8px monospace"; ctx.textAlign="center"; ctx.textBaseline="alphabetic";
        ctx.fillText("STAFF",spx,spy-22);
        ctx.restore();
      }

      // Strategy name label
      if (layout.stratName) {
        ctx.save();
        ctx.fillStyle=C.card+"dd";
        ctx.fillRect(CW-190,CH-30,185,22);
        ctx.strokeStyle=C.border; ctx.lineWidth=0.5; ctx.strokeRect(CW-190,CH-30,185,22);
        ctx.fillStyle=C.accent; ctx.font="bold 9px monospace";
        ctx.textAlign="left"; ctx.textBaseline="middle";
        ctx.fillText("Strategy: "+layout.stratName,CW-184,CH-19);
        ctx.restore();
      }

      // Parking
      if (layout.parking && layout.parking.bays && layout.parking.bays.length) {
        layout.parking.bays.forEach(bay => {
          if (bay.isAisle) {
            if (bay.vertical) {
              ctx.fillStyle="#181808";
              ctx.fillRect(px(bay.x),py(bay.y),bay.w*sc,bay.h*sc);
            } else {
              ctx.fillStyle="#181808";
              ctx.fillRect(px(bay.x),py(bay.y),bay.w*sc,bay.h*sc);
              ctx.fillStyle=C.muted+"44"; ctx.font="8px monospace";
              ctx.textAlign="left"; ctx.textBaseline="middle";
              ctx.fillText("AISLE "+AISLE_W+"m",px(bay.x)+3,py(bay.y)+bay.h*sc/2);
            }
            return;
          }
          const bpx=px(bay.x),bpy=py(bay.y);
          const bw=bay.rotated?bay.w*sc:bay.w*sc;
          const bh=bay.rotated?bay.h*sc:bay.h*sc;
          const fill  =bay.t==="acc"?C.amber+"28":bay.t==="dob"?C.accent+"28":C.green+"1e";
          const stroke=bay.t==="acc"?C.amber+"88":bay.t==="dob"?C.accent+"88":C.green+"66";
          ctx.fillStyle=fill; ctx.fillRect(bpx,bpy,bw,bh);
          ctx.strokeStyle=stroke; ctx.lineWidth=0.8; ctx.strokeRect(bpx,bpy,bw,bh);
          // Centre line divider
          ctx.strokeStyle=stroke+"66"; ctx.lineWidth=0.4;
          ctx.beginPath();
          if (bay.rotated) { ctx.moveTo(bpx,bpy+bh/2); ctx.lineTo(bpx+bw,bpy+bh/2); }
          else              { ctx.moveTo(bpx+bw/2,bpy); ctx.lineTo(bpx+bw/2,bpy+bh); }
          ctx.stroke();
          const lc=bay.t==="acc"?C.amber:bay.t==="dob"?C.accent:C.green;
          ctx.fillStyle=lc; ctx.font="bold 8px monospace";
          ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(bay.lbl,bpx+bw/2,bpy+bh/2);
        });

        // Vehicle entry arrow
        const firstBay = layout.parking.bays.filter(b=>!b.isAisle)[0];
        if (firstBay) {
          const vx=px(firstBay.x-2), vy=py(firstBay.y+firstBay.h/2);
          ctx.save(); ctx.strokeStyle=C.amber; ctx.fillStyle=C.amber; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(vx,vy); ctx.lineTo(vx+20,vy);
          ctx.lineTo(vx+12,vy-6); ctx.moveTo(vx+20,vy); ctx.lineTo(vx+12,vy+6); ctx.stroke();
          ctx.font="7px monospace"; ctx.textAlign="right"; ctx.textBaseline="middle";
          ctx.fillText("ENTRY",vx-2,vy); ctx.restore();
        }

        // Parking label
        const stdBays = layout.parking.bays.filter(b=>!b.isAisle);
        if (stdBays.length) {
          ctx.fillStyle=C.muted+"88"; ctx.font="8px monospace";
          ctx.textAlign="left"; ctx.textBaseline="alphabetic";
          ctx.fillText("PARKING — "+layout.parking.total+" spaces (AS2890)",
            px(stdBays[0].x), py(stdBays[0].y)-4);
        }
      }
    }

    // Setback line — INSIDE boundary (amber dashed)
    const sbVals = sbOv || coSb;
    if (pts.length >= 3 && sbVals && calc) {
      const avgSb=(sbVals.a+sbVals.b+sbVals.c+sbVals.d)/4;
      const ins=pInset(pts,avgSb);
      if(ins&&ins.length>=3){
        polyPath(ctx,ins,sc,ox,oy);
        ctx.strokeStyle=C.amber+"aa"; ctx.lineWidth=1.3; ctx.setLineDash([5,4]);
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle=C.amber+"07"; ctx.fill();
        const ib=pBounds(ins);
        ctx.fillStyle=C.amber+"88"; ctx.font="8px monospace";
        ctx.textAlign="center"; ctx.textBaseline="alphabetic";
        ctx.fillText("SETBACK (inside boundary)",px((ib.x0+ib.x1)/2),py(ib.y0)-4);
        // Setback dimension ticks
        ["a","b","c","d"].forEach((side,si)=>{
          const d=sbVals[side];
          if(!d) return;
          const lbl=["A "+d+"m","B "+d+"m","C "+d+"m","D "+d+"m"][si];
          const lx=[px((b.x0+b.x1)/2),px(b.x1)-15,px((b.x0+b.x1)/2),px(b.x0)+15][si];
          const ly=[py(b.y0)+10,py((b.y0+b.y1)/2),py(b.y1)-5,py((b.y0+b.y1)/2)][si];
          ctx.fillStyle=C.amber+"77"; ctx.font="8px monospace";
          ctx.textAlign="center"; ctx.fillText(lbl,lx,ly);
        });
      }
    }

    // Site boundary (blue, on top)
    polyPath(ctx,pts,sc,ox,oy);
    ctx.strokeStyle=C.accent; ctx.lineWidth=2; ctx.setLineDash([]);
    ctx.stroke(); ctx.fillStyle=C.accent+"07"; ctx.fill();

    // Edge dimension labels (Side A/B/C/D)
    const SIDE_LBL=["A","B","C","D"];
    pts.forEach((pt,i)=>{
      const q=pts[(i+1)%pts.length];
      const mx=(pt.x+q.x)/2, my=(pt.y+q.y)/2;
      const dx=q.x-pt.x, dy=q.y-pt.y, len=Math.hypot(dx,dy)||1;
      const nx=-dy/len*1.5, ny=dx/len*1.5;
      const lx=px(mx+nx), ly=py(my+ny);
      const el=r2(Math.hypot(q.x-pt.x,q.y-pt.y));
      const isH=hovEdge===i;
      const lbl=(SIDE_LBL[i]||String(i+1))+" — "+el+"m";
      ctx.font=(isH?"bold ":"")+"9px monospace";
      const tw=ctx.measureText(lbl).width+10;
      ctx.fillStyle=isH?C.amber+"ee":C.card+"ee";
      rrect(ctx,lx-tw/2,ly-7,tw,13,3); ctx.fill();
      ctx.fillStyle=isH?"#000":C.text;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(lbl,lx,ly);
    });

    // Vertices
    pts.forEach(pt=>{
      const{px:vx,py:vy}=tC(pt.x,pt.y);
      ctx.fillStyle=C.accent; ctx.beginPath(); ctx.arc(vx,vy,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=C.bg; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(vx,vy,5,0,Math.PI*2); ctx.stroke();
    });

    // Site area label
    if(pts.length>=3){
      const ab=pBounds(pts);
      const lcx=px((ab.x0+ab.x1)/2), lcy=py(ab.y1)+16;
      const area=r1(pArea(pts));
      ctx.fillStyle=C.card+"ee";
      rrect(ctx,lcx-46,lcy-8,92,16,3); ctx.fill();
      ctx.fillStyle=C.accent; ctx.font="bold 10px monospace";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("SITE: "+area+"m²",lcx,lcy);
    }

    drawNorthArrow(ctx);
    drawScaleBar(ctx, sc);

    // Legend
    const leg=[
      [C.accent,"Site boundary"],[C.amber,"Setback (inside)"],
      [C.green,"Outdoor play"],["#251640","3-5yr rooms"],
      ["#1a2040","2-3yr rooms"],["#1a3020","0-2yr rooms"],
      ["#162030","Admin/service"],[C.amber+"99","Circulation"],
    ];
    leg.forEach(([col,lbl],i)=>{
      ctx.fillStyle=col; ctx.fillRect(CW-152,8+i*15,10,9);
      ctx.fillStyle=C.text+"99"; ctx.font="9px monospace";
      ctx.textAlign="left"; ctx.textBaseline="middle";
      ctx.fillText(lbl,CW-138,13+i*15);
    });

  }, [pts, sbOv, coSb, calc, img, imgSc, showImg, getT, tC, hovEdge, layout]);

  function gPos(e){ const r=ref.current.getBoundingClientRect(); return{px:(e.clientX-r.left)*(CW/r.width),py:(e.clientY-r.top)*(CH/r.height)}; }
  function fVtx(cpx,cpy){ for(let i=0;i<pts.length;i++){const{px:vx,py:vy}=tC(pts[i].x,pts[i].y);if(Math.hypot(cpx-vx,cpy-vy)<10)return i;}return -1; }
  function fEdge(cpx,cpy){
    for(let i=0;i<pts.length;i++){
      const a=tC(pts[i].x,pts[i].y),b2=tC(pts[(i+1)%pts.length].x,pts[(i+1)%pts.length].y);
      const dx=b2.px-a.px,dy=b2.py-a.py;
      const t=Math.max(0,Math.min(1,((cpx-a.px)*dx+(cpy-a.py)*dy)/(dx*dx+dy*dy)));
      if(Math.hypot(cpx-(a.px+t*dx),cpy-(a.py+t*dy))<8)return i;
    }return -1;
  }
  function onMD(e){
    const{px:cpx,py:cpy}=gPos(e);
    if(e.button===2){e.preventDefault();const vi=fVtx(cpx,cpy);if(vi>=0)onPts(pts.filter((_,i)=>i!==vi));return;}
    const vi=fVtx(cpx,cpy);
    if(vi>=0){setDrag(vi);return;}
    const ei=fEdge(cpx,cpy),real=tR(cpx,cpy);
    if(ei>=0){const n=[...pts];n.splice(ei+1,0,real);onPts(n);}
    else onPts([...pts,real]);
  }
  function onMM(e){
    const{px:cpx,py:cpy}=gPos(e);
    if(drag!==null)onPts(pts.map((pt,i)=>i===drag?tR(cpx,cpy):pt));
    else setHovEdge(fEdge(cpx,cpy));
  }

  return (
    <canvas ref={ref} width={CW} height={CH}
      style={{ width:"100%", display:"block", background:C.bg, cursor:drag!==null?"grabbing":"crosshair" }}
      onMouseDown={onMD} onMouseMove={onMM}
      onMouseUp={()=>setDrag(null)}
      onMouseLeave={()=>{setDrag(null);setHovEdge(null);}}
      onContextMenu={e=>e.preventDefault()}
    />
  );
}
