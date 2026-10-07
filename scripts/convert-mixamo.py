"""Run with Blender: blender -b --python scripts/convert-mixamo.py -- walk idle run.
Convert downloaded motion-only FBX exports without adding any source character mesh.
"""
import sys
from pathlib import Path
import bpy

root = Path(__file__).resolve().parents[1]
names = sys.argv[sys.argv.index('--') + 1:]
for name in names:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(root / f'assets/animations/{name}.fbx'),
                             automatic_bone_orientation=False)
    for action in bpy.data.actions:
        action.name = name
    # Export a tiny hidden carrier mesh to retain the armature in the glTF
    # exporter. It is never included in the final baked runtime animation data.
    armature = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    mesh = bpy.data.meshes.new('animation-carrier')
    mesh.from_pydata([(0, 0, 0), (.001, 0, 0), (0, .001, 0)], [], [(0, 1, 2)])
    carrier = bpy.data.objects.new('animation-carrier', mesh)
    bpy.context.collection.objects.link(carrier)
    carrier.parent = armature
    modifier = carrier.modifiers.new('skin', 'ARMATURE')
    modifier.object = armature
    group = carrier.vertex_groups.new(name=armature.data.bones[0].name)
    group.add([0, 1, 2], 1, 'REPLACE')
    bpy.context.scene.render.fps = 60
    bpy.ops.export_scene.gltf(filepath=str(root / f'assets/animations/{name}.glb'),
                              export_format='GLB', export_animations=True,
                              export_animation_mode='ACTIONS', export_force_sampling=True,
                              export_frame_step=1, export_skins=True)
    print('Converted', name, 'bones', len(armature.data.bones))
