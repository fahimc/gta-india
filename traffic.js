/* Bounded, instanced left-hand traffic on the same streamed street grid.
   Fixed steps, junction reservations, swept footprint tests and queue braking. */
window.QuarterTraffic=class QuarterTraffic {
 static async create(ctx){const t=new this(ctx);await t.load();return t;}
 constructor(ctx){Object.assign(this,ctx);this.agents=[];this.time=0;this.accumulator=0;this.locks=new Map();this.recycled=0;this.recovered=0;this.recoveryAttempts=0;}
 async load(){const {B,scene,hero}=this;
  this.actors=this.crowd.actors;this.driver=this.actors;
  const rickshawCount=this.mobile?12:24,carCount=this.mobile?6:12;
  for(let id=0;id<rickshawCount+carCount;id++){
   const car=id>=rickshawCount,template=car?this.parked.vehicles[(id-rickshawCount)%3]:null,source=template?.root||hero;
   const root=new B.TransformNode('traffic-'+(template?.name||'rickshaw')+'-'+id,scene),map=new Map([[source,root]]),parts=[];
   const copy=(source,parent)=>{for(const node of source.getChildren(undefined,true)){
    const m=node.getTotalVertices?.()>0?node.createInstance('traffic-'+id+'-'+node.name):new B.TransformNode('traffic-'+id+'-'+node.name,scene);m.parent=parent;m.position.copyFrom(node.position);m.scaling.copyFrom(node.scaling);m.rotation.copyFrom(node.rotation);if(node.rotationQuaternion)m.rotationQuaternion=node.rotationQuaternion.clone();m.isPickable=false;map.set(node,m);if(node.getTotalVertices?.()>0){m.receiveShadows=true;parts.push(m);}copy(node,m);
   }};copy(source,root);
   const wheels=(template?.parts.wheels||this.autoWheels).map(w=>({axle:map.get(w.axle),pivot:map.get(w.pivot),radius:w.radius,front:w.front}));
   root.driver=source.driver;root.collision=source.collision;const occupant=this.actors.seat(root,id%2),drivers=[occupant.mesh],door=template?map.get(template.parts.door):null;
   this.agents.push({id,kind:car?'car':'rickshaw',name:template?.name.replaceAll('-',' ')||'rickshaw',root,parts,drivers,wheels,door,vehicleParts:template?{...template.parts,door,wheels}:null,collision:root.collision,groundY:template?.root.position.y||0,occupant,owned:false,controlled:false,held:false,speed:0,cruise:(car?4.0:3.2)+(id%5)*.23,s:0,x:0,z:0,heading:0,distance:0,visible:true,route:null});
  }
  this.recenter({x:0,z:1});
 }
 route(i,j){const lo=-1.30,hi=81.30,r=4,points=[],x=i*80,z=j*80-16;
  for(const [cx,cz,start] of [[lo+r,hi-r,Math.PI],[hi-r,hi-r,Math.PI/2],[hi-r,lo+r,0],[lo+r,lo+r,-Math.PI/2]])for(let n=0;n<=16;n++){const a=start-n/16*Math.PI/2;points.push([x+cx+r*Math.cos(a),z+cz+r*Math.sin(a)]);}points.push(points[0]);
  const lengths=[0];for(let n=1;n<points.length;n++)lengths.push(lengths.at(-1)+Math.hypot(points[n][0]-points[n-1][0],points[n][1]-points[n-1][1]));return {key:i+','+j,i,j,points,lengths,length:lengths.at(-1)};
 }
 sample(route,s){const p=this.crowd.sample(route,s);
  // Parked cars narrow the seed street to one moving lane. Its northbound
  // block loop borrows the centre, while the opposite block loop is excluded.
  if(route.i===0&&route.j===0&&Math.abs(p.x+1.30)<.01&&Math.abs(p.heading)<.1){const blend=Math.max(0,Math.min(1,(p.z+12)/8,(60-p.z)/8));p.x+=1.15*blend;}
  return p;
 }
 recenter(focus){const [i,j]=this.world.coords(focus.x,focus.z),key=i+','+j;if(key===this.center)return;this.center=key;this.locks.clear();const candidates=[];
  for(let a=i-1;a<=i+1;a++)for(let b=j-1;b<=j+1;b++)if(!(a===-1&&b===0))candidates.push({a,b,d:Math.hypot(a*80+40-focus.x,b*80+24-focus.z)});candidates.sort((a,b)=>a.d-b.d);
  const routes=candidates.slice(0,3).map(c=>this.agents.find(a=>a.route?.key===c.a+','+c.b)?.route||this.route(c.a,c.b));
  for(const a of this.agents)if(!routes.includes(a.route)&&!a.controlled&&(!a.owned||Math.hypot(a.x-focus.x,a.z-focus.z)>160)){a.route=null;a.owned=false;a.held=false;a.recovery=null;a.blockedTime=0;a.occupant.occupied=true;}
  for(const a of this.agents)if(!a.route){const route=routes.reduce((best,r)=>this.agents.filter(a=>a.route===r).length<this.agents.filter(a=>a.route===best).length?r:best,routes[0]),ss=this.agents.filter(b=>b.route===route).map(b=>b.s).sort((a,b)=>a-b);let s=route.length*.08,gap=0;
   for(let k=0;k<ss.length;k++){const g=(k+1<ss.length?ss[k+1]:ss[0]+route.length)-ss[k];if(g>gap){gap=g;s=(ss[k]+g/2)%route.length;}}a.route=route;a.s=s;a.speed=0;
   for(let k=0;k<Math.ceil(route.length/7);k++){const p=this.sample(route,a.s),parked=this.parked.carBlocked(p.x,p.z,p.heading),occupied=this.agents.some(b=>b!==a&&b.route&&this.overlaps(p.x,p.z,p.heading,b,.16,a.collision)),hero={x:this.hero.position.x,z:this.hero.position.z,heading:this.hero.rotation.y};if(!parked&&!occupied&&!this.overlaps(p.x,p.z,p.heading,hero,.35,a.collision))break;a.s=(a.s+7)%route.length;}
   this.place(a);a.previous={x:a.x,z:a.z,heading:a.heading,distance:a.distance};this.recycled++;
  }
 }
 overlaps(x,z,h,other,margin=.08,shape=this.hero.collision){const os=other.collision||this.hero.collision,cz=(shape.minZ+shape.maxZ)/2,oz=(os.minZ+os.maxZ)/2;
  const axes=[[Math.cos(h),-Math.sin(h)],[Math.sin(h),Math.cos(h)],[Math.cos(other.heading),-Math.sin(other.heading)],[Math.sin(other.heading),Math.cos(other.heading)]],dx=other.x+Math.sin(other.heading)*oz-x-Math.sin(h)*cz,dz=other.z+Math.cos(other.heading)*oz-z-Math.cos(h)*cz;
  for(const [ax,az] of axes){const radius=(q,w,l)=>w*Math.abs(ax*Math.cos(q)-az*Math.sin(q))+l*Math.abs(ax*Math.sin(q)+az*Math.cos(q));if(Math.abs(dx*ax+dz*az)>radius(h,shape.halfWidth+margin,(shape.maxZ-shape.minZ)/2+margin)+radius(other.heading,os.halfWidth+margin,(os.maxZ-os.minZ)/2+margin))return false;}return true;
 }
 carBlocked(x,z,h,ignore=null,shape=ignore?.collision||this.hero.collision){return this.agents.some(a=>a!==ignore&&Math.hypot(a.x-x,a.z-z)<8&&this.overlaps(x,z,h,a,.08,shape));}
 pointBlocked(x,z){return this.agents.some(a=>{const dx=x-a.x,dz=z-a.z,c=Math.cos(a.heading),s=Math.sin(a.heading),shape=a.collision,lz=dx*s+dz*c;return Math.abs(dx*c-dz*s)<shape.halfWidth+.20&&lz>shape.minZ-.2&&lz<shape.maxZ+.2;});}
 clear(p,a,player,hero){if(!this.allowed(p.x,p.z,p.heading,a.collision))return false;if(this.carBlocked(p.x,p.z,p.heading,a))return false;
  if(hero&&Math.hypot(p.x-hero.x,p.z-hero.z)<8&&this.overlaps(p.x,p.z,p.heading,hero,.08,a.collision))return false;
  if(player){const dx=player.x-p.x,dz=player.z-p.z,c=Math.cos(p.heading),s=Math.sin(p.heading),lz=dx*s+dz*c;if(Math.abs(dx*c-dz*s)<a.collision.halfWidth+.45&&lz>a.collision.minZ-.45&&lz<a.collision.maxZ+.45)return false;}return true;
 }
 junction(p){const i=Math.round(p.x/80),j=Math.round((p.z+16)/80);return Math.abs(p.x-i*80)<5.5&&Math.abs(p.z-(j*80-16))<5.5?i+','+j:null;}
 place(a){const p=this.sample(a.route,a.s);a.x=p.x;a.z=p.z;a.heading=p.heading;this.pose(a,p,a.distance);
 }
 pose(a,p,distance){a.root.position.set(p.x,a.groundY,p.z);a.root.rotation.y=p.heading;
  const next=a.recovery?.path[Math.min(a.recovery.index+4,a.recovery.path.length-1)]||this.sample(a.route,a.s+1),turn=(next.heading-a.heading+Math.PI*3)%(Math.PI*2)-Math.PI,steer=Math.max(-.44,Math.min(.44,Math.atan(1.88*turn)));for(const w of a.wheels){w.axle.rotation.x=distance/w.radius;w.pivot.rotation.y=w.front?steer:0;}a.root.computeWorldMatrix(true);
  this.actors.placeSeat(a.occupant,a.root);
 }
 update(dt,focus,camera,player,hero){this.recenter(focus);this.time+=dt;this.accumulator=Math.min(.15,this.accumulator+dt);
  while(this.accumulator>=.05){const step=.05;for(const [key,id] of this.locks)if(this.junction(this.agents[id])!==key)this.locks.delete(key);
   for(const a of this.agents){if(a.owned){a.x=a.root.position.x;a.z=a.root.position.z;a.heading=a.root.rotation.y;a.speed=0;continue;}a.previous={x:a.x,z:a.z,heading:a.heading,distance:a.distance};if(a.held){a.speed=0;continue;}if(a.recovery&&!a.held){QuarterTrafficRecovery.update(this,a,step,player,hero);continue;}let target=a.held?0:a.cruise;const ahead=this.sample(a.route,a.s+Math.max(3.8,a.speed*1.5)),junction=this.junction(ahead);if(junction){const owner=this.locks.get(junction);if(owner===undefined){const outlet=this.clear(this.sample(a.route,a.s+18),a,player,hero)&&this.clear(this.sample(a.route,a.s+21),a,player,hero);if(outlet)this.locks.set(junction,a.id);else target=0;}else if(owner!==a.id)target=0;}
    for(let d=1;d<=7;d+=1){const p=this.sample(a.route,a.s+d);if(!this.clear(p,a,player,hero)){target=Math.min(target,Math.max(0,(d-2)*.8));break;}}
    a.speed+=Math.max(-6*step,Math.min(1.8*step,target-a.speed));const nextS=(a.s+a.speed*step)%a.route.length,p=this.sample(a.route,nextS);
    if(this.clear(p,a,player,hero)){a.s=nextS;a.distance+=a.speed*step;this.place(a);}else a.speed=0;
    a.blockedTime=a.held||a.speed>.12?0:(a.blockedTime||0)+step;
    if(!a.held&&a.blockedTime>3&&this.time-(this.lastRecoveryPlan??-100)>.3&&this.time>(a.nextRecovery||0)){a.nextRecovery=this.time+4+(a.id%5)*.2;this.lastRecoveryPlan=this.time;this.recoveryAttempts++;a.recovery=QuarterTrafficRecovery.plan(this,a,player,hero);if(a.recovery)for(const [key,id] of this.locks)if(id===a.id)this.locks.delete(key);}
   }this.accumulator-=step;
  }
  const alpha=this.accumulator/.05;
  for(const a of this.agents){if(!a.owned){const previous=a.previous||a,turn=(a.heading-previous.heading+Math.PI*3)%(Math.PI*2)-Math.PI;this.pose(a,{x:previous.x+(a.x-previous.x)*alpha,z:previous.z+(a.z-previous.z)*alpha,heading:previous.heading+turn*alpha},previous.distance+(a.distance-previous.distance)*alpha);}else{a.x=a.root.position.x;a.z=a.root.position.z;a.heading=a.root.rotation.y;}const visible=Math.hypot(a.x-camera.x,a.z-camera.z)<(this.mobile?58:85);if(visible!==a.visible){a.root.setEnabled(visible);for(const d of a.drivers)d.setEnabled(visible&&a.occupant.occupied);a.visible=visible;}}
 }
 shadowCasters(camera){return this.agents.filter(a=>a.visible&&Math.hypot(a.x-camera.x,a.z-camera.z)<32).flatMap(a=>a.parts.concat(a.drivers));}
 snapshot(){return {recovering:this.agents.filter(a=>a.recovery).length,recovered:this.recovered,recoveryAttempts:this.recoveryAttempts,vehicles:this.agents.length,rickshaws:this.agents.filter(a=>a.kind==='rickshaw').length,cars:this.agents.filter(a=>a.kind==='car').length,carModels:[...new Set(this.agents.filter(a=>a.kind==='car').map(a=>a.name))],visible:this.agents.filter(a=>a.visible).length,moving:this.agents.filter(a=>a.speed>.1).length,sharedGeometry:true,driverPalettes:this.actors.seats.length,driverSource:"NPC models",playerClones:0,owned:this.agents.filter(a=>a.owned).length,decisionsHz:20,junctionReservations:this.locks.size,recycled:this.recycled,routes:[...new Set(this.agents.map(a=>a.route.key))],distance:+this.agents.reduce((n,a)=>n+a.distance,0).toFixed(1)};}
};
