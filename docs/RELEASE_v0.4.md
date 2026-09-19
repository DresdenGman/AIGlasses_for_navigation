# Design release v0.4 — Continuous Facets

The repository homepage now presents the Continuous Facets exterior design, a nine-image gallery, editable 3D files and a clearer account of the project's community work and affordability.

## Included

- Rebuilt faceted lower housing and separate upper cover, plus original nose-support geometry.
- Complete original assembly retained in a hidden reference collection; source OBJ unchanged.
- Blender studio, desk and maker scenes; GLB and two shell STL exports.
- Portable construction and gallery scripts, source-envelope validation and provenance notes.
- English and Chinese project introduction; four-community / nearly-100-person outreach and three-community making instruction described as creator reports.
- Historical China hardware cost under US$20 and current US estimate under US$30, explicitly excluding non-hardware costs and not misrepresented as a verified v0.4 bill of materials.
- Existing tested demonstration software brought onto the default branch with the presentation update.

## Validation

- Local Python suite: **13 passed**.
- Both shell base meshes have zero boundary edges and zero nonmanifold edges.
- Final evaluated shell surfaces, including bevels, have zero intersection pairs with the protected reference, excluding the six replaced exterior skin patches.
- Ray-parity checks find none of the 162,052 protected source vertices inside shell material.
- Construction and render scripts include the reference library and use no private absolute paths.

The geometry checks do not establish calibrated physical dimensions, real battery/PCB/cable fit, assembly paths, fastening, thermal safety or readiness for fabrication. These remain the next engineering work.
