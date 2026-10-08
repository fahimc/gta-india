"""Repair the supplied export's missing node transforms and unassigned weights.
Recover bind transforms from its inverse-bind matrices, align its rig with the
T-pose mesh, then assign smooth anatomical segment weights on a separate runtime copy.
The user's source GLB is never modified.
"""
import json, struct, warnings
from pathlib import Path
import numpy as np
with warnings.catch_warnings():
    warnings.simplefilter('ignore')
    from scipy.spatial.transform import Rotation
root=Path(__file__).resolve().parents[1]
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--second',action='store_true');parser.add_argument('--woman',action='store_true');parser.add_argument('--brown',action='store_true');args=parser.parse_args()
preserve_weights=args.second or args.woman or args.brown
raw=(root/('npc/npc male brown.glb' if args.brown else 'woman npc 1.glb' if args.woman else ('npc male 2.glb' if args.second else 'npc-man-1.glb'))).read_bytes();size=struct.unpack_from('<I',raw,12)[0]
g=json.loads(raw[20:20+size]);binary=raw[28+size:]
skin=g['skins'][0];a=g['accessors'][skin['inverseBindMatrices']];v=g['bufferViews'][a['bufferView']]
ibm=np.frombuffer(binary,dtype='<f4',count=a['count']*16,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,4,4).transpose(0,2,1)
align=np.eye(4);align[:3,:3]=Rotation.from_euler('y',-90,degrees=True).as_matrix()
if preserve_weights:
    align[:3,:3]=Rotation.from_euler('y',-90,degrees=True).as_matrix()@Rotation.from_euler('x',-90,degrees=True).as_matrix()
    bounds=g['accessors'][g['meshes'][0]['primitives'][0]['attributes']['POSITION']]
    align[1,3]=(bounds['max'][1]+bounds['min'][1])/2
world={j:align@np.linalg.inv(ibm[i]) for i,j in enumerate(skin['joints'])}
parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])}
for i,n in enumerate(g['nodes']):
    if i not in world:
        world[i]=world.get(parents.get(i),np.eye(4)).copy()
        if n.get('name','').startswith('mixamorig'):
            world[i][:3,3]+=world[i][:3,1]*.012
    local=np.linalg.inv(world.get(parents.get(i),np.eye(4)))@world[i]
    n['translation']=local[:3,3].tolist()
    n['rotation']=Rotation.from_matrix(local[:3,:3]).as_quat().tolist()
    n['scale']=[1,1,1]
repaired=np.stack([np.linalg.inv(world[j]).T for j in skin['joints']]).astype('<f4').tobytes()
data=bytearray(binary);offset=v.get('byteOffset',0)+a.get('byteOffset',0);data[offset:offset+len(repaired)]=repaired
def accessor(index):
    a=g['accessors'][index];v=g['bufferViews'][a['bufferView']]
    width={'VEC3':3,'VEC4':4}[a['type']];dtype={5126:'<f4',5123:'<u2'}[a['componentType']]
    return np.ndarray((a['count'],width),dtype=dtype,buffer=data,offset=v.get('byteOffset',0)+a.get('byteOffset',0))
attributes=g['meshes'][0]['primitives'][0]['attributes'];positions=accessor(attributes['POSITION'])
names={n['name'].split(':')[-1]:i for i,n in enumerate(g['nodes']) if n.get('name','').startswith('mixamorig')}
primary={'Hips':'Spine','Spine2':'Neck','LeftHand':'LeftHandMiddle1','RightHand':'RightHandMiddle1'}
starts=[];ends=[];labels=[]
for j in skin['joints']:
    label=g['nodes'][j]['name'].split(':')[-1];children=g['nodes'][j].get('children',[])
    child=names.get(primary[label]) if label in primary else (children[0] if children else None)
    start=world[j][:3,3];end=world[child][:3,3] if child is not None else start+world[j][:3,1]*.02
    if label=='Head':end=np.array([start[0],.97,start[2]])
    starts.append(start);ends.append(end);labels.append(label)
starts=np.asarray(starts);ends=np.asarray(ends);segments=ends-starts
delta=positions[:,None,:]-starts[None,:,:];projection=np.clip(np.sum(delta*segments,axis=2)/np.maximum(1e-8,np.sum(segments*segments,axis=1)),0,1)
distances=np.linalg.norm(delta-projection[:,:,None]*segments,axis=2)
# Anatomical regions keep loose trousers/scarf attached to the nearby body,
# rather than accidentally pulling them towards hands or opposite limbs.
for i,label in enumerate(labels):
    if any(x in label for x in ['Arm','Hand','Shoulder']):distances[(np.abs(positions[:,0])<.11)|(positions[:,1]<.62),i]+=1
    if any(x in label for x in ['UpLeg','Leg','Foot','Toe']):distances[positions[:,1]>.55,i]+=1
    if label in ['Head','HeadTop_End','Neck']:distances[positions[:,1]<.78,i]+=1
    if label.startswith('Left') and any(x in label for x in ['Leg','Foot','Toe']):distances[positions[:,0]<-.015,i]+=.2
    if label.startswith('Right') and any(x in label for x in ['Leg','Foot','Toe']):distances[positions[:,0]>.015,i]+=.2
nearest=np.argsort(distances,axis=1)[:,:4];d=np.take_along_axis(distances,nearest,axis=1)
weights=np.exp(-(d*d-d[:,0:1]*d[:,0:1])/(.027**2));weights/=weights.sum(axis=1,keepdims=True)
if not preserve_weights:
    accessor(attributes['JOINTS_0'])[:]=nearest
    accessor(attributes['WEIGHTS_0'])[:]=weights
# NPC 2 contains real multi-joint weights; preserve them instead of reweighting.
g['accessors'][attributes['JOINTS_0']].update(min=[0]*4,max=[len(skin['joints'])-1]*4)
g['accessors'][attributes['WEIGHTS_0']].update(min=[0]*4,max=[1]*4)
encoded=json.dumps(g,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
output=root/('assets/npc-brown-runtime.glb' if args.brown else 'assets/woman-npc-1-runtime.glb' if args.woman else ('assets/npc-male-2-runtime.glb' if args.second else 'assets/npc-man-1-runtime.glb'))
output.write_bytes(struct.pack('<III',0x46546c67,2,28+len(encoded)+len(data))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(data),0x004e4942)+data)
print(output)
