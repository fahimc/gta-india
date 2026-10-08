/* Shared GPU bone palettes: four walk and two idle phases per model, independent
   of crowd size. Each palette draws all assigned pedestrians with GPU instances. */
window.QuarterNPCPalettes=class QuarterNPCPalettes {
 async loadNPC(){
  const {B,scene}=this;
  await QuarterAssets.load('assets/female-casual-data.js','assets/female-lehenga-data.js','assets/animations/female-casual-mixamo.js','assets/animations/female-lehenga-mixamo.js','assets/npc-man-1-data.js','assets/npc-male-2-data.js','assets/woman-npc-1-data.js','assets/animations/npc-mixamo.js','assets/animations/npc-2-mixamo.js','assets/animations/woman-mixamo.js','assets/npc-brown-data.js','assets/animations/npc-brown-mixamo.js');
  this.models=[];this.pools=[];this.idlePools=[];
  for(const [variant,data,pack,source] of [[0,window.NPC_MAN_1_BASE64,window.NPC_MIXAMO,'npc-man-1.glb'],[1,window.NPC_MALE_2_BASE64,window.NPC_2_MIXAMO,'npc male 2.glb'],[2,window.WOMAN_NPC_1_BASE64,window.WOMAN_MIXAMO,'woman npc 1.glb'],[3,window.NPC_BROWN_BASE64,window.NPC_BROWN_MIXAMO,'npc/npc male brown.glb'],[4,window.FEMALE_CASUAL_BASE64,window.FEMALE_CASUAL_MIXAMO,'npc/female+character+3d+model.glb'],[5,window.FEMALE_LEHENGA_BASE64,window.FEMALE_LEHENGA_MIXAMO,'npc/female lehenga+choli+3d+model.glb']]){
   const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));
   try{this.container=await B.SceneLoader.LoadAssetContainerAsync('',url,scene,undefined,'.glb');}finally{URL.revokeObjectURL(url);}
   this.pack=pack;this.clips={};
   for(const [name,clip] of Object.entries(pack.clips)){const b=Uint8Array.from(atob(clip.data),c=>c.charCodeAt(0));this.clips[name]={...clip,values:new Float32Array(b.buffer)};}
   const walks=Array.from({length:4},(_,i)=>this.makeNPCPool('npc-'+variant+'-walk-'+i,'walk',i/4));
   await QuarterClothing.mask(B,walks[0].mesh,[2,4,5].includes(variant));
   const idles=Array.from({length:2},(_,i)=>this.makeNPCPool('npc-'+variant+'-idle-'+i,'idle',i/2));
   const mesh=walks[0].mesh,box=walks[0].bounds,scale=1.78/(box.hi.y-box.lo.y),center=new B.Vector3((box.lo.x+box.hi.x)/2,0,(box.lo.z+box.hi.z)/2),nodes=walks[0].nodes;
   const forward=nodes.LeftToeBase.getAbsolutePosition().subtract(nodes.LeftFoot.getAbsolutePosition()).add(nodes.RightToeBase.getAbsolutePosition().subtract(nodes.RightFoot.getAbsolutePosition()));
   const facing=-Math.atan2(forward.x,forward.z);
   for(const pool of [...walks,...idles]){Object.assign(pool,{scale,center,facing,pack,clips:this.clips,variant});this.poseNPC(pool,pool.phase);}
   this.pools.push(...walks);this.idlePools.push(...idles);this.models.push({source,mesh,material:mesh.material,walks,idles,scale,container:this.container});
  }
  this.mesh=this.models[0].mesh;this.material=this.mesh.material;this.materials=this.models.map(m=>m.material);
  this.scale=this.pools[0].scale;this.center=this.pools[0].center;this.facing=this.pools[0].facing;

 }
 makeNPCPool(name,clip,phase){
  const {B}=this,copy=this.container.instantiateModelsToScene(n=>name+'/'+n,false,{doNotInstantiate:true});
  const mesh=copy.rootNodes.flatMap(r=>r.getChildMeshes()).find(m=>m.getTotalVertices()>100);
  const skeleton=copy.skeletons[0],nodes={};
  for(const root of copy.rootNodes)for(const n of [root,...root.getDescendants()]){const match=n.name.match(/mixamorig[:_]?(.*)$/i);if(match)nodes[match[1]]=n;}
  mesh.name=name;mesh.isPickable=false;mesh.receiveShadows=true;mesh.computeBonesUsingShaders=true;mesh.alwaysSelectAsActiveMesh=true;
  QuarterClothing.prepare(B,mesh);mesh.material.environmentIntensity=.65;mesh.material.maxSimultaneousLights=3;mesh.material.enableSpecularAntiAliasing=true;
  mesh.computeWorldMatrix(true);
  const world=mesh.getWorldMatrix().clone(),box=mesh.getBoundingInfo().boundingBox,bounds={lo:box.minimumWorld.clone(),hi:box.maximumWorld.clone()};
  const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),indices=mesh.getVerticesData(B.VertexBuffer.MatricesIndicesKind),weights=mesh.getVerticesData(B.VertexBuffer.MatricesWeightsKind),feet=[];
  const minY=mesh.getBoundingInfo().boundingBox.minimum.y,maxY=mesh.getBoundingInfo().boundingBox.maximum.y;
  for(let v=0;v<positions.length;v+=3)if(positions[v+1]<minY+.075*(maxY-minY)){const k=v/3*4;feet.push({point:positions.slice(v,v+3),indices:indices.slice(k,k+4),weights:weights.slice(k,k+4)});}
  mesh.isVisible=false;
  return {mesh,skeleton,nodes,clip,phase,world,bounds,feet,count:0,low:0,pack:this.pack,clips:this.clips,
   joints:this.pack.bones.map(n=>({node:nodes[n],position:nodes[n].position.clone()})),q1:B.Quaternion.Identity(),q2:B.Quaternion.Identity()};
 }
 lowestNPCSole(pool){
  const m=pool.skeleton.getTransformMatrices(pool.mesh),world=pool.world.m;let low=Infinity;
  for(const f of pool.feet){let x=0,y=0,z=0;for(let i=0;i<4;i++){const w=f.weights[i],k=f.indices[i]*16,p=f.point;if(!w)continue;x+=(m[k]*p[0]+m[k+4]*p[1]+m[k+8]*p[2]+m[k+12])*w;y+=(m[k+1]*p[0]+m[k+5]*p[1]+m[k+9]*p[2]+m[k+13])*w;z+=(m[k+2]*p[0]+m[k+6]*p[1]+m[k+10]*p[2]+m[k+14])*w;}low=Math.min(low,world[1]*x+world[5]*y+world[9]*z+world[13]);}
  return low;
 }
 poseNPC(pool,phase){
  const {B}=this,clip=pool.clips[pool.clip],stride=pool.pack.stride,f=(((phase%1)+1)%1)*(clip.frames-1),key=Math.floor(f),t=f-key;
  for(let i=0;i<pool.joints.length;i++){const j=pool.joints[i],a=key*stride+i*4,b=Math.min(key+1,clip.frames-1)*stride+i*4;
   B.Quaternion.FromArrayToRef(clip.values,a,pool.q1);B.Quaternion.FromArrayToRef(clip.values,b,pool.q2);B.Quaternion.SlerpToRef(pool.q1,pool.q2,t,j.node.rotationQuaternion);
   j.node.position.copyFrom(j.position);
  }
  const hip=pool.nodes.Hips,offset=pool.joints.length*4;hip.position.y+=(1-t)*clip.values[key*stride+offset]+t*clip.values[Math.min(key+1,clip.frames-1)*stride+offset];
  for(const j of pool.joints)j.node.computeWorldMatrix(true);pool.skeleton.prepare(true);pool.low=this.lowestNPCSole(pool);
 }
 flushNPCInstances(){
  const {B}=this;for(const p of [...this.pools,...this.idlePools,...(this.actors?.talks||[])])p.count=0;
  for(const a of this.agents){
   const pool=a.talking?this.actors.talks[a.variant*2+a.id%2]:a.waiting?this.idlePools[a.idlePoolIndex]:this.pools[a.poolIndex];
   const scale=pool.scale*a.scale,yaw=a.heading+pool.facing,c=Math.cos(yaw),s=Math.sin(yaw);
   const place=B.Matrix.Compose(new B.Vector3(scale,scale,scale),B.Quaternion.RotationYawPitchRoll(yaw,0,0),new B.Vector3(a.x-scale*(pool.center.x*c+pool.center.z*s),a.route.pavementY-pool.low*scale,a.z-scale*(-pool.center.x*s+pool.center.z*c)));
   const mesh=a.talking?a.talkingMesh:a.waiting?a.standing:a.walking;
   pool.world.multiply(place).decompose(mesh.scaling,mesh.rotationQuaternion,mesh.position);
   a.walking.setEnabled(a.visible&&!a.waiting);a.standing.setEnabled(a.visible&&a.waiting&&!a.talking);a.talkingMesh?.setEnabled(a.visible&&a.talking);if(a.visible)pool.count++;
  }
 }
};
