"""Bake downloaded Mixamo motion-only clips onto the Tripo rig.

Source: Mixamo Breathing Idle, Unarmed Walk Forward, Unarmed Run Forward.
Rebuild: convert-mixamo.py with Blender, combine-mixamo.py, then this script.
Only retargeted motion data enters the game; the source meshes are never loaded.
"""
import base64
import hashlib
import json
import math
import re
import struct
import warnings
import argparse
from pathlib import Path
import numpy as np
with warnings.catch_warnings():
    warnings.simplefilter('ignore')
    from scipy.spatial.transform import Rotation as R

ROOT = Path(__file__).resolve().parents[1]
FPS = 60


def read_glb(path):
    raw = path.read_bytes()
    size = struct.unpack_from('<I', raw, 12)[0]
    return json.loads(raw[20:20 + size]), raw[28 + size:], raw


parser=argparse.ArgumentParser()
parser.add_argument('--target',default='character2-rigged.glb')
parser.add_argument('--output',default='assets/animations/mixamo-locomotion.js')
parser.add_argument('--global-name',default='QUARTER_MIXAMO')
parser.add_argument('--clips',default='idle,walk,run,jump')
args=parser.parse_args()
source, binary, raw = read_glb(ROOT / 'assets/animations/mixamo-direct.glb')
target, _, target_raw = read_glb(ROOT / args.target)


def accessor(index):
    a = source['accessors'][index]
    view = source['bufferViews'][a['bufferView']]
    width = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
    offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.ndarray((a['count'], width), dtype='<f4', buffer=binary,
                      offset=offset, strides=(view.get('byteStride', width * 4), 4)).copy()


def skeleton(document):
    nodes = document['nodes']
    parents = {c: i for i, n in enumerate(nodes) for c in n.get('children', [])}
    names = {re.sub(r'^mixamorig\d*[:_]?', '', n['name']): i for i, n in enumerate(nodes)
             if n.get('name', '').startswith('mixamorig')}
    order = []
    def visit(i):
        order.append(i)
        for child in nodes[i].get('children', []):
            visit(child)
    for i in range(len(nodes)):
        if i not in parents:
            visit(i)
    local = [dict(t=np.array(n.get('translation', [0, 0, 0]), float),
                  q=R.from_quat(n.get('rotation', [0, 0, 0, 1])),
                  s=np.array(n.get('scale', [1, 1, 1]), float)) for n in nodes]
    return nodes, parents, names, order, local


sn, sp, names_s, order_s, rest_s = skeleton(source)
tn, tp, names_t, order_t, rest_t = skeleton(target)


def worlds(local, parents, order):
    rotations, positions, scales = {}, {}, {}
    for i in order:
        n = local[i]
        parent = parents.get(i)
        if parent is None:
            rotations[i], positions[i], scales[i] = n['q'], n['t'], n['s']
        else:
            rotations[i] = rotations[parent] * n['q']
            positions[i] = positions[parent] + rotations[parent].apply(n['t'] * scales[parent])
            scales[i] = scales[parent] * n['s']
    return rotations, positions, scales


sr, sx, _ = worlds(rest_s, sp, order_s)
tr, tx, _ = worlds(rest_t, tp, order_t)
# Infer facing from the two feet rather than assuming FBX/glTF export axes.
def forward(positions, names):
    return sum((positions[names[s+'ToeBase']] - positions[names[s+'Foot']]
                for s in ['Left', 'Right']), np.zeros(3))
source_forward, target_forward = forward(sx, names_s), forward(tx, names_t)
horizontal_forward=target_forward.copy();horizontal_forward[1]=0
horizontal_forward/=np.linalg.norm(horizontal_forward)
alignment = R.from_euler('y', math.atan2(target_forward[0], target_forward[2]) -
                        math.atan2(source_forward[0], source_forward[2]))


def swing(a, b):
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    cross, dot = np.cross(a, b), float(np.clip(np.dot(a, b), -1, 1))
    if dot < -.99999:
        axis = np.cross(a, [0, 0, 1])
        if np.linalg.norm(axis) < .001:
            axis = np.cross(a, [0, 1, 0])
        return R.from_rotvec(axis / np.linalg.norm(axis) * math.pi)
    return R.from_quat(np.r_[cross, 1 + dot])


# Calibrate a reference T-pose top-down. A straight bone-name copy would fold the
# arms into the body: this rig was bound in a relaxed pose with different axes.
reference = {}
primary = {'Hips': 'Spine', 'Spine2': 'Neck', 'LeftHand': 'LeftHandMiddle1',
           'RightHand': 'RightHandMiddle1'}
reverse_t = {i: n for n, i in names_t.items()}
for i in order_t:
    parent = tp.get(i)
    reference[i] = reference[parent] * rest_t[i]['q'] if parent is not None else rest_t[i]['q']
    name = reverse_t.get(i)
    if name not in names_s:
        continue
    children = tn[i].get('children', [])
    child = names_t.get(primary.get(name, '')) if name in primary else (children[0] if children else None)
    if child is None or reverse_t.get(child) not in names_s:
        continue
    si, sc = names_s[name], names_s[reverse_t[child]]
    direction = reference[i].apply(rest_t[child]['t'])
    desired = alignment.apply(sx[sc] - sx[si])
    reference[i] = swing(direction, desired) * reference[i]

corrections = {name: (alignment * sr[names_s[name]]).inv() * reference[i]
               for name, i in names_t.items() if name in names_s}
