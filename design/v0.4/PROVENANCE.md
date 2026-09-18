# Geometry and imagery provenance

- Release design: **Continuous Facets v0.4.0**, September 18, 2026.
- Design direction: creator-approved AI concept board; implemented as a new Blender mesh enclosure.
- Mechanical reference: the complete assembled half of the project's existing `3dmodel.obj`, taken from its original Blender import. The exploded half is not duplicated in the released reference library.
- Original OBJ SHA-256: `7f9888f9cb32890d1e4459720c4580dd2a00e7830c1eeb72a4d7c3727195ed0c`.
- Reference transform: original world-space coordinates, translated by `(+151.02978515625, 0, 0)`; no unit conversion.
- Original OBJ was not edited. `reference_assembly.blend` contains its complete assembly mesh in the translated coordinate system, with source connected-patch IDs stored as a point attribute.
- Nose-support geometry is extracted from the reference. Cosmetic camera front elements are explicitly named as visualization parts; they are not a new dimensioned camera module.
- External body and cover are rebuilt from conservative station profiles and keep-out solids. Six original skin patches (1, 4, 5, 7, 10, 11) are replaced. The remaining 162,052 vertices define the protected reference checked against the new lightweight shells. The full source assembly stays available separately.
- Product and staged-context images are **Blender Cycles renders**, not photographs. They contain no participant images or invented testimonials.
- The original source geometry is not converted into a verified bill of materials. No internal object is relabeled as a measured battery or PCB without evidence.
- Community and cost statements are creator reports, separately scoped in [the community document](../../docs/COMMUNITY_AND_COST.md).
