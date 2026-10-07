/* Authored scan, reduced offline to a runtime triangle budget. */
window.loadQuarterRickshaw=async function({B,scene,shadow,reflectors,autoWheels}){
 await QuarterAssets.load('assets/rickshaw-data.js');
 const bytes=Uint8Array.from(atob(window.RICKSHAW_BASE64),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));let imported;
 try{imported=await B.SceneLoader.ImportMeshAsync('','',url,scene,undefined,'.glb');}finally{URL.revokeObjectURL(url);}
 const root=new B.TransformNode('hero-auto-rickshaw',scene),visual=new B.TransformNode('rickshaw-authored-normalized',scene);visual.parent=root;
 root.position.set(.37,0,4.15);root.rotation.y=-.035;root.metadata={zone:'rickshaw',dynamic:true,source:'rickshaw.glb'};
 for(const m of imported.meshes)if(!m.parent)m.parent=visual;
 const parts=imported.meshes.filter(m=>m.getTotalVertices()>0);let lo=new B.Vector3(Infinity,Infinity,Infinity),hi=lo.negate();
 for(const m of parts){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;lo=B.Vector3.Minimize(lo,b.minimumWorld);hi=B.Vector3.Maximize(hi,b.maximumWorld);}
 // Bounds above include the spawn translation; normalize in the root's local space.
 const scale=2.35/(hi.y-lo.y);visual.scaling.setAll(scale);visual.position.y=-lo.y*scale;
 for(const m of parts){m.isPickable=false;m.receiveShadows=true;m.material.environmentIntensity=.7;m.material.maxSimultaneousLights=3;m.material.enableSpecularAntiAliasing=true;m.material.backFaceCulling=false;shadow.addShadowCaster(m,false);reflectors.push(m);}
 const centers=[[-.235,.093,-.315],[.235,.093,-.315],[0,.100,.393]];
 for(let i=0;i<3;i++){
  const m=parts.find(m=>m.name==='rickshaw-wheel-'+(i+1));if(!m)continue;
  const point=new B.Vector3(...centers[i]);
  // Convert from authored glTF mesh coordinates into the game's vehicle frame.
  const relative=m.computeWorldMatrix(true).multiply(B.Matrix.Invert(root.computeWorldMatrix(true)));
  m.bakeTransformIntoVertices(relative);m.parent=null;m.position.setAll(0);m.scaling.setAll(1);m.rotationQuaternion=null;m.rotation.setAll(0);
  const center=B.Vector3.TransformCoordinates(point,relative);
  m.bakeTransformIntoVertices(B.Matrix.Translation(-center.x,-center.y,-center.z));
  const pivot=new B.TransformNode('authored-wheel-steer-'+i,scene),axle=new B.TransformNode('authored-wheel-spin-'+i,scene);pivot.parent=root;pivot.position.copyFrom(center);axle.parent=pivot;m.parent=axle;
  autoWheels.push({pivot,axle,front:i===2,radius:(i===2?.100:.093)*scale});
 }
 root.collision={halfWidth:.91,minZ:-1.62,maxZ:1.64};
 root.driver={position:[0,.07,.10],grips:[[-.26,1.32,.60],[.26,1.32,.60]]};
 root.assetInfo={source:'rickshaw.glb',triangles:parts.reduce((n,m)=>n+m.getTotalIndices()/3,0),vertices:parts.reduce((n,m)=>n+m.getTotalVertices(),0),height:2.35};
 return root;
};
