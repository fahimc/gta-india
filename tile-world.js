/* Deterministic 80 m map blocks. Only a 3x3 neighbourhood exists at a time.
   Imported geometry/materials stay cached; streamed instances are disposable.
   Asphalt edges join adjacent blocks exactly, including negative coordinates. */
window.QuarterTileWorld=class QuarterTileWorld {
 constructor({B,scene,buildings,paving,road,wallMats,crowd,mobile,seedLots=[]}){
  Object.assign(this,{B,scene,buildings,paving,road,wallMats,crowd,mobile,seedLots});this.size=80;this.tiles=new Map();this.queue=[];this.generated=0;this.retired=0;this.focus={x:0,z:1};this.signature='';this.lodClock=0;
  this.update(this.focus,0,true);
 }
 key(i,j){return i+','+j;}
 coords(x,z){return [Math.floor(x/80),Math.floor((z+16)/80)];}
 distances(x,z){const wrap=v=>((v+40)%80+80)%80-40;return [Math.abs(wrap(x)),Math.abs(wrap(z+16))];}
 walkable(x,z){const d=this.distances(x,z);return Math.min(...d)<4.85;}
 roadAt(x,z){return Math.min(...this.distances(x,z))<3.48;}
 pavementAt(x,z){const d=this.distances(x,z);return Math.min(...d)>=3.6&&Math.min(...d)<5.2;}
 heightAt(x,z){return this.pavementAt(x,z)?.163:0;}
 random(i,j){let s=(Math.imul(i,73856093)^Math.imul(j,19349663)^40817)>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
 cube(tile,name,w,h,d,x,y,z,material){
  if(!this.sources)this.sources=new Map();const key=[material.uniqueId,w,h,d].join('/');if(!this.sources.has(key)){const u=material.metadata?.texMeters||4,uv=[[w,h],[w,h],[d,h],[d,h],[d,w],[d,w]].map(([a,b])=>new this.B.Vector4(0,0,a/u,b/u));if(material===this.road){const top=new this.B.Vector4(0,0,d/(d>w?24:10.4),w/(w>d?24:10.4));uv[4]=top;uv[5]=top;}const source=this.B.MeshBuilder.CreateBox('tile-template-'+key,{width:w,height:h,depth:d,faceUV:uv},this.scene);source.material=material;source.isVisible=false;source.isPickable=false;this.sources.set(key,source);}
  const n=this.sources.get(key).createInstance('tile-'+tile.key+'-'+name);n.position.set(x,y,z);n.isPickable=false;n.receiveShadows=true;n.freezeWorldMatrix();tile.meshes.push(n);return n;}
 create(i,j){
  const {B}=this,x=i*80,z=j*80-16,t={key:this.key(i,j),i,j,meshes:[],lots:[],hash:[]},rng=this.random(i,j);
  this.cube(t,'foundation',80,.16,80,x+40,-.12,z+40,this.paving);
  // Lower and left edges own the asphalt. Adjacent tiles supply the other edges.
  this.cube(t,'street-north',80,.04,7.2,x+40,-.025,z,this.road);this.cube(t,'street-west',7.2,.04,80,x,-.025,z+40,this.road);
  for(const edge of [0,1,2,3]){
   const vertical=edge<2,axis=vertical?x+(edge===0?4.4:75.6):z+(edge===2?4.4:75.6);
   this.cube(t,'pavement-'+edge,vertical?1.6:69.6,.19,vertical?69.6:1.6,vertical?axis:x+40,.065,vertical?z+40:axis,this.paving);
   this.cube(t,'curb-'+edge,vertical?.12:69.6,.23,vertical?69.6:.12,vertical?x+(edge===0?3.62:76.38):x+40,.045,vertical?z+40:z+(edge===2?3.62:76.38),this.paving);
   // Every block edge is a frontage interval. Seed facades occupy intervals
   // on the same map; the remaining intervals receive procedural neighbours.
   const seedEdge=j===0&&((i===0&&edge===0)||(i===-1&&edge===1)),seedSide=i===0?1:-1,axisStart=vertical?z:x;
   const occupied=seedEdge?this.seedLots.filter(p=>p.side===seedSide).map(p=>[Math.max(5.2,p.start-axisStart),Math.min(74.8,p.end-axisStart)]).filter(p=>p[1]>p[0]).sort((a,b)=>a[0]-b[0]):[];
   const spans=[];let cursor=5.2;for(const [start,end] of occupied){if(start>cursor+.35)spans.push([cursor,start]);cursor=Math.max(cursor,end);}if(cursor<74.8-.35)spans.push([cursor,74.8]);
   let n=0;for(const [start,end] of spans){const count=Math.max(1,Math.ceil((end-start)/8.7)),width=(end-start)/count;
    for(let k=0;k<count;k++,n++){
     const number=1+Math.floor(rng()*3),along=start+(k+.5)*width,side=edge===0||edge===2?1:-1;
     const type=this.buildings.types[number-1],instance=type.source.createInstance('tile-'+t.key+'-building-'+edge+'-'+n);instance.parent=null;instance.rotationQuaternion=B.Quaternion.Identity();
     const frontX=vertical?x+(edge===1?80:0)+side*5.30:x+along,frontZ=vertical?z+along:z+(edge===3?80:0)+side*5.30;
     const scale=this.buildings.place(type,instance,frontX,frontZ,vertical?-side:0,vertical?0:-side,width+.10);instance.freezeWorldMatrix();instance.isPickable=false;instance.receiveShadows=true;instance.setEnabled(false);t.meshes.push(instance);
     // Solid party-wall mass remains behind the scanned frontage at every LOD.
     // The scan is a facade, so its irregular silhouette cannot define occupancy.
     const depth=9,centerX=vertical?frontX+side*(7+depth/2):frontX,centerZ=vertical?frontZ:frontZ+side*(7+depth/2),height=(type.hi.y-type.lo.y)*scale*.85;
     const proxy=this.cube(t,'masonry-'+edge+'-'+n,vertical?depth:width+.18,height,vertical?width+.18:depth,centerX,height/2-.06,centerZ,this.wallMats[number-1]);
     t.lots.push({instance,proxy,x:frontX,z:frontZ,edge,start:axisStart+start+k*width-.09,end:axisStart+start+(k+1)*width+.09});t.hash.push(number);
    }
   }
   // Seed scan rows also need permanent structural backing behind their fronts.
   if(seedEdge)for(const [index,p] of this.seedLots.filter(p=>p.side===seedSide).entries()){
    const start=Math.max(axisStart+5.2,p.start),end=Math.min(axisStart+74.8,p.end);if(end<=start)continue;
    this.cube(t,'seed-party-mass-'+index,9,Math.max(3,p.height*.85),end-start+.18,seedSide*(12.10+4.5),Math.max(3,p.height*.85)/2-.06,(start+end)/2,p.material);
   }
  }
  for(const a of [4.4,75.6])for(const b of [4.4,75.6])this.cube(t,'pavement-corner',1.6,.19,1.6,x+a,.065,z+b,this.paving);
  this.tiles.set(t.key,t);this.generated++;return t;
 }
 route(i,j){const x=i*80,z=j*80-16,points=[],r=1.25,lo=4.2,hi=75.8;
  for(const [cx,cz,start] of [[hi-r,lo+r,-Math.PI/2],[hi-r,hi-r,0],[lo+r,hi-r,Math.PI/2],[lo+r,lo+r,Math.PI]])for(let n=0;n<=8;n++){const a=start+n/8*Math.PI/2;points.push([x+cx+r*Math.cos(a),z+cz+r*Math.sin(a)]);}points.push(points[0]);
  const lengths=[0];for(let k=1;k<points.length;k++)lengths.push(lengths.at(-1)+Math.hypot(points[k][0]-points[k-1][0],points[k][1]-points[k-1][1]));return {key:this.key(i,j),points,lengths,length:lengths.at(-1),pavementY:.163,i,j};
 }
 assignCrowd(position){
  const [i,j]=this.coords(position.x,position.z),candidates=[];for(let a=i-1;a<=i+1;a++)for(let b=j-1;b<=j+1;b++)candidates.push({a,b,d:Math.hypot(a*80+40-position.x,b*80+24-position.z)});candidates.sort((a,b)=>a.d-b.d);
  const selected=candidates.slice(0,4),keys=selected.map(c=>this.key(c.a,c.b));if(keys.join('|')===this.crowdKeys)return;this.crowdKeys=keys.join('|');
  const old=this.crowd.routes, routes=selected.map(c=>old.find(r=>r.key===this.key(c.a,c.b))||this.route(c.a,c.b));this.crowd.routes=routes;this.crowd.world=this;
  const reassigned=[];for(const a of this.crowd.agents)if(!routes.includes(a.route))reassigned.push(a);
  for(const a of reassigned){const route=routes.reduce((best,r)=>this.crowd.agents.filter(a=>a.route===r).length<this.crowd.agents.filter(a=>a.route===best).length?r:best,routes[0]);a.route=route;const existing=this.crowd.agents.filter(b=>b!==a&&b.route===route);
   // Fill the largest empty arc, preserving pedestrians on retained blocks.
   const ss=existing.map(b=>b.s).sort((a,b)=>a-b);let s=route.length*.12,gap=0;for(let k=0;k<ss.length;k++){const g=(k+1<ss.length?ss[k+1]:ss[0]+route.length)-ss[k];if(g>gap){gap=g;s=(ss[k]+g/2)%route.length;}}a.s=s;a.role="walk";a.social=null;a.group=null;this.crowd.place(a,0);}
  this.crowd.setupSocial();
 }
 update(position,dt=0,immediate=false){
  this.focus={x:position.x,z:position.z};const [i,j]=this.coords(position.x,position.z),signature=this.key(i,j);
  if(signature!==this.signature){this.signature=signature;const wanted=new Set();for(let a=i-1;a<=i+1;a++)for(let b=j-1;b<=j+1;b++)wanted.add(this.key(a,b));
   for(const [key,t] of this.tiles)if(!wanted.has(key)){for(const m of t.meshes)m.dispose();this.tiles.delete(key);this.retired++;}
   this.queue=[...wanted].filter(key=>!this.tiles.has(key)).map(key=>key.split(',').map(Number)).sort((a,b)=>Math.hypot(a[0]*80+40-position.x,a[1]*80+24-position.z)-Math.hypot(b[0]*80+40-position.x,b[1]*80+24-position.z));this.assignCrowd(position);
  }
  if(immediate){while(this.queue.length)this.create(...this.queue.shift());}else if(this.queue.length)this.create(...this.queue.shift());
  this.lodClock+=dt;if(this.lodClock>.2||immediate||this.queue.length){this.lodClock=0;for(const t of this.tiles.values())for(const lot of t.lots){const near=Math.hypot(lot.x-position.x,lot.z-position.z)<(this.mobile?42:60);lot.instance.setEnabled(near);lot.proxy.setEnabled(true);}}
 }
 shadowCasters(camera){const out=[];for(const t of this.tiles.values())for(const l of t.lots)if(l.instance.isEnabled()&&Math.hypot(l.x-camera.x,l.z-camera.z)<38)out.push(l.instance);return out;}
 snapshot(){return {tileSize:80,continuousFrontages:true,mapSeed:40817,center:this.signature,activeTiles:this.tiles.size,pendingTiles:this.queue.length,generated:this.generated,retired:this.retired,nearBuildings:[...this.tiles.values()].reduce((n,t)=>n+t.lots.filter(l=>l.instance.isEnabled()).length,0),liveInstances:[...this.tiles.values()].reduce((n,t)=>n+t.meshes.length,0),tiles:[...this.tiles.values()].map(t=>({key:t.key,layout:t.hash.join('')})),npcBlocks:this.crowd.routes.map(r=>r.key),assets:QuarterAssets.snapshot()};}
};
