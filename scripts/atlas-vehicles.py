"""Combine split scan materials into three 2K atlases and one draw per vehicle."""
import json,struct,math,io
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
for name in ['red-car','bus']:
 path=root/f'assets/vehicles/{name}-runtime.glb';raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:]
 materials=g['materials'];grid=math.ceil(math.sqrt(len(materials)));tile=2048//grid;size=tile*grid
 atlases=[Image.new('RGB',(size,size)) for _ in range(3)]
 def picture(texture,default):
  if texture is None:return Image.new('RGB',(tile-8,tile-8),default)
  item=g['images'][g['textures'][texture['index']]['source']];v=g['bufferViews'][item['bufferView']]
  return Image.open(io.BytesIO(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGB').resize((tile-8,tile-8),Image.Resampling.LANCZOS)
 for i,m in enumerate(materials):
  pbr=m.get('pbrMetallicRoughness',{});factor=pbr.get('baseColorFactor',[1,1,1,1]);maps=[picture(pbr.get('baseColorTexture'),tuple(round(x*255) for x in factor[:3])),picture(m.get('normalTexture'),(128,128,255)),picture(pbr.get('metallicRoughnessTexture'),(255,round(pbr.get('roughnessFactor',1)*255),round(pbr.get('metallicFactor',1)*255)))]
  for atlas,img in zip(atlases,maps):
   # Repeat edge pixels into a four-pixel gutter to prevent seams in mipmaps.
   padded=Image.fromarray(np.pad(np.asarray(img),((4,4),(4,4),(0,0)),mode='edge'));atlas.paste(padded,((i%grid)*tile,(i//grid)*tile))
 def accessor(index):
  a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
  return np.ndarray((a['count'],width),dtype=dtype,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',width*np.dtype(dtype).itemsize),np.dtype(dtype).itemsize)).copy()
 arrays={key:[] for key in ['POSITION','NORMAL','TEXCOORD_0']};indices=[];count=0
 for mesh in g['meshes']:
  for p in mesh['primitives']:
   material=p.get('material',0)
   for key in arrays:
    data=accessor(p['attributes'][key]);
    if key=='TEXCOORD_0':data=(data*(tile-8)+np.array([(material%grid)*tile+4,(material//grid)*tile+4]))/size
    arrays[key].append(data.astype('<f4'))
   indices.append(accessor(p['indices']).flatten().astype('<u4')+count);count+=len(arrays['POSITION'][-1])
 chunks=[];views=[];accessors=[];offset=0
 def add(data,kind,component):
  global offset
  data=data.copy();blob=data.tobytes();view=len(views);views.append({'buffer':0,'byteOffset':offset,'byteLength':len(blob)});chunks.append(blob);offset+=len(blob)
  padding=(-offset)%4;chunks.append(b'\0'*padding);offset+=padding
  a={'bufferView':view,'componentType':component,'count':len(data),'type':kind};
  if kind=='VEC3':a.update(min=data.min(0).tolist(),max=data.max(0).tolist())
  accessors.append(a);return len(accessors)-1
 attrs={k:add(np.concatenate(v), 'VEC2' if k=='TEXCOORD_0' else 'VEC3',5126) for k,v in arrays.items()};idx=add(np.concatenate(indices),'SCALAR',5125)
 images=[]
 for atlas in atlases:
  stream=io.BytesIO();atlas.save(stream,format='PNG');blob=stream.getvalue();views.append({'buffer':0,'byteOffset':offset,'byteLength':len(blob)});images.append({'bufferView':len(views)-1,'mimeType':'image/png'});chunks.append(blob);offset+=len(blob);padding=(-offset)%4;chunks.append(b'\0'*padding);offset+=padding
 doc={'asset':{'version':'2.0'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':name+'-parked'}],'meshes':[{'primitives':[{'attributes':attrs,'indices':idx,'material':0}]}],'materials':[{'name':name+'-atlas','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicRoughnessTexture':{'index':2},'metallicFactor':1,'roughnessFactor':1},'normalTexture':{'index':1}}],'textures':[{'source':i} for i in range(3)],'images':images,'bufferViews':views,'accessors':accessors,'buffers':[{'byteLength':offset}]}
 encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(encoded)+offset)+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',offset,0x004e4942)+b''.join(chunks));print('ATLAS',name,len(materials),'to 1 material',path.stat().st_size)
