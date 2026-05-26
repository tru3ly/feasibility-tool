// AS2890 Parking
export const BAY_W    = 2.6;
export const BAY_D    = 5.4;
export const ACC_W    = 3.8;
export const ACC_D    = 8.0;
export const AISLE_W  = 6.2;

// Building layout constants (from 10 reference childcare plans)
export const SPINE_D  = 6.6;
export const CORR_W   = 1.4;
export const SNAP     = 0.5;
export const DOOR_R   = 0.9;

// Layout strategy IDs
export const STRAT_L       = 0;
export const STRAT_WING    = 1;
export const STRAT_CLUSTER = 2;
export const STRAT_NAMES   = ["L-shaped", "Linear with wing", "Cluster"];

// NQF age groups
export const NQF = [
  { id:"u2",   label:"0\u20132 yrs", indoorM2:3.25, ratio:"1:4",  staffPer:4  },
  { id:"2to3", label:"2\u20133 yrs", indoorM2:3.25, ratio:"1:5",  staffPer:5  },
  { id:"3to5", label:"3\u20135 yrs", indoorM2:3.25, ratio:"1:11", staffPer:11 },
];

// Zone fill colours
export const ZONE_COLOR = {
  outdoor:"#162816", circ:"#3a2800", entry:"#1e3a50",
  service:"#2a2210", admin:"#162030", support:"#1e1e28",
  u2:"#1a3020", "2to3":"#1a2040", "3to5":"#251640",
  default:"#1e2330",
};

// UI colours
export const C = {
  bg:"#0f1117", panel:"#181c25", card:"#1e2330", border:"#2a3040",
  accent:"#4f9cf9", acdim:"#1a3460",
  green:"#22c55e", amber:"#f59e0b", red:"#ef4444",
  text:"#e8eaf0", muted:"#7b8298", label:"#a0a8c0",
};
