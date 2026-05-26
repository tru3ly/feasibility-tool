# Childcare Feasibility Tool — NSW Planning

A React + Vite planning tool for NSW childcare centre feasibility assessment.

## Features
- **3 Auto-generated layout strategies**: L-shaped, Linear with wing, Cluster — randomly selected per seed
- **Live site canvas**: draw polygon boundary, drag vertices, edge dimensions (Side A/B/C/D)
- **Setback line drawn inside boundary** (amber dashed)
- **Aerial image underlay**: upload, scale, hide/show toggle
- **AS2890 parking**: auto-layout (single row, double row, or L-run split across boundaries)
- **NQF room sizing**: 3.25m²/child indoors, 7m²/child outdoors, staff ratios per age group
- **Door symbols** on every room indicating swing direction
- **North arrow + scale bar** on canvas
- **NQF compliance table** in summary panel
- **Multi-council database** (defaults to Central Coast DCP 2022)
- **Save/load** via localStorage — projects persist between sessions

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  data/
    constants.js    # AS2890 dims, NQF standards, colours, strategy IDs
    defaults.js     # Default council, room presets, blank project factory
  utils/
    geometry.js     # Polygon math (area, bounds, inset, clip, edge rescale)
    calc.js         # Feasibility calculations
    layout.js       # 3 layout strategies + parking engine
  components/
    SiteCanvas.jsx  # Main canvas — all drawing logic
    SummaryPanel.jsx# Right-side summary, compliance table
    EdgePanel.jsx   # Side A/B/C/D dimension inputs
    CouncilForm.jsx # Council edit form
    Ui.jsx          # Shared UI atoms (Pill, MRow, style constants)
  App.jsx           # Main application shell + state management
  App.css           # Global reset
main.jsx            # React DOM entry point
index.html          # HTML entry
```

## Layout Strategies (⟳ New Layout cycles through)

| Seed % 3 | Strategy | Description |
|----------|----------|-------------|
| 0 | L-shaped | Admin wing horizontal, classroom wing vertical, outdoor in the L-corner |
| 1 | Linear with wing | Two parallel bars with horizontal offset + perpendicular overflow wing |
| 2 | Cluster | Central circulation hub, admin rooms on left, classrooms on right |

## Parking Configurations (Seed % 3)

| Config | When used |
|--------|-----------|
| Single row | Seed %3=0 or all bays fit in site width |
| Double row (back-to-back) | Seed %3=1 |
| L-run / split across boundaries | Seed %3=2 |

## Council Setbacks (Sides A–D)

- **Side A** = Front / top (street-facing)
- **Side B** = Right boundary
- **Side C** = Rear / bottom
- **Side D** = Left boundary

All setback lines are drawn INSIDE the site boundary (blue line = boundary; amber dashed = setback).
