"""Bounded runtime copies of supplied, correctly bound female rigs."""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for source,name in [('female+character+3d+model.glb','female-casual'),('female lehenga+choli+3d+model.glb','female-lehenga')]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root/'npc'/source))
    for mesh in [o for o in bpy.data.objects if o.type=='MESH']:
        bpy.context.view_layer.objects.active=mesh
        modifier=mesh.modifiers.new('Crowd triangle budget','DECIMATE')
        modifier.ratio=min(1,24000/len(mesh.data.polygons))
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for image in bpy.data.images:
        if max(image.size)>2048:
            factor=2048/max(image.size)
            image.scale(round(image.size[0]*factor),round(image.size[1]*factor));image.pack()
    path=root/'assets'/f'{name}-runtime.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=False,export_skins=True)
    print('FEMALE_RUNTIME',name,path.stat().st_size)
