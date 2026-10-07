"""Run in Blender after repair-npc-bind.py --woman. Preserve skin/UVs on a runtime copy."""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'assets/woman-npc-1-runtime.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(path))
mesh=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.polygons))
bpy.context.view_layer.objects.active=mesh
modifier=mesh.modifiers.new('Crowd triangle budget','DECIMATE');modifier.ratio=.34
bpy.ops.object.modifier_apply(modifier=modifier.name)
triangles=len(mesh.data.polygons)
for image in bpy.data.images:
    if max(image.size)>2048:
        factor=2048/max(image.size);image.scale(round(image.size[0]*factor),round(image.size[1]*factor));image.pack()
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=False,export_skins=True)
print('WOMAN_RUNTIME',triangles,path.stat().st_size)
