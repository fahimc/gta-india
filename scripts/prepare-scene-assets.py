"""Blender runtime preparation; original supplied files remain unchanged."""
import bpy,sys,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
mode=sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
assert mode in ['rickshaw','building','building2','building3'], 'NPC preparation uses repair-npc-bind.py'
building_number=int(mode[-1]) if mode in ['building2','building3'] else 1
bpy.ops.import_scene.gltf(filepath=str(root/('rickshaw.glb' if mode=='rickshaw' else f'old building {building_number}.glb')))
mesh=next(o for o in bpy.data.objects if o.type=='MESH');bpy.context.view_layer.objects.active=mesh
# Preserve authored UVs and normal-map detail while reducing tiny scan faces.
modifier=mesh.modifiers.new('Runtime triangle budget','DECIMATE');modifier.ratio=.055 if mode=='rickshaw' else (.035 if mode=='building' else 1)
bpy.ops.object.modifier_apply(modifier=modifier.name)
mesh.name='rickshaw-authored-body' if mode=='rickshaw' else f'old-building-{building_number}-authored'
output=root/('assets/rickshaw-runtime.glb' if mode=='rickshaw' else f'assets/old-building-{building_number}-runtime.glb')
if mode.startswith('building'):
    # One shared 2K map set is sufficient at street distance and saves GPU memory.
    for image in bpy.data.images:
        if max(image.size)>2048:
            factor=2048/max(image.size);image.scale(round(image.size[0]*factor),round(image.size[1]*factor));image.pack()
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_animations=False,export_skins=True)
print('RUNTIME_ASSET',mode,output.stat().st_size,[(o.name,len(o.data.vertices),len(o.data.polygons)) for o in bpy.data.objects if o.type=='MESH'])