bone_names = [reverse_t[i] for i in order_t if i in reverse_t]
hip_s, hip_t = names_s['Hips'], names_t['Hips']
ratio = (np.linalg.norm(tx[names_t['LeftFoot']] - tx[names_t['LeftUpLeg']]) /
         np.linalg.norm(sx[names_s['LeftFoot']] - sx[names_s['LeftUpLeg']]))


def interpolate(values, times, t, quaternion=False):
    k = max(0, min(len(times) - 2, int(np.searchsorted(times, t, side='right') - 1)))
    f = float(np.clip((t - times[k]) / max(1e-8, times[k + 1] - times[k]), 0, 1))
    a, b = values[k], values[k + 1]
    if not quaternion:
        return a + (b - a) * f
    dot = float(np.dot(a, b))
    if dot < 0:
        b, dot = -b, -dot
    if dot > .9995:
        q = a + (b - a) * f
    else:
        angle = math.acos(float(np.clip(dot, -1, 1)))
        q = (a * math.sin((1 - f) * angle) + b * math.sin(f * angle)) / math.sin(angle)
    return R.from_quat(q / np.linalg.norm(q))


clips = {}
for animation in source['animations']:
    name = animation['name'].lower()
    if name not in args.clips.split(','):
        continue
    tracks = []
    for channel in animation['channels']:
        sampler = animation['samplers'][channel['sampler']]
        tracks.append((channel['target']['node'], channel['target']['path'],
                       accessor(sampler['input']).flatten(), accessor(sampler['output'])))
    duration = max(float(times[-1]) for _, _, times, _ in tracks)
    count = round(duration * FPS) + 1
    frames, toes, contacts = [], [], []
    for t in np.linspace(0, duration, count):
        local = [dict(t=n['t'].copy(), q=n['q'], s=n['s'].copy()) for n in rest_s]
        for i, path, times, values in tracks:
            if path in ['rotation', 'translation', 'scale']:
                local[i][{'rotation': 'q', 'translation': 't', 'scale': 's'}[path]] = interpolate(values, times, t, path == 'rotation')
        rotations, positions, _ = worlds(local, sp, order_s)
        desired = {}
        result = []
        for i in order_t:
            parent = tp.get(i)
            bone = reverse_t.get(i)
            if bone in corrections:
                desired[i] = alignment * rotations[names_s[bone]] * corrections[bone]
                q = (desired[parent].inv() * desired[i]) if parent is not None else desired[i]
            else:
                q = rest_t[i]['q']
                desired[i] = desired[parent] * q if parent is not None else q
            if bone is not None:
                result.extend(q.as_quat())
        # Keep vertical root motion, remove horizontal travel (gameplay owns that).
        result.append((positions[hip_s][1] - sx[hip_s][1]) * ratio)
        frames.append(result)
        toes.append(min(positions[names_s[s + 'ToeBase']][1] for s in ['Left', 'Right']))
        contacts.append([(float(np.dot(alignment.apply(positions[names_s[s+'ToeBase']] - positions[hip_s]), horizontal_forward)),
                          positions[names_s[s+'ToeBase']][1]) for s in ['Left', 'Right']])
    toe_ground = float(np.percentile(toes, 10))
    # Preserve the airborne interval of the running clip; never pin every run pose.
    lifts = [max(0, y - toe_ground - .025) * ratio if name in ['run', 'jump'] else 0 for y in toes]
    values = np.column_stack([np.asarray(frames), lifts]).astype('<f4')
    # Match quaternion hemispheres per joint to interpolate cleanly across keys.
    for k in range(1, count):
        for j in range(len(bone_names)):
            a, b = values[k - 1, j * 4:j * 4 + 4], values[k, j * 4:j * 4 + 4]
            if np.dot(a, b) < 0:
                b *= -1
    contact_samples = np.asarray(contacts)
    velocities = np.gradient(contact_samples[:, :, 0], duration / (count - 1), axis=0)
    planted = (contact_samples[:, :, 1] < toe_ground + .025) & (velocities < -.1)
    bounds=[target['accessors'][p['attributes']['POSITION']] for m in target['meshes'] for p in m['primitives'] if 'POSITION' in p['attributes']]
    height=max(a['max'][1] for a in bounds)-min(a['min'][1] for a in bounds)
    native_to_meters = 1.78 / height
    nominal_speed = float(-np.median(velocities[planted]) * ratio * native_to_meters) if np.any(planted) else 0
    clips[name] = dict(duration=duration, frames=count, nominalSpeed=nominal_speed,
                       data=base64.b64encode(values.tobytes()).decode())

pack = dict(version=1, fps=FPS, bones=bone_names, stride=len(bone_names) * 4 + 2,
            source='Adobe Mixamo: Breathing Idle / Unarmed Walk Forward / Unarmed Run Forward / Unarmed Jump',
            sourceSha256=hashlib.sha256(raw).hexdigest(),
            characterSha256=hashlib.sha256(target_raw).hexdigest(), clips=clips)
output = ROOT / args.output
output.write_text('/* Retargeted Mixamo motion clips. Rebuild: python scripts/bake-mixamo.py */\nwindow.'+args.global_name+'=' + json.dumps(pack, separators=(',', ':')) + ';\n')
print(json.dumps(dict(bones=len(bone_names), matched=len(corrections), bytes=output.stat().st_size,
                      clips={name: {k: v for k, v in clip.items() if k != 'data'} for name, clip in clips.items()}), indent=2))
