# 3D Print Notes — Alignment Jig

## Files
| File | Description |
|---|---|
| `Alignment-tool.3mf` | Main jig body — clamps to wheel rim |
| `screwcap.3mf` | Clamping bolt cap — the orange piece that locks the jig against the rim |

Print both files. The screwcap threads onto the clamping bolt and is the piece you tighten by hand to secure the jig to the wheel.

## Original Print Setup
- **Printer:** Creality K1C
- **Material:** PET-G recommended (rigid, low warp, temperature stable in a hot garage)
- **Infill:** 40%+ for rigidity — the jig needs to hold its shape under clamping pressure
- **Layer height:** 0.2mm
- **Supports:** May be needed depending on orientation — check slicer preview

## Universal Use Notes
The file was tuned for the Creality K1C. If you're printing on a different machine:
- Re-slice in your own slicer (Bambu Studio, Orca, Cura, PrusaSlicer, etc.)
- Check first layer adhesion — the flat contact faces must be truly flat for accurate readings
- Scale: **do not scale** — dimensions are set for phone fit and wheel rim clearance

## How It Works with the App
1. Clamp the jig to the wheel rim face (not the tire sidewall)
2. Insert your phone into the tray — screen facing outward
3. The jig holds the phone at a consistent angle relative to the wheel face
4. The app reads the phone's gyroscope/accelerometer to calculate camber, toe, and caster

## Tips
- Print the clamping bolt receiver in a contrasting color if your printer supports multi-material
- The orange bolt/nut shown in the original design can be printed in PETG or TPU
- After printing, test fit on a flat surface — the jig should sit without rocking
