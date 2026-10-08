/* Bounded, instanced left-hand traffic on the same streamed street grid.
   Fixed steps, junction reservations, swept footprint tests and queue braking. */
window.QuarterTraffic=class QuarterTraffic {
 static async create(ctx){const t=new this(ctx);await t.load();return t;}
 constructor(ctx){Object.assign(this,ctx);this.agents=[];this.time=0;this.accumulator=0;this.locks=new Map();this.recycled=0;}
 async load(){const {B,scene,hero}=this;
  const driverOrigin=new B.TransformNode('shared-traffic-driver-origin',scene);driverOrigin.driver=hero.driver;
  const contact=this.crowd.shadowSource.createInstance('traffic-driver-hidden-contact');
  this.driver=await QuarterPlayerCharacter.create({B,scene,hero:driverOrigin,contact});this.driver.update(B.Vector3.Zero(),0,0,0,false);contact.setEnabled(false);
  this.driverParts=this.driver.meshes.map(m=>{m.computeWorldMatrix(true);const world=m.getWorldMatrix().clone();m.isVisible=false;return {mesh:m,world};});
  for(let id=0;id<(this.mobile?12:24);id++){
   const root=new B.TransformNode('traffic-rickshaw-'+id,scene),map=new Map([[hero,root]]),parts=[];
   const copy=(source,parent)=>{for(const node of source.getChildren(undefined,true)){
    const m=node.getTotalVertices?.()>0?node.createInstance('traffic-'+id+'-'+node.name):new B.TransformNode('traffic-'+id+'-'+node.name,scene);m.parent=parent;m.position.copyFrom(node.position);m.scaling.copyFrom(node.scaling);m.rotation.copyFrom(node.rotation);if(node.rotationQuaternion)m.rotationQuaternion=node.rotationQuaternion.clone();m.isPickable=false;map.set(node,m);if(node.getTotalVertices?.()>0){m.receiveShadows=true;parts.push(m);}copy(node,m);
   }};copy(hero,root);
   const wheels=this.autoWheels.map(w=>({axle:map.get(w.axle),pivot:map.get(w.pivot),radius:w.radius,front:w.front}));
   const drivers=this.driverParts.map(p=>{const m=p.mesh.createInstance('traffic-driver-'+id);m.parent=null;m.rotationQuaternion=B.Quaternion.Identity();m.isPickable=false;m.receiveShadows=true;return m;});
   this.agents.push({id,root,parts,drivers,wheels,speed:0,cruise:3.2+(id%5)*.23,s:0,x:0,z:0,heading:0,distance:0,visible:true,route:null});
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
  for(const a of this.agents)if(!routes.includes(a.route)){a.route=null;}
  for(const a of this.agents)if(!a.route){const route=routes.reduce((best,r)=>this.agents.filter(a=>a.route===r).length<this.agents.filter(a=>a.route===best).length?r:best,routes[0]),ss=this.agents.filter(b=>b.route===route).map(b=>b.s).sort((a,b)=>a-b);let s=route.length*.08,gap=0;
   for(let k=0;k<ss.length;k++){const g=(k+1<ss.length?ss[k+1]:ss[0]+route.length)-ss[k];if(g>gap){gap=g;s=(ss[k]+g/2)%route.length;}}a.route=route;a.s=s;a.speed=0;
   for(let k=0;k<Math.ceil(route.length/7);k++){const p=this.sample(route,a.s),parked=this.parked.carBlocked(p.x,p.z,p.heading),occupied=this.agents.some(b=>b!==a&&b.route&&this.overlaps(p.x,p.z,p.heading,b)),hero={x:this.hero.position.x,z:this.hero.position.z,heading:this.hero.rotation.y};if(!parked&&!occupied&&!this.overlaps(p.x,p.z,p.heading,hero,.35))break;a.s=(a.s+7)%route.length;}
   this.place(a);a.previous={x:a.x,z:a.z,heading:a.heading,distance:a.distance};this.recycled++;
  }
 }
 overlaps(x,z,h,other,margin=.16){const axes=[[Math.cos(h),-Math.sin(h)],[Math.sin(h),Math.cos(h)],[Math.cos(other.heading),-Math.sin(other.heading)],[Math.sin(other.heading),Math.cos(other.heading)]],dx=other.x-x,dz=other.z-z;
  for(const [ax,az] of axes){const radius=q=>(.91+margin)*Math.abs(ax*Math.cos(q)-az*Math.sin(q))+(1.64+margin)*Math.abs(ax*Math.sin(q)+az*Math.cos(q));if(Math.abs(dx*ax+dz*az)>radius(h)+radius(other.heading))return false;}return true;
 }
 carBlocked(x,z,h,ignore=null){return this.agents.some(a=>a!==ignore&&Math.hypot(a.x-x,a.z-z)<5&&this.overlaps(x,z,h,a));}
 pointBlocked(x,z){return this.agents.some(a=>{const dx=x-a.x,dz=z-a.z,c=Math.cos(a.heading),s=Math.sin(a.heading);return Math.abs(dx*c-dz*s)<1.20&&Math.abs(dx*s+dz*c)<1.95;});}
 clear(p,a,player,hero){if(!this.allowed(p.x,p.z,p.heading))return false;if(this.carBlocked(p.x,p.z,p.heading,a))return false;
  if(hero&&Math.hypot(p.x-hero.x,p.z-hero.z)<6&&this.overlaps(p.x,p.z,p.heading,hero,.25))return false;
  if(player){const dx=player.x-p.x,dz=player.z-p.z,c=Math.cos(p.heading),s=Math.sin(p.heading);if(Math.abs(dx*c-dz*s)<1.45&&Math.abs(dx*s+dz*c)<2.25)return false;}return true;
 }
 junction(p){const i=Math.round(p.x/80),j=Math.round((p.z+16)/80);return Math.abs(p.x-i*80)<5.5&&Math.abs(p.z-(j*80-16))<5.5?i+','+j:null;}
 place(a){const p=this.sample(a.route,a.s);a.x=p.x;a.z=p.z;a.heading=p.heading;this.pose(a,p,a.distance);
 }
 pose(a,p,distance){a.root.position.set(p.x,0,p.z);a.root.rotation.y=p.heading;
  const next=this.sample(a.route,a.s+1),turn=(next.heading-a.heading+Math.PI*3)%(Math.PI*2)-Math.PI,steer=Math.max(-.44,Math.min(.44,Math.atan(1.88*turn)));for(const w of a.wheels){w.axle.rotation.x=distance/w.radius;w.pivot.rotation.y=w.front?steer:0;}a.root.computeWorldMatrix(true);
  this.driverParts.forEach((p,i)=>p.world.multiply(a.root.getWorldMatrix()).decompose(a.drivers[i].scaling,a.drivers[i].rotationQuaternion,a.drivers[i].position));
 }
 update(dt,focus,camera,player,hero){this.recenter(focus);this.time+=dt;this.accumulator=Math.min(.15,this.accumulator+dt);
  while(this.accumulator>=.05){const step=.05;for(const [key,id] of this.locks)if(this.junction(this.agents[id])!==key)this.locks.delete(key);
   for(const a of this.agents){a.previous={x:a.x,z:a.z,heading:a.heading,distance:a.distance};let target=a.cruise;const ahead=this.sample(a.route,a.s+Math.max(3.8,a.speed*1.5)),junction=this.junction(ahead);if(junction){const owner=this.locks.get(junction);if(owner===undefined){const outlet=this.clear(this.sample(a.route,a.s+18),a,player,hero)&&this.clear(this.sample(a.route,a.s+21),a,player,hero);if(outlet)this.locks.set(junction,a.id);else target=0;}else if(owner!==a.id)target=0;}
    for(let d=1;d<=7;d+=1){const p=this.sample(a.route,a.s+d);if(!this.clear(p,a,player,hero)){target=Math.min(target,Math.max(0,(d-2)*.8));break;}}
    a.speed+=Math.max(-6*step,Math.min(1.8*step,target-a.speed));const nextS=(a.s+a.speed*step)%a.route.length,p=this.sample(a.route,nextS);
    if(this.clear(p,a,player,hero)){a.s=nextS;a.distance+=a.speed*step;this.place(a);}else a.speed=0;
   }this.accumulator-=step;
  }
  const alpha=this.accumulator/.05;
  for(const a of this.agents){const previous=a.previous||a,turn=(a.heading-previous.heading+Math.PI*3)%(Math.PI*2)-Math.PI;this.pose(a,{x:previous.x+(a.x-previous.x)*alpha,z:previous.z+(a.z-previous.z)*alpha,heading:previous.heading+turn*alpha},previous.distance+(a.distance-previous.distance)*alpha);const visible=Math.hypot(a.x-camera.x,a.z-camera.z)<(this.mobile?58:85);if(visible!==a.visible){a.root.setEnabled(visible);for(const d of a.drivers)d.setEnabled(visible);a.visible=visible;}}
 }
 shadowCasters(camera){return this.agents.filter(a=>a.visible&&Math.hypot(a.x-camera.x,a.z-camera.z)<32).flatMap(a=>a.parts.concat(a.drivers));}
 snapshot(){return {vehicles:this.agents.length,visible:this.agents.filter(a=>a.visible).length,moving:this.agents.filter(a=>a.speed>.1).length,sharedGeometry:true,driverPalettes:1,decisionsHz:20,junctionReservations:this.locks.size,recycled:this.recycled,routes:[...new Set(this.agents.map(a=>a.route.key))],distance:+this.agents.reduce((n,a)=>n+a.distance,0).toFixed(1)};}
};
