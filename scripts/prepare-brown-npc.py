"""Preserve authored skin and textures on a bounded runtime crowd copy."""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'assets/npc-brown-runtime.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(path))
mesh=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.polygons))
bpy.context.view_layer.objects.active=mesh
modifier=mesh.modifiers.new('Crowd triangle budget','DECIMATE')
modifier.ratio=min(1,24000/len(mesh.data.polygons))
bpy.ops.object.modifier_apply(modifier=modifier.name)
for image in bpy.data.images:
    if max(image.size)>2048:
        factor=2048/max(image.size);image.scale(round(image.size[0]*factor),round(image.size[1]*factor));image.pack()
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=False,export_skins=True)
print('BROWN_RUNTIME',len(mesh.data.polygons),path.stat().st_size)
