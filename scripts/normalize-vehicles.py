"""Normalize final exported mesh coordinates, independent of Blender's cached bounds."""
import json,struct
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
for name,length in [('blue-car',4.4),('white-car',4.4),('red-car',4.3),('bus',8.4)]:
 path=root/f'assets/vehicles/{name}-runtime.glb';raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);data=bytearray(raw[28+n:])
 def access(index):
  a=g['accessors'][index];v=g['bufferViews'][a['bufferView']]
  return np.ndarray((a['count'],3),dtype='<f4',buffer=data,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',12),4))
 primitives=[p for m in g['meshes'] for p in m['primitives']];positions=[access(p['attributes']['POSITION']) for p in primitives];allp=np.concatenate(positions);extent=np.ptp(allp,axis=0)
 # Put the long horizontal axis along the street (+Z).
 rotation=np.array([[0,0,-1],[0,1,0],[1,0,0]]) if extent[0]>extent[2] else np.eye(3)
 rotated=allp@rotation.T;lo=rotated.min(0);hi=rotated.max(0);scale=length/(hi[2]-lo[2])
 if name=='bus':scale=min(scale,2.5/(hi[0]-lo[0]))
 center=np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2])
 done=set()
 for p in primitives:
  for key in ['POSITION','NORMAL']:
   index=p['attributes'][key]
   if index in done:continue
   done.add(index);a=access(index);a[:]=((a@rotation.T-center)*scale) if key=='POSITION' else a@rotation.T
   if key=='POSITION':g['accessors'][index].update(min=a.min(0).tolist(),max=a.max(0).tolist())
 encoded=json.dumps(g,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(encoded)+len(data))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(data),0x004e4942)+data)
 print('NORMALIZED',name,(hi-lo)*scale)
