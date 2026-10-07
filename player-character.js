/* Real Mixamo idle/walk/run clips retargeted offline to the supplied Tripo rig.
   Motion clips share one clock and crossfade on the existing GPU-skinned body.
   One character/skeleton moves between the street and the driver's seat. */
window.QuarterPlayerCharacter = class QuarterPlayerCharacter {
 static async create(ctx){const character=new this(ctx);await character.load();return character;}
 constructor({B,scene,hero,contact}){Object.assign(this,{B,scene,hero,contact});this.phase=0;this.time=0;this.gait=0;this.speed=0;this.driving=false;this.nodes={};}
 async load(){
  const {B,scene}=this;
  await QuarterAssets.load('assets/character2-data.js','assets/animations/mixamo-locomotion.js');
  B.MeshoptCompression.Configuration.decoder.url='vendor/meshopt_decoder.js';
  const bytes=Uint8Array.from(atob(window.CHARACTER2_BASE64),c=>c.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));let imported;
  try{imported=await B.SceneLoader.ImportMeshAsync('','',url,scene,undefined,'.glb');}finally{URL.revokeObjectURL(url);}
  for(const group of imported.animationGroups)group.stop();
  this.mesh=new B.TransformNode('character2-player',scene);
  this.visual=new B.TransformNode('character2-normalized',scene);this.visual.parent=this.mesh;
  for(const m of imported.meshes)if(!m.parent)m.parent=this.visual;
  this.meshes=imported.meshes.filter(m=>m.getTotalVertices()>0);this.skeleton=imported.skeletons[0];
  if(!this.skeleton)throw new Error('character2-rigged.glb is missing its skeleton');
  let lo=new B.Vector3(Infinity,Infinity,Infinity),hi=lo.negate();
  for(const m of this.meshes){m.computeWorldMatrix(true);const box=m.getBoundingInfo().boundingBox;lo=B.Vector3.Minimize(lo,box.minimumWorld);hi=B.Vector3.Maximize(hi,box.maximumWorld);}
  this.scale=1.78/(hi.y-lo.y);this.visual.scaling.setAll(this.scale);
  // Supplied model faces -X after glTF's handedness conversion. Gameplay uses +Z.
  this.visual.rotation.y=Math.PI/2;
  const center=new B.Vector3((lo.x+hi.x)*.5,lo.y,(lo.z+hi.z)*.5);
  this.baseOffset=B.Vector3.TransformNormal(center,B.Matrix.RotationY(Math.PI/2)).scale(-this.scale);
  this.visual.position.copyFrom(this.baseOffset);
  for(const bone of this.skeleton.bones){const node=bone.getTransformNode();if(!node)continue;
   const world=node.computeWorldMatrix(true),inv=B.Matrix.Invert(world),sign=world.determinant()<0?-1:1;
   this.nodes[bone.name.replace(/^mixamorig[:_]?/i,'')]={node,rotation:node.rotationQuaternion.clone(),position:node.position.clone(),
    pitch:B.Vector3.TransformNormal(B.Axis.X,inv).normalize().scale(sign),
    yaw:B.Vector3.TransformNormal(B.Axis.Y,inv).normalize().scale(sign),
    roll:B.Vector3.TransformNormal(B.Axis.Z,inv).normalize().scale(sign)};
  }
  this.joints=Object.values(this.nodes);this.feet=[];
  for(const m of this.meshes){
   m.name='character2-player-body';m.isPickable=false;m.receiveShadows=true;m.computeBonesUsingShaders=true;
   const material=m.material;if(material){material.name='character2-authored-PBR';material.environmentIntensity=.65;material.maxSimultaneousLights=3;material.enableSpecularAntiAliasing=true;}
   const positions=m.getVerticesData(B.VertexBuffer.PositionKind),indices=m.getVerticesData(B.VertexBuffer.MatricesIndicesKind),weights=m.getVerticesData(B.VertexBuffer.MatricesWeightsKind);
   const vertices=[];for(let i=0;i<positions.length;i+=3)if(positions[i+1]<lo.y+.075*(hi.y-lo.y)){
    const k=i/3*4;vertices.push({point:new B.Vector3(positions[i],positions[i+1],positions[i+2]),indices:Array.from(indices.slice(k,k+4)),weights:Array.from(weights.slice(k,k+4))});}
   this.feet.push({mesh:m,vertices});
   // Shader skinning changes the pose without changing the static source bounds.
   // Use conservative bounds for bent limbs, including the seated posture.
   const box=m.getBoundingInfo().boundingBox;
   m.setBoundingInfo(new B.BoundingInfo(new B.Vector3(box.minimum.x-.4,box.minimum.y-.25,box.minimum.z-.4),new B.Vector3(box.maximum.x+.4,box.maximum.y+.15,box.maximum.z+.4)));
  }
  this.info={source:'character2-rigged.glb',bones:this.skeleton.bones.length,vertices:this.meshes.reduce((n,m)=>n+m.getTotalVertices(),0),
   triangles:this.meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0),height:1.78,embeddedClips:imported.animationGroups.map(g=>g.name),animation:'retargeted Mixamo motion capture',loadedClips:['Idle','Walk','Run','Jump'],motionSource:window.QUARTER_MIXAMO.source};
  this.loadMotion();
  this.update(new B.Vector3(-.9,0,1.3),.25,0,0,true);
 }
 rotate(name,pitch=0,yaw=0,roll=0){
  const joint=this.nodes[name];if(!joint)return;const {B}=this;
  joint.node.rotationQuaternion=joint.rotation.multiply(B.Quaternion.RotationAxis(joint.pitch,pitch))
   .multiply(B.Quaternion.RotationAxis(joint.yaw,yaw)).multiply(B.Quaternion.RotationAxis(joint.roll,roll));
 }
 prepare(){for(const joint of this.joints)joint.node.computeWorldMatrix(true);this.skeleton.prepare(true);}
 lowestSole(){
  this.prepare();let low=Infinity;
  for(const part of this.feet){const matrices=this.skeleton.getTransformMatrices(part.mesh),world=part.mesh.computeWorldMatrix(true).m;
   for(const vertex of part.vertices){let x=0,y=0,z=0;const p=vertex.point;
    for(let i=0;i<4;i++){const w=vertex.weights[i];if(!w)continue;const k=vertex.indices[i]*16;
     x+=(matrices[k]*p.x+matrices[k+4]*p.y+matrices[k+8]*p.z+matrices[k+12])*w;
     y+=(matrices[k+1]*p.x+matrices[k+5]*p.y+matrices[k+9]*p.z+matrices[k+13])*w;
     z+=(matrices[k+2]*p.x+matrices[k+6]*p.y+matrices[k+10]*p.z+matrices[k+14])*w;}
    low=Math.min(low,world[1]*x+world[5]*y+world[9]*z+world[13]);
   }
  }
  return low;
 }
 resetBindPose(){for(const joint of this.joints){joint.node.rotationQuaternion.copyFrom(joint.rotation);joint.node.position.copyFrom(joint.position);}}
 loadMotion(){
  const pack=window.QUARTER_MIXAMO;if(!pack)throw new Error('Mixamo locomotion clips are missing');
  this.motionPack=pack;this.motionJoints=pack.bones.map(name=>this.nodes[name]);
  if(this.motionJoints.some(j=>!j))throw new Error('Mixamo clip bone mapping does not match character2');
  this.clips={};for(const [name,clip] of Object.entries(pack.clips)){
   const bytes=Uint8Array.from(atob(clip.data),c=>c.charCodeAt(0));this.clips[name]={...clip,values:new Float32Array(bytes.buffer)};
  }
  this.animationWeights=[1,0,0];this.motionLift=0;this.jumpTime=-1;this.jumpWeight=0;
  this.sampleQuaternions=Array.from({length:6},()=>this.B.Quaternion.Identity());
 }
 jump(){if(this.driving||this.jumpTime>=0)return false;this.jumpTime=0;return true;}
 resetMotion(){this.jumpTime=-1;this.jumpWeight=0;this.phase=this.speed=this.gait=this.motionLift=0;this.animationWeights=[1,0,0];}
 sample(clip,phase,bone,out){
  const frame=(((phase%1)+1)%1)*(clip.frames-1),key=Math.floor(frame),f=frame-key,stride=this.motionPack.stride;
  const a=key*stride+bone*4,b=Math.min(key+1,clip.frames-1)*stride+bone*4,v=clip.values;
  const [qa,qb]=this.sampleQuaternions;
  qa.set(v[a],v[a+1],v[a+2],v[a+3]);qb.set(v[b],v[b+1],v[b+2],v[b+3]);
  this.B.Quaternion.SlerpToRef(qa,qb,f,out);
 }
 sampleScalar(clip,phase,offset){
  const frame=(((phase%1)+1)%1)*(clip.frames-1),key=Math.floor(frame),f=frame-key,stride=this.motionPack.stride;
  const a=key*stride+offset,b=Math.min(key+1,clip.frames-1)*stride+offset;
  return clip.values[a]+(clip.values[b]-clip.values[a])*f;
 }
 pose(){
  this.resetBindPose();const {B}=this,weights=this.animationWeights,moving=weights[1]+weights[2],run=moving>0?weights[2]/moving:0;
  const phases=[this.time/this.clips.idle.duration,this.phase,this.phase],clips=[this.clips.idle,this.clips.walk,this.clips.run];
  const [, ,idle,walk,running,mixed]=this.sampleQuaternions;
  for(let i=0;i<this.motionJoints.length;i++){
   this.sample(clips[0],phases[0],i,idle);this.sample(clips[1],phases[1],i,walk);this.sample(clips[2],phases[2],i,running);
   B.Quaternion.SlerpToRef(walk,running,run,mixed);B.Quaternion.SlerpToRef(idle,mixed,moving,this.motionJoints[i].node.rotationQuaternion);
  }
  const offset=this.motionJoints.length*4;
  this.nodes.Hips.node.position.y+=clips.reduce((sum,c,i)=>sum+weights[i]*this.sampleScalar(c,phases[i],offset),0);
  this.motionLift=weights[2]*this.sampleScalar(clips[2],phases[2],offset+1)*this.scale;
  if(this.jumpTime>=0){
   const phase=Math.min(.9999999,this.jumpTime/this.clips.jump.duration),q=this.sampleQuaternions[2];
   for(let i=0;i<this.motionJoints.length;i++){
    this.sample(this.clips.jump,phase,i,q);const rotation=this.motionJoints[i].node.rotationQuaternion;
    B.Quaternion.SlerpToRef(rotation,q,this.jumpWeight,rotation);
   }
   const hip=this.nodes.Hips,desired=hip.position.y+this.sampleScalar(this.clips.jump,phase,offset);
   hip.node.position.y+=(desired-hip.node.position.y)*this.jumpWeight;
   this.motionLift+=(this.sampleScalar(this.clips.jump,phase,offset+1)*this.scale-this.motionLift)*this.jumpWeight;
  }
 }
 seated(){
  if(this.seatRotations){for(let i=0;i<this.joints.length;i++){this.joints[i].node.rotationQuaternion.copyFrom(this.seatRotations[i]);this.joints[i].node.position.copyFrom(this.joints[i].position);}this.prepare();return;}
  this.resetBindPose();this.rotate('Spine',.32);this.rotate('Head',-.12);
  for(const side of ['Left','Right']){
   this.rotate(side+'UpLeg',-1.35);this.rotate(side+'Leg',1.37);this.rotate(side+'Foot',-.02);
   this.rotate(side+'Arm',-.85,0,side==='Left'?-.05:.05);this.rotate(side+'ForeArm',-.65);
  }
  // Align wrists to the real handlebar grips instead of leaving floating hands.
  this.hero.computeWorldMatrix(true);
  for(const side of ['Left','Right']){
   const grip=this.hero.driver.grips[side==='Left'?0:1];
   const target=this.B.Vector3.TransformCoordinates(new this.B.Vector3(...grip),this.hero.getWorldMatrix());
   this.reach(side,target);
   for(const finger of ['Index','Middle','Ring','Pinky']){
    this.rotate(side+'Hand'+finger+'1',side==='Left'?-.35:.35);
    this.rotate(side+'Hand'+finger+'2',side==='Left'?-.45:.45);
   }
  }
  this.seatRotations=this.joints.map(j=>j.node.rotationQuaternion.clone());
  this.prepare();
 }
 reach(side,target){
  const {B}=this,end=this.nodes[side+'Hand'].node;
  for(let i=0;i<12;i++)for(const name of [side+'ForeArm',side+'Arm']){
   const node=this.nodes[name].node;node.computeWorldMatrix(true);end.computeWorldMatrix(true);
   const origin=node.getAbsolutePosition(),current=end.getAbsolutePosition().subtract(origin).normalize(),wanted=target.subtract(origin).normalize();
   const axis=B.Vector3.Cross(current,wanted),length=axis.length();if(length<.00001)continue;
   const angle=Math.acos(Math.max(-1,Math.min(1,B.Vector3.Dot(current,wanted)))),world=node.getWorldMatrix();
   const local=B.Vector3.TransformNormal(axis.scale(1/length),B.Matrix.Invert(world)).normalize().scale(world.determinant()<0?-1:1);
   node.rotationQuaternion=node.rotationQuaternion.multiply(B.Quaternion.RotationAxis(local,angle));
  }
 }
 update(position,heading,speed,dt,onFoot=true){
  this.time+=dt;this.driving=!onFoot;
  this.mesh.parent=onFoot?null:this.hero;
  if(onFoot)this.mesh.position.copyFrom(position);else this.mesh.position.set(...this.hero.driver.position);
  this.mesh.rotation.y=onFoot?heading:0;
  this.visual.position.copyFrom(this.baseOffset);this.contact.setEnabled(onFoot);
  if(onFoot){
   this.contact.position.set(position.x,position.y+.009,position.z);
   this.speed+=(speed-this.speed)*(1-Math.exp(-dt*12));
   const run=Math.max(0,Math.min(1,(speed-2.05)/.40)),moving=speed>.08?1:0,target=[1-moving,moving*(1-run),moving*run];
   const blend=1-Math.exp(-dt*14);for(let i=0;i<3;i++)this.animationWeights[i]+=(target[i]-this.animationWeights[i])*blend;
   this.gait=this.animationWeights[1]+this.animationWeights[2];
   const runBlend=this.gait>.001?this.animationWeights[2]/this.gait:0;
   const cadence=(1-runBlend)/this.clips.walk.duration/this.clips.walk.nominalSpeed+runBlend/this.clips.run.duration/this.clips.run.nominalSpeed;
   this.phase+=dt*this.speed*cadence;
   if(this.jumpTime>=0){this.jumpTime+=dt;if(this.jumpTime>=this.clips.jump.duration){this.jumpTime=-1;this.jumpWeight=0;}
    else this.jumpWeight=Math.max(0,Math.min(1,this.jumpTime/.12,(this.clips.jump.duration-this.jumpTime)/.20));}
   this.pose();
   const low=this.lowestSole();if(Number.isFinite(low))this.visual.position.y+=position.y+this.motionLift-low;
   this.prepare();
  }else{this.resetMotion();this.seated();}
 }
 snapshot(){return {...this.info,state:this.driving?'seated':this.jumpTime>=0?'jump':this.animationWeights[2]>.5?'run':this.gait>.1?'walk':'idle',jumpTime:+this.jumpTime.toFixed(3),weights:this.animationWeights.map(w=>+w.toFixed(3)),airborneHeight:+this.motionLift.toFixed(3),gait:+this.gait.toFixed(3),phase:+this.phase.toFixed(3)};}
};
