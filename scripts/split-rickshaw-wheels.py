"""Separate the three tyre/hub regions for rolling and front-wheel steering.
UVs and textures are preserved. Run after Blender decimation.
"""
import json,struct,io
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1];path=root/'assets/rickshaw-runtime.glb'
raw=path.read_bytes();size=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+size]);old=raw[28+size:]
def read(index):
 a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];w={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']];dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']]
 return np.frombuffer(old,dtype=dtype,count=a['count']*w,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,w)
primitives=[p for m in g['meshes'] for p in m['primitives']]
arrays={k:[] for k in primitives[0]['attributes']};faces=[];offset=0
for primitive in primitives:
 local={k:read(v) for k,v in primitive['attributes'].items()}
 for k,v in local.items():arrays[k].append(v)
 faces.append(read(primitive['indices']).reshape(-1,3)+offset);offset+=len(local['POSITION'])
attrs={k:np.concatenate(v) for k,v in arrays.items()};triangles=np.concatenate(faces);p=attrs['POSITION'];centroids=p[triangles].mean(axis=1)
texture_index=g['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index'];image=g['images'][g['textures'][texture_index]['source']];v=g['bufferViews'][image['bufferView']]
texture=np.asarray(Image.open(io.BytesIO(old[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGB'))
uv=attrs['TEXCOORD_0']
colors=texture[np.clip((uv[:,1]*texture.shape[0]).astype(int),0,texture.shape[0]-1),np.clip((uv[:,0]*texture.shape[1]).astype(int),0,texture.shape[1]-1)].astype(float)
# Body paint on the fender occupies the same geometric region as the tyres.
# Keep green/yellow paint on the chassis instead of rotating it with a wheel.
vertex_paint=((colors[:,1]>colors[:,0]*1.08)&(colors[:,1]>colors[:,2]*1.08))|((colors[:,0]>95)&(colors[:,1]>85)&(colors[:,2]<colors[:,1]*.65))
paint=vertex_paint[triangles].any(axis=1)
centers=[[-.235,.093,-.315],[.235,.093,-.315],[0,.100,.393]]
labels=np.zeros(len(triangles),int)
for i,c in enumerate(centers):
 radial=(centroids[:,1]-c[1])**2+(centroids[:,2]-c[2])**2
 vertex_radial=(p[triangles,1]-c[1])**2+(p[triangles,2]-c[2])**2
 # Only the clean inner tyre/rim can move. The fused outer edge and mudguards
 # remain on the chassis. Test every corner, not a centroid/averaged UV that
 # can miss dark green paint or bridge the tyre and a fender.
 axial=np.abs(p[triangles,0]-c[0]).max(axis=1)
 mask=(vertex_radial.max(axis=1)<(.085 if i<2 else .086)**2)&(axial<(.052 if i<2 else .030))&~paint
 labels[mask]=i+1
binary=bytearray();views=[];accessors=[]
def view(data,target=None):
 binary.extend(b'\0'*((-len(binary))%4));v={'buffer':0,'byteOffset':len(binary),'byteLength':len(data)}
 if target:v['target']=target
 binary.extend(data);views.append(v);return len(views)-1
for image in g['images']:
 v=g['bufferViews'][image['bufferView']];image['bufferView']=view(old[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
meshes=[];nodes=[]
for label in range(4):
 selected=triangles[labels==label];used,inverse=np.unique(selected,return_inverse=True)
 attr_indices={}
 for name,data in attrs.items():
  values=data[used].copy();a={'bufferView':view(values.astype('<f4').tobytes(),34962),'componentType':5126,'count':len(values),'type':'VEC'+str(values.shape[1])}
  if name=='POSITION':a.update(min=values.min(axis=0).tolist(),max=values.max(axis=0).tolist())
  accessors.append(a);attr_indices[name]=len(accessors)-1
 accessors.append({'bufferView':view(inverse.astype('<u4').tobytes(),34963),'componentType':5125,'count':len(inverse),'type':'SCALAR'})
 name='rickshaw-authored-body' if label==0 else 'rickshaw-wheel-'+str(label)
 meshes.append({'name':name,'primitives':[{'attributes':attr_indices,'indices':len(accessors)-1,'material':0,'mode':4}]});nodes.append({'name':name,'mesh':label})
 print(name,len(selected),'triangles')
 if label:
  c=np.asarray(centers[label-1]);radius=np.linalg.norm(attrs['POSITION'][used][:,1:3]-c[1:3],axis=1)
  assert not vertex_paint[used].any(), 'Body paint leaked into a rotating wheel'
  assert radius.max() < (.085 if label<3 else .086), 'Mudguard boundary leaked into a wheel'
g.update(meshes=meshes,nodes=nodes,scenes=[{'nodes':list(range(4))}],scene=0,accessors=accessors,bufferViews=views,buffers=[{'byteLength':len(binary)}])
encoded=json.dumps(g,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary.extend(b'\0'*((-len(binary))%4))
path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary)
