# Hand animation assets

`hands-only.glb` contains two anatomical hand rigs, skin, white sleeves and
thumb-nail surfaces. It contains six meshes, two skins and two animation clips.
There are no card meshes, card animations, illustrations, ranks, suits, images
or textures in this export.

`hand-motion.json` contains the two thumb-pad landmarks at each of 121 hand
keyframes, sampled at 60 fps. The website uses these hand landmarks to position
the hand rigs against its existing HTML category cards. The website controls
every card and both decks; the hands follow their final poses. The fitted
paper plane is glTF Y = 3.55, below the distal thumb landmark. Complete meshes
and matching card depth surfaces preserve continuous thumbs and palms.

Hands load on normal visits. `?preview=hands` enables the optional review
player, frame scrubber and inspection API; normal visits have none of these.

Hand geometry: MakeHuman / MPFB, CC0, via
[Innerscene](https://www.innerscene.com/tools/library/3d-parts/posable-anatomical-right-hand-f6098b4f).
Sleeves, materials, nail patches and animation are authored for this project.

Re-export with Blender 4.5+:

    blender --background --python scripts/export-hand-motion.py

The source animation remains in `demos/card-fan/card-handoff-5s.blend`.
The exporter explicitly removes every object except the two hand rigs and
their anatomical children before serialization.
