function uid() { return Math.random().toString(36).slice(2,8); }

export const DEF_COUNCILS = [{
  id:"cc", name:"Central Coast Council", zone:"Residential",
  sb:{ a:5, b:3, c:3, d:3 },
  pk:{ childPer:4, staffPer:0 },
  maxCov:40, minW:18,
  notes:"Front setback (Side A) per Child Care Planning Guideline. 40% max site coverage. Min 18m site width.",
  src:"Central Coast DCP 2022, Ch 2.10",
}];

export const ROOM_PRESETS = [
  {n:"Reception",m:12},{n:"Office",m:10},{n:"Staff Room",m:22},
  {n:"Kitchen",m:20},{n:"Pantry",m:8},{n:"Laundry",m:12},
  {n:"Accessible WC",m:8},{n:"Entry / Lobby",m:10},
  {n:"Waste Room",m:14},{n:"External Storage",m:16},
  {n:"Program Room",m:12},{n:"Pram Storage",m:8},
];

export function blankProject() {
  return {
    id:uid(), name:"New project", address:"", cid:"cc",
    ts:Date.now(), upd:Date.now(),
    pts:[{x:0,y:0},{x:30,y:0},{x:30,y:40},{x:0,y:40}],
    img:null, imgSc:1, showImg:true,
    sbOv:null,
    pkOv:{ cp:null, sp:null },
    dob:2,
    rooms:[
      {id:uid(),ag:"u2",  ch:15,lbl:"Room 1 \u2014 Nursery"},
      {id:uid(),ag:"2to3",ch:20,lbl:"Room 2 \u2014 Toddler"},
      {id:uid(),ag:"3to5",ch:25,lbl:"Room 3 \u2014 Kinder"},
    ],
    anc:[
      {id:uid(),n:"Reception",m:12},{id:uid(),n:"Office",m:10},
      {id:uid(),n:"Staff Room",m:22},{id:uid(),n:"Kitchen",m:20},
      {id:uid(),n:"Pantry",m:8},{id:uid(),n:"Laundry",m:12},
      {id:uid(),n:"Accessible WC",m:8},{id:uid(),n:"Waste Room",m:14},
    ],
    circ:15,
    seed:1,
    notes:"",
  };
}
