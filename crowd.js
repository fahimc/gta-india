/* Three NPC types: shared geometry/textures and 18 motion-capture bone palettes. */
window.OldQuarterCrowd = class OldQuarterCrowd extends QuarterNPCPalettes {
 static async create(ctx){const crowd=new this(ctx);await crowd.load();return crowd;}
 constructor({B,scene,shadow,contactMaterial,mobile,hero}){
  super();Object.assign(this,{B,scene,shadow,mobile,hero,contactMaterial});this.agents=[];this.pools=[];
  this.time=0;this.accumulator=0;this.brainTime=0;this.poseTime=0;this.seed=40817;this.paused=false;
 }
 random(a=0,b=1){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return a+(this.seed/4294967296)*(b-a);}
 async load(){
  const {B,scene}=this;await this.loadNPC();
  this.shadowSource=B.MeshBuilder.CreateGround('pooled-foot-contact',{width:.70,height:.60},scene);this.shadowSource.material=this.contactMaterial;this.shadowSource.position.y=-100;this.shadowSource.isPickable=false;
  this.routes=[this.makeRoute(-1),this.makeRoute(1)];const perSide=this.mobile?48:90;
  for(let side=0;side<2;side++)for(let i=0;i<perSide;i++){
   const poolIndex=(i*7+side*3)%12,h=this.random(.94,1.05),contact=this.shadowSource.createInstance('crowd-contact-'+side+'-'+i);contact.scaling.set(h,1,h);contact.isPickable=false;
   const a={id:this.agents.length,route:this.routes[side],s:this.routes[side].length*(i+.22)/perSide+this.random(-1,1)+side*1.75,contact,poolIndex,scale:h,speed:1.25,targetSpeed:1.25,cruise:this.random(1.20,1.42),pause:0,nextPause:this.random(16,65),heading:0,x:0,z:0,visible:true,waiting:false};
   a.idlePoolIndex=Math.floor(poolIndex/4)*2+poolIndex%2;a.variant=Math.floor(poolIndex/4);
   a.walking=this.pools[poolIndex].mesh.createInstance('npc-walker-'+side+'-'+i);a.standing=this.idlePools[a.idlePoolIndex].mesh.createInstance('npc-waiting-'+side+'-'+i);
   for(const m of [a.walking,a.standing]){m.parent=null;m.rotationQuaternion=B.Quaternion.Identity();m.isPickable=false;m.receiveShadows=true;}
   this.agents.push(a);this.place(a,0);
  }
  this.player=await QuarterPlayerCharacter.create({B,scene,hero:this.hero,contact:this.shadowSource.createInstance('player-contact')});
  this.rigInfo={vertices:this.mesh.getTotalVertices(),triangles:this.mesh.getTotalIndices()/3,bones:this.pools[0].skeleton.bones.length,crowd:this.agents.length,walkingPalettes:12,idlePalettes:6,textures:this.material.getActiveTextures().length,source:'npc-man-1.glb',models:this.models.map((m,variant)=>({source:m.source,triangles:m.mesh.getTotalIndices()/3,bones:m.walks[0].skeleton.bones.length,agents:this.agents.filter(a=>a.variant===variant).length})),animation:'retargeted Mixamo walk / idle',sharedGeometry:this.models.every(m=>[...m.walks,...m.idles].every(p=>p.mesh.geometry===m.mesh.geometry)),sharedTextures:this.models.every(m=>[...m.walks,...m.idles].every(p=>p.mesh.material===m.material)),drawTechnique:'GPU instances with shared bone palettes'};
  this.update(0,new B.Vector3(0,3,-5),null);
 }
 makeRoute(side){
  const points=[],x=side*4.20,r=.30,low=-6.5,high=51.5;
  for(let i=0;i<=58;i++)points.push([x+side*r,low+i]);
  for(let i=1;i<=16;i++){const a=i/16*Math.PI;points.push([x+side*r*Math.cos(a),high+r*Math.sin(a)]);}
  for(let i=1;i<=58;i++)points.push([x-side*r,high-i]);
  for(let i=1;i<=16;i++){const a=Math.PI+i/16*Math.PI;points.push([x+side*r*Math.cos(a),low+r*Math.sin(a)]);}
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  return {side,points,lengths,length:lengths.at(-1),pavementY:.163};
 }
 sample(route,s){
  s=((s%route.length)+route.length)%route.length;let lo=0,hi=route.lengths.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(route.lengths[mid]<=s)lo=mid;else hi=mid;}
  const a=route.points[lo],b=route.points[hi],t=(s-route.lengths[lo])/(route.lengths[hi]-route.lengths[lo]);
  return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,heading:Math.atan2(b[0]-a[0],b[1]-a[1])};
 }
 think(dt,player){
  for(const route of this.routes){
   const agents=this.agents.filter(a=>a.route===route).sort((a,b)=>a.s-b.s);
   agents.forEach((a,i)=>{
    a.nextPause-=dt;if(a.nextPause<=0){a.pause=this.random(1.4,3.2);a.nextPause=this.random(28,85);}a.pause=Math.max(0,a.pause-dt);
    const next=agents[(i+1)%agents.length],gap=(next.s-a.s+route.length)%route.length;
    let target=a.pause>0?0:a.cruise;
    // Look-ahead braking follows the queue, rather than letting bodies overlap.
    target=Math.min(target,Math.max(0,(gap-.92)*.95));
    if(player&&Math.hypot(player.x-a.x,player.z-a.z)<.82)target=0;
    a.targetSpeed=target;
   });
  }
 }
 place(a,dt){
  const p=this.sample(a.route,a.s);a.x=p.x;a.z=p.z;
  let delta=(p.heading-a.heading+Math.PI*3)%(Math.PI*2)-Math.PI;
  a.heading=dt===0?p.heading:a.heading+delta*(1-Math.exp(-dt*10));

  a.contact.position.set(p.x,a.route.pavementY+.006,p.z);
 }
 update(dt,camera,player){
  if(this.paused)dt=0;
  this.time+=dt;this.accumulator=Math.min(this.accumulator+dt,.1);
  while(this.accumulator>=1/60){
   const step=1/60;this.brainTime+=step;
   if(this.brainTime>=.1){this.think(this.brainTime,player);this.brainTime=0;}
   for(const a of this.agents){
    a.speed+=(a.targetSpeed-a.speed)*(1-Math.exp(-step*4));const nextS=(a.s+a.speed*step)%a.route.length;
    // The 10 Hz planner brakes early; this swept-step guard enforces clearance
    // even when a player steps into the lane between two decisions.
    const next=player?this.sample(a.route,nextS):null;
    const blocked=player&&Math.hypot(next.x-player.x,next.z-player.z)<.56&&Math.hypot(next.x-player.x,next.z-player.z)<Math.hypot(a.x-player.x,a.z-player.z);
    if(blocked)a.speed=0;else a.s=nextS;this.place(a,step);
   }
   this.accumulator-=step;
  }
  this.poseTime+=dt;
  if(this.poseTime>=1/30){
   for(const p of [...this.pools,...this.idlePools])this.poseNPC(p,this.time*(p.clip==='walk'?1.4:1)/(p.clip==='walk'?p.clips.walk.duration:p.clips.idle.duration)+p.phase);
   this.poseTime=0;
  }
  for(const a of this.agents){
   const visible=Math.hypot(camera.x-a.x,camera.z-a.z)<58,waiting=a.speed<.12;
   if(visible!==a.visible||waiting!==a.waiting){a.contact.setEnabled(visible);a.visible=visible;a.waiting=waiting;}
  }
  this.flushNPCInstances();
 }
 updatePlayer(position,heading,speed,dt,visible=true){
  this.player.update(position,heading,speed,dt,visible);
 }
 shadowCasters(camera){return this.agents.filter(a=>a.visible&&Math.hypot(camera.x-a.x,camera.z-a.z)<28).map(a=>a.waiting?a.standing:a.walking).concat(this.player.meshes);}
 snapshot(){
  let minGap=Infinity,offPavement=0;
  for(const a of this.agents){if(this.world?!this.world.pavementAt(a.x,a.z):(Math.abs(a.x)<3.88||Math.abs(a.x)>4.52))offPavement++;for(const b of this.agents)if(b.id>a.id)minGap=Math.min(minGap,Math.hypot(a.x-b.x,a.z-b.z));}
  return {...this.rigInfo,time:+this.time.toFixed(2),visible:this.agents.filter(a=>a.visible).length,waiting:this.agents.filter(a=>a.waiting).length,
   minimumSeparation:+minGap.toFixed(3),offPavement,pavementRoutes:this.routes.map(r=>({tile:r.key,side:r.side,length:+r.length.toFixed(2),points:r.points.length}))};
 }
};
