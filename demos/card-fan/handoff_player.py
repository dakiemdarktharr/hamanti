"""Five-card thumb handoff, Blender 4.5+. Run in card-handoff-5s.blend.

player.seek_scroll(0.5) evaluates the complete pose at any scroll position.
player.install() plays the same deterministic motion on frames 0..299 / 60 fps.
The accompanying calibration contains the fitted CC0 hand's rest-contact pose.
"""
import bpy
import json
import math
from mathutils import Vector, Quaternion

TAG = 'hamanti.five-card-handoff'
NORMAL = Vector((0, 0, 1))


def smoothstep(x):
    x = min(1.0, max(0.0, x))
    return x*x*(3.0-2.0*x)


def stroke(u):
    # Push / contact exchange / pull. Zero velocity at each phase boundary.
    return (.5*smoothstep((u-.06)/.36)
            + .5*smoothstep((u-.54)/.36))


def card_transform(slot, spread=1.0):
    # Fade pockets keep the replacing edge cards clear of the thumb bases.
    # tanh matches the interior tangent and smoothly slows the outgoing card.
    if slot < 0:
        slot = .12*math.tanh(slot/.12)
    elif slot > 4:
        slot = 4+.12*math.tanh((slot-4)/.12)
    # The palm adapter maps requested (lateral, normal, finger-forward) axes
    # into Blender stage (X,Z,Y). All cards share the same palm normal.
    q = Quaternion(NORMAL, math.radians((32-16*slot)*spread))
    pivot = Vector((0, -5.5, 3.5))
    return pivot + q@Vector((0, 5.15, 0)), q


class HandoffPlayer:
    def __init__(self):
        self.rigs = [bpy.data.objects[n] for n in ('Left_Hand', 'Right_Hand')]
        self.cards = [o for o in bpy.context.scene.objects if o.name.startswith('Card_')]
        self.cal = json.loads(bpy.data.texts['handoff-calibration.json'].as_string())
        self.saved_actions = {}

    def update(self, frame):
        # Disconnect authored F-curves while this explicit controller owns
        # the pose. Keeping both active would cause order-dependent popping.
        if not self.saved_actions:
            for ob in self.rigs+self.cards:
                if ob.animation_data:
                    self.saved_actions[ob.name] = ob.animation_data.action
                    ob.animation_data.action = None
        t = min(5.0, max(0.0, frame/60.0))
        fan = smoothstep(t/.95)
        direction = 0
        u = shift = 0.0
        if t >= 1:
            direction = -1 if t < 3 else 1
            elapsed = t-1 if direction < 0 else t-3
            cycle = min(1, int(elapsed))
            u = min(1.0, elapsed-cycle)
            shift = (-(cycle+stroke(u)) if direction < 0
                     else -2+cycle+stroke(u))

        for card in self.cards:
            identity = card['identity']
            slot = identity+shift
            position, rotation = card_transform(slot, fan)
            # A physical card keeps its depth, identity, and continuous path.
            # Consecutive identities are .01 apart along the palm normal;
            # stock + artwork occupy less than that interval.
            card.location = position + NORMAL*((identity+1)*.01)
            card.rotation_quaternion = rotation
            opacity = (smoothstep(slot+1)*smoothstep(5-slot) if t >= 1
                       else float(0 <= identity <= 4))
            card.color = (1, 1, 1, opacity)
            card.hide_render = opacity < .00001

        lifts = [0.0, 0.0]
        deltas = [Vector(), Vector()]
        if t < 1:
            position, rotation = card_transform(4, fan)
            baseline, baseline_rotation = card_transform(4, 1.0)
            contact = Vector((2.4, -3.3, 0))
            deltas[1] = ((position+rotation@contact)
                         - (baseline+baseline_rotation@contact))
        if direction:
            pusher = 1 if direction < 0 else 0
            receiver = 1-pusher
            lifts[receiver] = smoothstep(u/.10)*(1-smoothstep((u-.38)/.12))
            lifts[pusher] = smoothstep((u-.43)/.12)*(1-smoothstep((u-.85)/.15))
            start_slot = 3.0 if direction < 0 else 1.0

            def contact(slot, side):
                position, rotation = card_transform(slot)
                # Transform a MATERIAL point on the moving card into world
                # space. This drives wrist travel, instead of an unrelated sine.
                return position + rotation@Vector(((-2.4 if side == 0 else 2.4), -3.3, 0))

            current = start_slot+direction*stroke(u)
            deltas[pusher] = ((contact(current, pusher)-contact(start_slot, pusher))
                              * (1-smoothstep((u-.55)/.35)))
            deltas[receiver] = ((contact(current, receiver)
                                - contact(start_slot+direction*.5, receiver))
                               * smoothstep((u-.38)/.12)
                               * (1-smoothstep((u-.90)/.10)))

        for side, rig in enumerate(self.rigs):
            calibration = self.cal[rig.name]
            rig.location = Vector(calibration['location'])+deltas[side]
            rig.rotation_quaternion = Quaternion(calibration['rotation'])
            for name, q in calibration['bones'].items():
                rig.pose.bones[name].rotation_quaternion = Quaternion(q)
            # Opposition occurs at the CMC saddle. Intermediate finger and
            # thumb hinge joints retain their fitted flexion without axial twist.
            bone = rig.pose.bones['thumb_01_r']
            basis = (rig.matrix_world@bone.bone.matrix_local).to_quaternion()
            world_axis = Vector((0, -1 if side == 0 else 1, 0))
            local_axis = basis.inverted()@world_axis
            lift = Quaternion().slerp(Quaternion(local_axis, math.radians(10)), lifts[side])
            bone.rotation_quaternion = lift@Quaternion(calibration['bones'][bone.name])

    def seek_scroll(self, progress):
        self.update(300*max(0.0, min(1.0, progress)))
        bpy.context.view_layer.update()

    def install(self):
        for handler in list(bpy.app.handlers.frame_change_pre):
            if getattr(handler, '_handoff_tag', None) == TAG:
                bpy.app.handlers.frame_change_pre.remove(handler)
        def tick(scene, _depsgraph=None):
            self.update(scene.frame_current+scene.frame_subframe)
        tick._handoff_tag = TAG
        bpy.app.handlers.frame_change_pre.append(tick)
        return self

    def stop(self):
        for handler in list(bpy.app.handlers.frame_change_pre):
            if getattr(handler, '_handoff_tag', None) == TAG:
                bpy.app.handlers.frame_change_pre.remove(handler)
        for name, action in self.saved_actions.items():
            bpy.data.objects[name].animation_data.action = action
        self.saved_actions.clear()
        bpy.context.scene.frame_set(bpy.context.scene.frame_current)


if __name__ == '__main__':
    player = HandoffPlayer().install()
    bpy.app.driver_namespace[TAG] = player
