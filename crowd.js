/* Six NPC types with shared geometry, textures and bounded motion palettes. */
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
  this.actors=new QuarterNPCActors(this);
  this.routes=[this.makeRoute(-1),this.makeRoute(1)];const perSide=this.mobile?48:90;
  for(let side=0;side<2;side++)for(let i=0;i<perSide;i++){
   const poolIndex=(i*7+side*3)%this.pools.length,h=this.random(.94,1.05),contact=this.shadowSource.createInstance('crowd-contact-'+side+'-'+i);contact.scaling.set(h,1,h);contact.isPickable=false;
   const a={id:this.agents.length,route:this.routes[side],s:this.routes[side].length*(i+.22)/perSide+this.random(-1,1)+side*1.75,contact,poolIndex,scale:h,speed:0,targetSpeed:0,cruise:this.random(1.20,1.42),pause:0,nextPause:this.random(16,65),heading:0,x:0,z:0,visible:true,waiting:false};
   a.direction=a.id%3===0?-1:1;a.preferredLane=a.direction>0?-.36:.295;a.lane=a.preferredLane+this.random(-.01,.01);a.laneVelocity=0;a.blockedTime=0;a.travelled=0;a.approvedLane=a.lane;a.role='walk';a.talking=false;a.talkingMesh=this.actors.instance(this.actors.talks[Math.floor(poolIndex/4)*2+a.id%2],'npc-talk-'+a.id);a.talkingMesh.setEnabled(false);
   a.idlePoolIndex=Math.floor(poolIndex/4)*2+poolIndex%2;a.variant=Math.floor(poolIndex/4);
   a.walking=this.pools[poolIndex].mesh.createInstance('npc-walker-'+side+'-'+i);a.standing=this.idlePools[a.idlePoolIndex].mesh.createInstance('npc-waiting-'+side+'-'+i);
   for(const m of [a.walking,a.standing]){m.parent=null;m.rotationQuaternion=B.Quaternion.Identity();m.isPickable=false;m.receiveShadows=true;}
   for(const m of [a.walking,a.standing,a.talkingMesh])QuarterClothing.tint(B,m,a.id);
   this.agents.push(a);this.place(a,0);
  }
  this.player=await QuarterPlayerCharacter.create({B,scene,hero:this.hero,contact:this.shadowSource.createInstance('player-contact')});
  this.rigInfo={vertices:this.mesh.getTotalVertices(),triangles:this.mesh.getTotalIndices()/3,bones:this.pools[0].skeleton.bones.length,crowd:this.agents.length,walkingPalettes:this.pools.length,idlePalettes:this.idlePools.length,textures:this.material.getActiveTextures().length,source:'npc-man-1.glb',models:this.models.map((m,variant)=>({source:m.source,triangles:m.mesh.getTotalIndices()/3,bones:m.walks[0].skeleton.bones.length,agents:this.agents.filter(a=>a.variant===variant).length})),animation:'retargeted Mixamo walk / idle',sharedGeometry:this.models.every(m=>[...m.walks,...m.idles].every(p=>p.mesh.geometry===m.mesh.geometry)),sharedTextures:this.models.every(m=>[...m.walks,...m.idles].every(p=>p.mesh.material===m.material)),drawTechnique:'GPU instances with shared bone palettes'};
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
 setupSocial(){
  for(const route of this.routes){if(route.socialReady)continue;route.socialReady=true;const agents=this.agents.filter(a=>a.route===route).sort((a,b)=>a.id-b.id);
   for(const a of agents){a.role='walk';a.group=null;a.social=null;a.talking=false;}
   const groups=Math.min(3,Math.floor(agents.length/12));for(let g=0;g<groups;g++){const s=route.length*(.18+g*.28),p=this.sample(route,s),members=agents.slice(g*3,g*3+3),normal={x:-Math.cos(p.heading),z:Math.sin(p.heading)},along={x:Math.sin(p.heading),z:Math.cos(p.heading)},group={members,phase:g*1.7};
    const outward=this.world&&Math.min(...this.world.distances(p.x+normal.x*.6,p.z+normal.z*.6))<Math.min(...this.world.distances(p.x-normal.x*.6,p.z-normal.z*.6))?-1:1;
    members.forEach((a,k)=>{const lateral=outward*(k===1?.86:.89),tangent=(k-1)*.94;let x=p.x+normal.x*lateral+along.x*tangent,z=p.z+normal.z*lateral+along.z*tangent;if(this.world&&!this.world.pavementAt(x,z)){x=p.x;z=p.z+tangent;}a.role='social';a.group=group;a.social={x,z,heading:Math.atan2(p.x+normal.x*.45-x,p.z+normal.z*.45-z)};a.speed=a.targetSpeed=0;this.place(a,0);});
   }
   for(const a of agents.slice(groups*3,groups*3+3)){a.role='loiter';for(let k=0;k<80;k++){const p=this.sample(route,a.s);const normal={x:-Math.cos(p.heading),z:Math.sin(p.heading)},outward=Math.min(...this.world.distances(p.x+normal.x*.6,p.z+normal.z*.6))<Math.min(...this.world.distances(p.x-normal.x*.6,p.z-normal.z*.6))?-1:1;a.social={x:p.x+normal.x*.88*outward,z:p.z+normal.z*.88*outward,heading:p.heading+Math.PI/2};this.place(a,0);if(this.world.pavementAt(a.x,a.z)&&!this.agents.some(b=>a!==b&&Math.hypot(a.x-b.x,a.z-b.z)<.78))break;a.s=(a.s+1.8)%route.length;}a.speed=a.targetSpeed=0;}
   for(const a of agents)if(a.role==='walk')for(let k=0;k<80;k++){this.place(a,0);if(!this.agents.some(b=>a!==b&&Math.hypot(a.x-b.x,a.z-b.z)<.75))break;a.s=(a.s+1.3)%route.length;}
  }
 }
 offsetSample(a,s,lane=a.lane){const p=this.sample(a.route,s),x=p.x-Math.cos(p.heading)*lane,z=p.z+Math.sin(p.heading)*lane;p.x=x;p.z=z;if(a.direction<0)p.heading+=Math.PI;return p;}
 pavementClear(p){if(!this.world)return Math.abs(p.x)>3.78&&Math.abs(p.x)<5.04;const d=Math.min(...this.world.distances(p.x,p.z));return d>=3.77&&d<=5.10;}
 think(dt,player){
  const cells=new Map(),key=(x,z)=>Math.floor(x/2)+','+Math.floor(z/2);for(const a of this.agents){const k=key(a.x,a.z);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(a);}
  for(const a of this.agents){a.talking=false;const cx=Math.floor(a.x/2),cz=Math.floor(a.z/2);a.neighbors=[];for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)a.neighbors.push(...(cells.get((cx+i)+','+(cz+j))||[]));
   if(a.role!=='walk'){
    if(a.group)a.talking=a.group.members[Math.floor((this.time+a.group.phase)/3.7)%a.group.members.length]===a;
    if(a.reactionUntil>this.time){a.talking=true;a.heading=Math.atan2((player?.x??a.x)-a.x,(player?.z??a.z)-a.z);}a.targetSpeed=0;a.laneVelocity=0;continue;
   }
   a.nextPause-=dt;if(a.nextPause<=0){a.pause=this.random(1.4,4.2);a.nextPause=this.random(28,85);}a.pause=Math.max(0,a.pause-dt);
   if(a.reactionUntil>this.time){a.targetSpeed=0;a.laneVelocity=0;a.talking=true;continue;}
   if(a.direction<0&&a.blockedTime>.8&&this.time>(a.yieldUntil||0)&&this.time>(a.nextYieldAfter||0)){a.yieldUntil=this.time+2.1;a.nextYieldAfter=this.time+4.2;}
   // Keep opposing streams on their own side; overtaking into the opposite
   // stream creates a wedge that neither side can clear on narrow pavements.
   let goalLane=a.preferredLane;
   if(this.time<(a.yieldUntil||0))goalLane=a.preferredLane;
   const cruise=a.pause>0?0:this.time<(a.yieldUntil||0)?-.65:a.cruise,desiredLateral=Math.max(-.65,Math.min(.65,(goalLane-a.lane)*1.4));let best=null;
   if(!a.neighbors.some(b=>b!==a)&&(!player||Math.hypot(a.x-player.x,a.z-player.z)>3)){a.targetSpeed=cruise;a.laneVelocity=desiredLateral;continue;}
   // Sample velocities rather than snapping lanes. Predict close approaches,
   // including moving pedestrians; sidesteps remain available at zero speed.
   for(const rate of [cruise,cruise*.65,cruise*.30,0])for(const lateral of [desiredLateral,0,-.65,.65,-.32,.32]){
    let safe=true,clearance=2;
    for(const t of [.25,.65,1.15]){
     const future=this.offsetSample(a,a.s+a.direction*rate*t,a.lane+lateral*t);
     if((a.direction>0&&(a.lane+lateral*t<-.43||a.lane+lateral*t>-.28))||(a.direction<0&&(a.lane+lateral*t<.28||a.lane+lateral*t>.31))||!this.pavementClear(future)){safe=false;break;}
     for(const b of a.neighbors){if(b===a)continue;const bx=b.x+(b.vx||0)*t,bz=b.z+(b.vz||0)*t,d=Math.hypot(future.x-bx,future.z-bz),current=Math.hypot(a.x-b.x,a.z-b.z);clearance=Math.min(clearance,d);if(d<.55&&d<current-.005){safe=false;break;}}
     if(player){const d=Math.hypot(future.x-player.x,future.z-player.z),current=Math.hypot(a.x-player.x,a.z-player.z);clearance=Math.min(clearance,d);if(d<.70&&d<current-.005)safe=false;}
     if(!safe)break;
    }
    if(!safe)continue;const score=(cruise-rate)**2*.85+(lateral-desiredLateral)**2*.20+lateral*lateral*.09+Math.max(0,1-clearance)**2*.35;
    if(!best||score<best.score)best={rate,lateral,score};
   }
   a.targetSpeed=best?.rate||0;a.laneVelocity=best?.lateral||0;
  }
 }
 react(a,player){if(this.time<(a.reactionUntil||0))return;a.reactionUntil=this.time+1.8;a.pause=1.8;a.reactionHeading=Math.atan2(player.x-a.x,player.z-a.z);a.heading=a.reactionHeading;a.targetSpeed=0;this.speech?.play(a,'bump',Math.hypot(player.x-a.x,player.z-a.z));}
 place(a,dt){
  const p=a.role==='walk'?this.offsetSample(a,a.s):a.social||this.offsetSample(a,a.s);a.x=p.x;a.z=p.z;if(a.role==='walk'&&Math.hypot(a.vx||0,a.vz||0)>.12)p.heading=Math.atan2(a.vx,a.vz);if(dt===0)a.approvedLane=a.lane;if(a.reactionUntil>this.time)p.heading=a.reactionHeading??a.heading;
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
    if(a.role!=='walk'){a.speed=0;a.vx=a.vz=0;this.place(a,step);continue;}
    const oldX=a.x,oldZ=a.z;a.speed+=(a.targetSpeed-a.speed)*(1-Math.exp(-step*8));
    const oldLane=a.lane,nextLane=oldLane+(a.laneVelocity||0)*step,nextS=a.s+a.direction*a.speed*step;
    const clear=p=>this.pavementClear(p)&&(a.neighbors||this.agents).every(b=>b===a||Math.hypot(p.x-b.x,p.z-b.z)>=Math.min(.55,Math.hypot(oldX-b.x,oldZ-b.z))-.000001)&&(!player||Math.hypot(p.x-player.x,p.z-player.z)>=Math.min(.60,Math.hypot(oldX-player.x,oldZ-player.z))-.000001);
    let next=this.offsetSample(a,nextS,nextLane),accepted=false;
    // A blocked forward move can still make a swept, collision-free sidestep.
    if(clear(next)){a.s=nextS;a.lane=nextLane;accepted=true;}
    else{next=this.offsetSample(a,a.s,nextLane);if(clear(next)){a.lane=nextLane;accepted=true;}a.speed=0;}
    if(!accepted)a.speed=0;a.approvedLane=a.lane;this.place(a,step);
    a.vx=(a.x-oldX)/step;a.vz=(a.z-oldZ)/step;const moved=Math.hypot(a.x-oldX,a.z-oldZ);a.travelled=(a.travelled||0)+moved;
    a.blockedTime=a.pause>0||a.reactionUntil>this.time||moved>step*.10?0:(a.blockedTime||0)+step;
    if(moved>step*.12&&Math.abs(a.laneVelocity)>.12){const desired=Math.atan2(a.vx,a.vz),turn=(desired-a.heading+Math.PI*3)%(Math.PI*2)-Math.PI;a.heading+=turn*(1-Math.exp(-step*10));}
   }
   this.accumulator-=step;
  }
  this.actors.update(dt);
  this.poseTime+=dt;
  if(this.poseTime>=1/30){
   for(const p of [...this.pools,...this.idlePools])if(p.count>0)this.poseNPC(p,this.time*(p.clip==='walk'?1.4:1)/(p.clip==='walk'?p.clips.walk.duration:p.clips.idle.duration)+p.phase);
   this.poseTime=0;
  }
  for(const a of this.agents){
   const visible=Math.hypot(camera.x-a.x,camera.z-a.z)<58,waiting=Math.hypot(a.vx||0,a.vz||0)<.12;
   if(visible!==a.visible||waiting!==a.waiting){a.contact.setEnabled(visible);a.visible=visible;a.waiting=waiting;}
  }
  this.flushNPCInstances();
 }
 updatePlayer(position,heading,speed,dt,visible=true){
  this.player.update(position,heading,speed,dt,visible);
 }
 shadowCasters(camera){return this.agents.filter(a=>a.visible&&Math.hypot(camera.x-a.x,camera.z-a.z)<28).map(a=>a.talking?a.talkingMesh:a.waiting?a.standing:a.walking).concat(this.player.meshes);}
 snapshot(){
  let minGap=Infinity,offPavement=0,closestPair;
  for(const a of this.agents){if(this.world?!this.world.pavementAt(a.x,a.z):(Math.abs(a.x)<3.88||Math.abs(a.x)>4.52))offPavement++;for(const b of this.agents)if(b.id>a.id){const gap=Math.hypot(a.x-b.x,a.z-b.z);if(gap<minGap){minGap=gap;closestPair=[a,b].map(p=>({id:p.id,role:p.role,x:p.x,z:p.z}));}}}
  return {...this.rigInfo,time:+this.time.toFixed(2),visible:this.agents.filter(a=>a.visible).length,waiting:this.agents.filter(a=>a.waiting).length,
   minimumSeparation:+minGap.toFixed(3),blockedWalkers:this.agents.filter(a=>a.role==='walk'&&a.blockedTime>3).length,closestPair,offPavement,social:this.agents.filter(a=>a.role==='social').length,loitering:this.agents.filter(a=>a.role==='loiter').length,talking:this.agents.filter(a=>a.talking).length,reverseWalking:this.agents.filter(a=>a.role==='walk'&&a.direction<0).length,pavementRoutes:this.routes.map(r=>({tile:r.key,side:r.side,length:+r.length.toFixed(2),points:r.points.length}))};
 }
};
