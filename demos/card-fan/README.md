# Fitted hand animation source

`card-handoff-5s.blend` is the fitted Blender 4.5 authoring scene. It contains
the left and right hand rigs, broad white sleeves, authored hand animation,
and demonstration cards used during calibration. Its baked actions work
without external textures or a solver.

`handoff_player.py` is the deterministic five-second authoring controller:
one second opening the fan, two seconds shifting left, and two seconds
shifting right. `handoff-calibration.json` records the fitted grip.

The website imports only the hands. From the repository root, run:

```powershell
blender --background --python scripts/export-hand-motion.py
```

The exporter removes demonstration cards and every unrelated object before
writing `public/hands/hands-only.glb`. It also samples the thumb landmarks
into `public/hands/hand-motion.json`. Unit tests inspect the GLB to reject
card meshes, card animation targets, images and textures in the runtime asset.

The current website motion follows its own scroll-driven category cards;
the authoring scene's card trajectories are not imported. See the
[runtime integration notes](../../docs/hand-category-preview.md) and
[latest correction audit](../correction-audit/AUDIT.md).

Hand geometry comes from the [Innerscene anatomical hand](https://www.innerscene.com/tools/library/3d-parts/posable-anatomical-right-hand-f6098b4f),
derived from MakeHuman/MPFB and released under CC0. Sleeves, material styling,
nail patches and animation were authored for this project.
