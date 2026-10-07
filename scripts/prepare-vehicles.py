"""Blender: optimize supplied vehicles, bake transforms, align long axis and ground tyres."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
reports=[]
for name,length,budget in [('blue car',4.4,45000),('white car',4.4,45000),('red car',4.3,45000),('bus',8.4,65000)]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root/f'artifacts/vehicles-decoded/{name}.glb'))
    meshes=[o for o in bpy.data.objects if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:o.select_set(True)
    bpy.context.view_layer.objects.active=max(meshes,key=lambda o:len(o.data.polygons))
    bpy.ops.object.join();mesh=bpy.context.object
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    corners=[Vector(p) for p in mesh.bound_box];lo=Vector([min(p[i] for p in corners) for i in range(3)]);hi=Vector([max(p[i] for p in corners) for i in range(3)])
    if hi.x-lo.x>hi.y-lo.y:mesh.rotation_euler.z=math.pi/2;bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
    corners=[Vector(p) for p in mesh.bound_box];lo=Vector([min(p[i] for p in corners) for i in range(3)]);hi=Vector([max(p[i] for p in corners) for i in range(3)])
    mesh.scale*=length/(hi.y-lo.y);mesh.location=-Vector([(lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z])*mesh.scale.x
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    original=sum(len(p.vertices)-2 for p in mesh.data.polygons)
    modifier=mesh.modifiers.new('Street vehicle budget','DECIMATE');modifier.ratio=min(1,budget/original)
    bpy.ops.object.modifier_apply(modifier=modifier.name);mesh.name=name.replace(' ','-')+'-parked'
    for image in bpy.data.images:
        if max(image.size)>2048:
            factor=2048/max(image.size);image.scale(round(image.size[0]*factor),round(image.size[1]*factor));image.pack()
    output=root/f'assets/vehicles/{name.replace(" ","-")}-runtime.glb';output.parent.mkdir(exist_ok=True)
    triangles=sum(len(p.vertices)-2 for p in mesh.data.polygons)
    bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_animations=False,export_skins=False)
    reports.append(dict(source=f'vehicles/{name}.glb',runtime=str(output.relative_to(root)),sourceTriangles=original,triangles=triangles,length=length,bytes=output.stat().st_size))
    print('VEHICLE_RUNTIME',reports[-1])
(root/'assets/vehicles/preparation.json').write_text(json.dumps(reports,indent=2))

