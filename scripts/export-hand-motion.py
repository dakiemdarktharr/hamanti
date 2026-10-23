"""Export only hand models and their motion for the category-card preview."""
import bpy,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/hands'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'demos/card-fan/card-handoff-5s.blend'))
if '--inspect' in sys.argv:
    for p in bpy.ops.export_scene.gltf.get_rna_type().properties:
        if any(s in p.identifier for s in ['animation','sampling','selection','apply','rest','armature']):
            print(p.identifier,p.default if hasattr(p,'default') else '',[e.identifier for e in p.enum_items] if p.type=='ENUM' else '')
    raise SystemExit

# No card object, card material, card action, artwork, or card trajectory is
# selected or serialized. Keep only the two rigs and their anatomical children.
allowed=[]
for ob in list(bpy.context.scene.objects):
    if ob.name in ['Left_Hand','Right_Hand'] or (ob.parent and ob.parent.name in ['Left_Hand','Right_Hand']):allowed.append(ob)
for ob in list(bpy.context.scene.objects):
    if ob not in allowed:bpy.data.objects.remove(ob,do_unlink=True)
for ob in allowed:
    if ob.type=='MESH':
        for m in ob.modifiers:
            if m.type=='SOLIDIFY':m.show_viewport=False;m.show_render=False
            if m.type=='SUBSURF':m.levels=1;m.render_levels=1
        for mat in ob.data.materials:
            mat['handShader']='skin' if 'Skin' in mat.name else 'cloth' if 'cotton' in mat.name else 'flat'
            if mat['handShader']=='flat':
                node=next((n for n in mat.node_tree.nodes if n.type=='EMISSION'),None)
                mat['handColor']=list(node.inputs[0].default_value[:3]) if node else [.1,.1,.1]

# Contact landmarks are projected on the pad (opposite the dorsal nail) of the
# original distal thumb. Their binding follows the hand only, without cards.
from mathutils import Vector
from mathutils.bvhtree import BVHTree
markers=[]
for side in ['Left','Right']:
    rig=bpy.data.objects[side+'_Hand'];skin=next(o for o in allowed if o.type=='MESH' and o.parent==rig and 'anatomical' in o.name.lower())
    rig.data.pose_position='REST';bpy.context.view_layer.update()
    ev=skin.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh()
    tree=BVHTree.FromPolygons([v.co for v in me.vertices],[tuple(p.vertices) for p in me.polygons])
    B=rig.data.bones['thumb_03_r'].matrix_local;n=B.to_3x3()@Vector((0,0,1))
    point=B@Vector((-.75 if side=='Left' else .75,2.2,0))
    hit,normal,face,distance=tree.ray_cast(point-n*6,n,12)
    if hit is None:raise RuntimeError('Hand pad landmark missed')
    marker=B.inverted()@hit;markers.append((rig,marker))
    ev.to_mesh_clear();rig.data.pose_position='POSE'
poses=[];s=bpy.context.scene
for frame in range(121):
    s.frame_set(frame)
    sample={}
    for rig,marker in markers:
        p=rig.matrix_world@rig.pose.bones['thumb_03_r'].matrix@marker
        sample[rig.name.split('_')[0].lower()]={'pad':[round(p.x,7),round(p.z,7),round(-p.y,7)]}
    poses.append(sample)
s.frame_start=0;s.frame_end=120;s.frame_set(0);s.unit_settings.scale_length=1
metadata={'fps':60,'frames':121,'basis':'glTF Y up','gripPlane':3.55,'contactFrames':{'grip':60,'push':[64,85],'pull':[93,114],'cycle':[60,120]},'poses':poses,'assets':[o.name for o in allowed]}
(OUT/'hand-motion.json').write_text(json.dumps(metadata,separators=(',',':')))
if '--contacts-only' in sys.argv:
    print('CONTACTS',poses[60],flush=True)
    raise SystemExit
bpy.ops.object.select_all(action='DESELECT')
for ob in allowed:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'hands-only.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=True,export_animation_mode='SCENE',export_force_sampling=True,export_frame_range=True,export_frame_step=1,export_skins=True,export_extras=True,export_rest_position_armature=True,export_optimize_animation_size=True)
print('HAND EXPORT',len(allowed),[(o.name,o.type) for o in allowed],flush=True)
print('CONTACTS',poses[60],flush=True)
