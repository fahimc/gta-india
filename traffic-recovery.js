/* Bounded hybrid A*: forward/reverse bicycle arcs, swept real footprints.
   Searches only when a vehicle stalls; normal queues remain cheap fixed steps. */
window.QuarterTrafficRecovery={
 plan(traffic,a,player,hero){
  const goals=[{route:a.route,s:(a.s+14)%a.route.length}];
  for(const route of [...new Map(traffic.agents.map(b=>[b.route.key,b.route])).values()])if(route!==a.route){let nearest=null;for(let s=0;s<route.length;s+=3){const p=traffic.sample(route,s),d=Math.hypot(p.x-a.x,p.z-a.z);if(!nearest||d<nearest.d)nearest={s,d};}if(nearest.d<12)goals.push({route,s:(nearest.s+12)%route.length});}
  for(const goal of goals.slice(0,3)){const target=traffic.sample(goal.route,goal.s),path=this.search(traffic,a,target,player,hero);if(path)return {path,index:0,goal,blocked:0};}return null;
 },
 search(t,a,goal,player,hero){
  const angle=(x,y)=>(x-y+Math.PI*3)%(Math.PI*2)-Math.PI,key=p=>Math.round(p.x/.6)+','+Math.round(p.z/.6)+','+Math.round(((p.heading+Math.PI*2)%(Math.PI*2))/(Math.PI/12)),heap=[],costs=new Map(),wheelbase=a.kind==='car'?(a.collision.maxZ-a.collision.minZ)*.60:1.88;
  const push=n=>{heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].score<=n.score)break;heap[i]=heap[p];i=p;}heap[i]=n;},pop=()=>{const n=heap[0],tail=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[c].score>=tail.score)break;heap[i]=heap[c];i=c;}heap[i]=tail;}return n;},heuristic=p=>Math.hypot(p.x-goal.x,p.z-goal.z)+Math.abs(angle(p.heading,goal.heading));
  const start={x:a.x,z:a.z,heading:a.heading,cost:0,parent:null,segment:[]};start.score=heuristic(start);push(start);costs.set(key(start),0);
  for(let expanded=0;heap.length&&expanded<1400;expanded++){
   const n=pop();if(n.cost>(costs.get(key(n))??Infinity)+.001)continue;
   const distance=Math.hypot(n.x-goal.x,n.z-goal.z);
   if(distance<.70&&Math.abs(angle(n.heading,goal.heading))<.32){const segments=[];for(let p=n;p.parent;p=p.parent)segments.push(p.segment);const path=segments.reverse().flat();for(let k=1;k<=7;k++){const p={x:n.x+(goal.x-n.x)*k/7,z:n.z+(goal.z-n.z)*k/7,heading:n.heading+angle(goal.heading,n.heading)*k/7};if(!t.clear(p,a,player,hero))return null;path.push(p);}return path;}
   for(const direction of [1,-1])for(const steer of [0,-.55,.55]){
    let p={x:n.x,z:n.z,heading:n.heading},valid=true;const segment=[];
    for(let k=0;k<7;k++){const step=direction*.15,h=p.heading+step/wheelbase*Math.tan(steer);p={x:p.x+Math.sin(h)*step,z:p.z+Math.cos(h)*step,heading:h,reverse:direction<0};if(Math.hypot(p.x-a.x,p.z-a.z)>23||!t.clear(p,a,player,hero)){valid=false;break;}segment.push(p);}
    if(!valid)continue;const cost=n.cost+1.05*(direction<0?1.8:1)+Math.abs(steer)*.15,k=key(p);if(cost>=(costs.get(k)??Infinity))continue;costs.set(k,cost);push({...p,cost,parent:n,segment,score:cost+heuristic(p)});
   }
  }return null;
 },
 update(t,a,dt,player,hero){const r=a.recovery;let budget=dt*1.55,moved=0;
  while(budget>0&&r.index<r.path.length){const goal=r.path[r.index],d=Math.hypot(goal.x-a.x,goal.z-a.z);if(d<.001){r.index++;continue;}const step=Math.min(d,budget),blend=step/d,turn=(goal.heading-a.heading+Math.PI*3)%(Math.PI*2)-Math.PI,p={x:a.x+(goal.x-a.x)*blend,z:a.z+(goal.z-a.z)*blend,heading:a.heading+turn*blend};if(!t.clear(p,a,player,hero))break;a.x=p.x;a.z=p.z;a.heading=p.heading;a.distance+=goal.reverse?-step:step;moved+=step;budget-=step;if(step>=d-.00001)r.index++;}
  a.speed=moved/dt;r.blocked=moved>.001?0:r.blocked+dt;a.root.position.set(a.x,a.groundY,a.z);a.root.rotation.y=a.heading;
  if(r.index>=r.path.length){a.route=r.goal.route;a.s=r.goal.s;a.recovery=null;a.blockedTime=0;t.recovered++;}
  else if(r.blocked>2&&t.time>(a.nextRecovery||0)&&t.time-(t.lastRecoveryPlan??-100)>.3){
   // Keep the current pose while waiting: returning to the old route here
   // would teleport a partly completed detour through its obstacle.
   a.nextRecovery=t.time+2;t.lastRecoveryPlan=t.time;t.recoveryAttempts++;
   const next=this.plan(t,a,player,hero);if(next)a.recovery=next;
  }
 }
};
