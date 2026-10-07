/* Authored buildings share geometry and maps per type. */
window.loadQuarterBuildings=async function({B,scene,shadow,reflectors,paving}){
 const types=[],instances=[];
 await QuarterAssets.load(...[1,2,3].map(n=>'assets/old-building-'+n+'-data.js'));
 for(const number of [1,2,3]){
  const bytes=Uint8Array.from(atob(window['OLD_BUILDING_'+number+'_BASE64']),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));let imported;
  try{imported=await B.SceneLoader.ImportMeshAsync('','',url,scene,undefined,'.glb');}finally{URL.revokeObjectURL(url);}
  const source=imported.meshes.find(m=>m.getTotalVertices()>100);source.name='old-building-'+number+'-shared-source';source.computeWorldMatrix(true);
  const world=source.getWorldMatrix().clone(),box=source.getBoundingInfo().boundingBox,lo=box.minimumWorld.clone(),hi=box.maximumWorld.clone(),material=source.material;
  material.environmentIntensity=.65;material.maxSimultaneousLights=3;material.enableSpecularAntiAliasing=true;source.isVisible=false;source.isPickable=false;
  // Ignore the supplied ground skirt when fitting the actual facade to its lot.
  const positions=source.getVerticesData(B.VertexBuffer.PositionKind);let fitLo=Infinity,fitHi=-Infinity,facadeZ=-Infinity;
  for(let i=0;i<positions.length;i+=3){const p=B.Vector3.TransformCoordinates(B.Vector3.FromArray(positions,i),world);if(p.y>lo.y+(hi.y-lo.y)*.2&&p.y<lo.y+(hi.y-lo.y)*.8){fitLo=Math.min(fitLo,p.x);fitHi=Math.max(fitHi,p.x);facadeZ=Math.max(facadeZ,p.z);}}
  types.push({number,source,world,lo,hi,material,fitWidth:fitHi-fitLo,facadeZ,instances:[]});
 }
 return {
  add(side,z,width,index,number=1){
   const type=types[number-1],{source,world,lo,hi}=type;
   const instance=source.createInstance('old-building-'+number+'-'+side+'-'+index);instance.parent=null;instance.rotationQuaternion=B.Quaternion.Identity();
   const scale=(width+.04)/type.fitWidth,yaw=-side*Math.PI/2;
   const placement=B.Matrix.Compose(new B.Vector3(scale,scale,scale),B.Quaternion.RotationYawPitchRoll(yaw,0,0),new B.Vector3(side*(5.10+hi.z*scale),.08-lo.y*scale,z));
   world.multiply(placement).decompose(instance.scaling,instance.rotationQuaternion,instance.position);
   instance.isPickable=false;instance.receiveShadows=true;instance.metadata={zone:'authored-building',source:'old building '+number+'.glb',side,index};
   instance.freezeWorldMatrix();shadow.addShadowCaster(instance,false);reflectors.push(instance);instances.push(instance);type.instances.push(instance);
   const depth=(hi.z-lo.z)*scale+.25,base=B.MeshBuilder.CreateBox('old-building-foundation-'+side+'-'+index,{width:depth,height:.10,depth:width+.20},scene);
   base.position.set(side*(5.0+depth/2),.03,z);base.material=paving;base.receiveShadows=true;base.isPickable=false;base.freezeWorldMatrix();
   return instance;
  },
  snapshot(){return {instances:instances.length,sharedGeometry:types.every(t=>t.instances.every(m=>m.geometry===t.source.geometry)),sharedMaterial:types.every(t=>t.instances.every(m=>m.material===t.material)),types:types.map(t=>({source:'old building '+t.number+'.glb',instances:t.instances.length,triangles:t.source.getTotalIndices()/3}))};},
  instances,types,source:types[0].source
 };
};
