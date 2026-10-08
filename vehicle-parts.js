/* Select movable door/wheel faces conservatively from fused scan meshes.
   All original texture coordinates and source vertex attributes are retained. */
window.QuarterVehicleParts=function(B,v){
 if(v.parts)return v.parts;
 const root=v.root,w=v.width,l=v.length,h=v.height,hinge=new B.TransformNode(v.name+'-driver-door',root.getScene());hinge.parent=root;hinge.position.set(w*.46,h*.34,l*.23);const wheels=[];
 const centers=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([side,front])=>({x:side*w*.43,y:h*(v.name==='bus'?.15:.20),z:front*l*.31,radius:h*(v.name==='bus'?.13:.20),front:front>0}));
 const groups=centers.map((c,i)=>{const pivot=new B.TransformNode(v.name+'-steer-'+i,root.getScene()),axle=new B.TransformNode(v.name+'-spin-'+i,root.getScene());pivot.parent=root;pivot.position.set(c.x,c.y,c.z);axle.parent=pivot;wheels.push({pivot,axle,front:c.front,radius:c.radius});return v.parts={node:axle,indices:[],center:c};});
 let doorTriangles=0,wheelTriangles=0;
 for(const mesh of v.meshes){mesh.unfreezeWorldMatrix();const relative=mesh.computeWorldMatrix(true).multiply(B.Matrix.Invert(root.computeWorldMatrix(true))),positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),indices=mesh.getIndices(),points=[];
  for(let i=0;i<positions.length;i+=3)points.push(B.Vector3.TransformCoordinates(new B.Vector3(positions[i],positions[i+1],positions[i+2]),relative));const body=[],door=[],rims=groups.map(()=>[]);
  for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3),p=Array.from(ids,k=>points[k]),mid=p[0].add(p[1]).add(p[2]).scale(1/3);let group=-1;
   for(let j=0;j<centers.length;j++){const c=centers[j];if(p.every(q=>Math.sign(q.x)===Math.sign(c.x)&&Math.abs(q.x)>w*.36&&Math.hypot(q.y-c.y,q.z-c.z)<c.radius*.65)){group=j;break;}}
   if(group>=0){rims[group].push(...ids);continue;}
   if(p.every(q=>q.x>w*.30&&q.y>h*.29&&q.y<h*.98&&q.z>-l*.11&&q.z<l*.25))door.push(...ids);else body.push(...ids);
  }
  const part=(name,list,parent)=>{if(list.length<30){body.push(...list);return;}const copy=mesh.clone(v.name+'-'+name,null,true);copy.makeGeometryUnique();copy.setIndices(list);copy.parent=parent;const local=relative.multiply(B.Matrix.Invert(parent.computeWorldMatrix(true).multiply(B.Matrix.Invert(root.getWorldMatrix()))));copy.rotationQuaternion=B.Quaternion.Identity();local.decompose(copy.scaling,copy.rotationQuaternion,copy.position);copy.unfreezeWorldMatrix();copy.isPickable=false;copy.receiveShadows=true;};
  doorTriangles+=door.length/3;part('door-panel',door,hinge);rims.forEach((list,i)=>{wheelTriangles+=list.length/3;part('wheel-'+i,list,groups[i].node);});mesh.makeGeometryUnique();mesh.setIndices(body);
 }
 v.parts={door:hinge,wheels,doorTriangles,wheelTriangles};root.collision={halfWidth:w*.46,minZ:-l*.47,maxZ:l*.47};const hipY=v.name==='bus'?1.48:v.name==='white-car'?.74:v.name==='red-car'?.56:.65,seatY=hipY-.94,seatZ=v.name==='bus'?l*.32:v.name==='white-car'?-.08:l*.02;
 root.driver={position:[w*.18,seatY,seatZ],hip:[w*.18,hipY,seatZ],feet:[[w*.18-.12,hipY-.15,seatZ+.60],[w*.18+.12,hipY-.15,seatZ+.60]],profile:v.name,knee:v.name==='bus'?1.37:.60,grips:[[w*.18-.18,hipY+.30,seatZ+.50],[w*.18+.18,hipY+.30,seatZ+.50]]};return v.parts;
};
