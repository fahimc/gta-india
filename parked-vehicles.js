/* Four parked vehicles: baked transforms, shared PBR maps, metric collision bounds. */
window.loadQuarterParkedVehicles=async function({B,scene,shadow,reflectors,contactMaterial}){
 await QuarterAssets.load('assets/vehicles-data.js');
 const vehicles=[];
 for(const [name,side,z] of [['blue-car',-1,22],['red-car',1,32],['white-car',-1,44],['bus',1,54.5]]){
  const bytes=Uint8Array.from(atob(window.QUARTER_VEHICLES[name]),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));let imported;
  try{imported=await B.SceneLoader.ImportMeshAsync('','',url,scene,undefined,'.glb');}finally{URL.revokeObjectURL(url);}
  const root=new B.TransformNode('parked-'+name,scene);for(const m of imported.meshes)if(!m.parent)m.parent=root;
  const meshes=imported.meshes.filter(m=>m.getTotalVertices()>0);
  // The hatchback and bus scans have their front at -Z; normalize those only.
  if(name==='white-car'||name==='bus')for(const m of meshes){m.bakeTransformIntoVertices(m.computeWorldMatrix(true).multiply(B.Matrix.RotationY(Math.PI)));m.parent=root;m.position.setAll(0);m.scaling.setAll(1);m.rotationQuaternion=null;m.rotation.setAll(0);}
  let lo=new B.Vector3(Infinity,Infinity,Infinity),hi=lo.negate();
  for(const m of meshes){m.computeWorldMatrix(true);const box=m.getBoundingInfo().boundingBox;lo=B.Vector3.Minimize(lo,box.minimumWorld);hi=B.Vector3.Maximize(hi,box.maximumWorld);m.isPickable=false;m.receiveShadows=true;const material=m.material;material.environmentIntensity=.7;material.maxSimultaneousLights=3;material.enableSpecularAntiAliasing=true;shadow.addShadowCaster(m,false);reflectors.push(m);}
  const width=hi.x-lo.x,length=hi.z-lo.z,x=side*(3.43-width/2);root.position.set(x,.012-lo.y,z);root.rotation.y=side===1?Math.PI:0;root.metadata={zone:'parked-vehicles',source:'vehicles/'+name.replace('-',' ')+'.glb'};root.computeWorldMatrix(true);
  for(const m of meshes){m.computeWorldMatrix(true);m.freezeWorldMatrix();}
  const contact=B.MeshBuilder.CreateGround('parked-contact-'+name,{width:width+.18,height:length+.12},scene);contact.position.set(x,.016,z);contact.material=contactMaterial;contact.isPickable=false;contact.freezeWorldMatrix();
  vehicles.push({name,root,meshes,contact,x,z,width,length,height:hi.y-lo.y,minX:x-width/2,maxX:x+width/2,minZ:z-length/2,maxZ:z+length/2});
 }
 for(const v of vehicles)QuarterVehicleParts(B,v);
 return {vehicles,
  pointBlocked(x,z){return vehicles.some(v=>x>v.minX-.25&&x<v.maxX+.25&&z>v.minZ-.25&&z<v.maxZ+.25);},
  carBlocked(x,z,heading){const c=Math.cos(heading),s=Math.sin(heading);return vehicles.some(v=>[[1,0],[0,1],[c,-s],[s,c]].every(([ax,az])=>Math.abs((x-v.x)*ax+(z-v.z)*az)<Math.abs(ax*c-az*s)*.91+Math.abs(ax*s+az*c)*1.64+Math.abs(ax)*v.width/2+Math.abs(az)*v.length/2+.07));},
  snapshot(){return vehicles.map(v=>({name:v.name,position:[v.x,.012,v.z],width:v.width,length:v.length,height:v.height,triangles:v.meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0),materials:new Set(v.meshes.map(m=>m.material)).size}));}
 };
};
