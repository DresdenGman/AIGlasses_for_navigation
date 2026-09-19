# Continuous Facets — design v0.4

**Latest exterior design: v0.4.0.** Supersedes the earlier angular add-on and subtle resurfacing studies as the current visual direction. The original source remains a separate reference, not silently replaced.

![Actual v0.4 render](../../assets/renders/01_hero.png)

## Open the model

Download [AI_Glasses_Continuous_Facets_v0.4.blend](AI_Glasses_Continuous_Facets_v0.4.blend) and open it in **Blender 5.1 or later**. The initial view shows the complete exterior. The scene contains:

| Collection | Contents |
|---|---|
| `01_DESIGN_V04` | Rebuilt lower housing, separate upper cover, camera visualization and original nose-support surfaces |
| `00_REFERENCE_original_assembly` | Complete original assembly; hidden and selection-locked by default |
| `02_KEEP_OUT_envelope` | Conservative cavity-construction geometry; hidden by default |
| `03_STUDIO` | Camera, lighting and backdrop |

Enable the reference collection's objects to inspect the source geometry. Do not interpret connected mesh patches as identified electrical or mechanical parts.

## Files

| File | Purpose |
|---|---|
| [Main Blender scene](AI_Glasses_Continuous_Facets_v0.4.blend) | Editable model, materials and studio |
| [GLB](AI_Glasses_Continuous_Facets_v0.4.glb) | Portable exterior preview; raw source coordinates, not calibrated meter scale |
| [Lower shell STL](housing_lower.stl) · [Upper shell STL](housing_upper.stl) | Mesh exchange, **not production-approved printing files** |
| [Original assembly reference](reference_assembly.blend) | Preserved complete assembly for comparison and rebuilding |
| [Desk scene](AI_Glasses_Desk_Scene_v0.4.blend) | Editable staged context |
| [Maker scene](AI_Glasses_Maker_Scene_v0.4.blend) | Editable staged context |
| [Validation](validation.json) | Geometry checks and their limits |
| [Profiles](profiles.json) | Construction station profiles in original source units |
| [Build script](build_model.py) · [Render script](render_gallery.py) | Reproducible Blender Python construction and shots |

## Design and original geometry

The housing is rebuilt as a hollow continuous envelope with broad faces and clipped cross-section corners. It is not a set of plates added to the earlier visual model. A separate upper cover shares the housing's surfaces and provides a concept for access. The source nose-support meshes are retained. Camera visualization remains aligned with the source camera's X/Z location, with a front optical opening.

The [AI-generated concept board](approved_concept.png) established the visual direction. The lightweight implementation tightens the brow and temples. Six original exterior skin patches (1, 4, 5, 7, 10, 11) are replaced rather than enclosed by a second outer body; the remaining 162,052 source vertices form the protected reference. The concept board was not a dimensioned engineering drawing.

The complete original assembly contains 256,013 vertices and 292,998 faces. It is stored in its original world orientation, translated by +151.02978515625 on X to center it. The original physical units are **unverified**: no conversion to millimeters is asserted.

## What the checks do—and do not—show

The validation file records shell topology, surface intersections against the protected reference, and point-in-solid checks on all 162,052 protected vertices, including the final display bevels. The source-envelope padding and shell expansion are parameters in **source units**, not certified manufacturing clearances.

These checks do not identify the actual battery, PCB, cables or connectors; verify real component dimensions; establish safe battery retention, thermal performance or electrical isolation; or prove that parts can be inserted and fastened. A component completely inside a cavity is different from a component being practically installable. Upper-cover attachment and assembly sequence remain mechanical design work.

**Before fabrication:** calibrate source units from a measured feature; name and measure components; define wall thickness, clearance, fastening and cable bend radii; check insertion paths and service access; select a fabrication process; then validate a physical prototype. Do not scale the reference alone or assume the STL carries millimeters.

## Rebuild / rerender

The reference library and scripts are self-contained; no local private path, original OBJ or NumPy archive is required. Blender's bundled Python provides the required geometry libraries.

```bash
# Run from the repository root. Substitute your Blender executable as needed.
blender --background --factory-startup --python design/v0.4/build_model.py
blender --background design/v0.4/AI_Glasses_Continuous_Facets_v0.4.blend \
  --python design/v0.4/render_gallery.py
```

To keep new outputs separate, set `AIGLASSES_OUT` to another directory. The build script always reads the included reference next to the script. It writes the editable model, reference library, construction profiles, validation and a preview. The render script adds mesh exports, evaluated checks and all nine images. Generated PNGs appear in the chosen output folder; the website copies are in `assets/renders` and `assets/scenes`.

All published angles and staged scenes come from the same actual model. No synthesized community or user photographs are included.

[Geometry and image provenance](PROVENANCE.md) · [Release notes](../../docs/RELEASE_v0.4.md)

## Presentation renders

[Editable scenes, renders and consistency record](presentation/README.md).
