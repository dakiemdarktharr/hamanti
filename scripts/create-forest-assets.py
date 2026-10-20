"""Original low-poly woodland studies. Run with Blender --background --python."""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "models"
OUT.mkdir(parents=True, exist_ok=True)
random.seed(317)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*color, 1)
    mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.88
    return mat


moss = material("moss", (0.23, 0.32, 0.20))
sage = material("sage", (0.43, 0.52, 0.35))
leaf = material("leaf", (0.58, 0.64, 0.43))
bark = material("bark", (0.28, 0.29, 0.21))
clay = material("clay", (0.61, 0.34, 0.22))
cream = material("cream", (0.83, 0.82, 0.68))
ink = material("ink", (0.13, 0.17, 0.12))
stone = material("stone", (0.52, 0.56, 0.48))


def group(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj


def mesh(name, parent, location, scale, mat, shape="ico", rotation=(0, 0, 0)):
    if shape == "cone":
        bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=1, radius2=0.04, depth=2)
    elif shape == "cube":
        bpy.ops.mesh.primitive_cube_add(size=2)
    else:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.scale = scale
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    return obj


def branch(parent, start, end, radius, mat=bark):
    direction = Vector(end) - Vector(start)
    obj = mesh("branch", parent, (Vector(end) + Vector(start)) / 2,
               (radius, radius, direction.length / 2), mat, "cone")
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


pine = group("pine")
mesh("trunk", pine, (0, 0, 1.6), (.14, .14, 1.6), bark, "cone")
for i in range(5):
    mesh("needles", pine, (0, 0, 1.35 + i * .53),
         (1.05 - i * .16, .88 - i * .13, .88), [moss, sage, moss, leaf, sage][i], "cone",
         (0, 0, i * .73))

birch = group("birch")
branch(birch, (0, 0, 0), (.08, 0, 3.2), .12, cream)
for i in range(9):
    angle = i * 2.4
    height = 1.4 + i * .18
    end = (math.cos(angle) * .75, math.sin(angle) * .6, height + .6)
    branch(birch, (0, 0, height), end, .045, bark)
    mesh("leaves", birch, end, (.6, .55, .5), [sage, leaf, moss][i % 3])

fern = group("fern")
for i in range(8):
    angle = i * math.tau / 8
    for j in range(5):
        t = (j + 1) / 6
        x, y, z = math.cos(angle) * t, math.sin(angle) * t, math.sin(t * 2.4) * .8
        mesh("frond", fern, (x, y, z), (.28 * (1 - t) + .06, .10, .035),
             sage if i % 2 else moss, rotation=(0, -.3, angle + .6))

rock = group("rock")
mesh("rock", rock, (0, 0, .18), (.6, .42, .35), stone)

fox = group("fox")
mesh("body", fox, (0, 0, .64), (.7, .25, .31), clay)
mesh("chest", fox, (.37, 0, .69), (.22, .24, .3), cream)
mesh("head", fox, (.6, 0, .95), (.26, .22, .25), clay)
mesh("muzzle", fox, (.86, 0, .87), (.24, .13, .12), cream)
mesh("nose", fox, (1.03, 0, .88), (.055, .055, .055), ink)
for side in [-1, 1]:
    mesh("ear", fox, (.53, side * .15, 1.18), (.13, .07, .22), clay, "cone")
    mesh("eye", fox, (.73, side * .18, 1.01), (.035, .025, .035), ink)
for i, (x, y) in enumerate([(-.42, -.16), (.4, -.16), (-.42, .16), (.4, .16)]):
    leg = group("leg_" + str(i))
    leg.parent = fox
    leg.location = (x, y, .62)
    mesh("shin", leg, (0, 0, -.28), (.075, .065, .32), clay, "cone")
    mesh("paw", leg, (.06, 0, -.54), (.14, .08, .06), ink)
tail = branch(fox, (-.5, 0, .72), (-1.28, 0, .38), .24, clay)
branch(fox, (-1.05, 0, .48), (-1.45, 0, .4), .17, cream)

bird = group("bird")
mesh("body", bird, (0, 0, 0), (.22, .10, .09), ink)
mesh("head", bird, (.2, 0, .05), (.1, .09, .09), ink)
for side in [-1, 1]:
    wing = group("wing_left" if side == -1 else "wing_right")
    wing.parent = bird
    mesh("feathers", wing, (-.06, side * .29, .02), (.25, .42, .035), moss,
         rotation=(0, 0, side * .35))

butterfly = group("butterfly")
mesh("body", butterfly, (0, 0, 0), (.12, .025, .025), ink)
for side in [-1, 1]:
    wing = group("wing_left" if side == -1 else "wing_right")
    wing.parent = butterfly
    mesh("wing", wing, (.02, side * .1, 0), (.13, .14, .02), leaf)
    mesh("wing", wing, (-.09, side * .075, 0), (.07, .10, .02), clay)

cloud = group("cloud")
for i in range(5):
    mesh("vapour", cloud, ((i - 2) * .6, 0, random.uniform(0, .3)),
         (.75, .4, .3 + random.random() * .25), cream)

deer = group("deer")
mesh("body", deer, (0, 0, 1.1), (.8, .28, .4), bark)
mesh("neck", deer, (.58, 0, 1.6), (.2, .2, .58), bark, rotation=(0, -.25, 0))
mesh("head", deer, (.77, 0, 2.02), (.3, .2, .2), bark)
mesh("muzzle", deer, (1.01, 0, 1.98), (.2, .13, .12), cream)
for side in [-1, 1]:
    mesh("ear", deer, (.67, side * .22, 2.2), (.11, .12, .2), sage)
    branch(deer, (.64, side * .15, 2.15), (.52, side * .3, 2.75), .035, cream)
    branch(deer, (.57, side * .24, 2.5), (.83, side * .38, 2.7), .025, cream)
for i, (x, y) in enumerate([(-.5, -.17), (.48, -.17), (-.5, .17), (.48, .17)]):
    leg = group("leg_" + str(i))
    leg.parent = deer
    leg.location = (x, y, 1)
    mesh("shin", leg, (0, 0, -.45), (.06, .06, .48), bark, "cone")
    mesh("hoof", leg, (.03, 0, -.89), (.11, .08, .07), ink)

roots = [pine, birch, fern, rock, fox, deer, bird, butterfly, cloud]
for obj in roots:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    for child in obj.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=str(OUT / f"{obj.name}.glb"),
                              export_format="GLB", use_selection=True,
                              export_animations=False, export_yup=True)
print("Created nine original woodland assets:", OUT)
