/* Bounded street reflections: one planar target, one cached local cubemap,
   and a recycled puddle pool. The generated title artwork is never a 3D texture. */
window.QuarterCinematicRendering=class QuarterCinematicRendering {
 constructor({B,scene,camera,mobile,road,water,mask,reflectors,world,crowd,traffic,fleet,sky,vehicles}){
  Object.assign(this,{B,scene,camera,mobile,road,water,reflectors,world,crowd,traffic,fleet,sky});
  this.clock=0;this.lastPool=new B.Vector3(Infinity,0,Infinity);this.lastProbe=this.lastPool.clone();this.wet=false;this.quality=mobile?'balanced':'native';this.puddles=[];this.probeUpdates=0;
  water.roughness=.12;water.metallic=0;water.albedoColor=new B.Color3(.19,.23,.25);water.alpha=.84;water.indexOfRefraction=1.33;
  // Normal is upward; its reflection clip plane points below the surface.
  for(let i=0;i<(mobile?10:22);i++){
   const m=B.MeshBuilder.CreateGround('streamed-water-'+i,{width:1,height:1,subdivisions:1},scene);
   m.material=water;m.isPickable=false;m.setEnabled(false);m.metadata={cinematicWater:true};this.puddles.push(m);
  }
  if(scene.getEngine().webGLVersion>1){
   this.pipeline=new B.DefaultRenderingPipeline('quarter-cinematic-finish',true,scene,[camera]);
   this.pipeline.samples=mobile?1:4;this.pipeline.fxaaEnabled=mobile;
   this.pipeline.bloomThreshold=1.25;this.pipeline.bloomWeight=.13;this.pipeline.bloomKernel=32;this.pipeline.bloomScale=.35;
   this.pipeline.bloomEnabled=!mobile;this.pipeline.imageProcessingEnabled=true;
   const prepass=scene.prePassRenderer;if(prepass)prepass.disableGammaTransform=true;
  }
  this.vehicleMeshes=new Set(vehicles.flat());
  this.vehicleMaterials=new Set([...this.vehicleMeshes].map(m=>m.material).filter(m=>m?.getClassName?.()==='PBRMaterial'));
  for(const material of this.vehicleMaterials){
   material.enableSpecularAntiAliasing=true;
   // Authored maps keep rust/rubber detail; a restrained outer wet/paint layer.
   material.clearCoat.isEnabled=true;material.clearCoat.intensity=.22;material.clearCoat.roughness=.22;
  }
  if(!mobile&&scene.getEngine().webGLVersion>1){
   this.probe=new B.ReflectionProbe('local-street-specular',256,scene,true,false);
   this.probe.renderList=[];
   this.probe.refreshRate=B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
   this.probe.cubeTexture.level=.65;this.probe.cubeTexture.gammaSpace=false;
   this.probe.cubeTexture.boundingBoxSize=new B.Vector3(80,30,80);
   for(const material of this.vehicleMaterials)material.reflectionTexture=this.probe.cubeTexture;
  }
  this.setQuality(this.quality);
 }
 setQuality(quality){
  this.quality=quality;const high=quality==='native'&&!this.mobile;
  if(this.pipeline){this.pipeline.bloomEnabled=high;this.pipeline.samples=high?4:1;this.pipeline.fxaaEnabled=!high;this.pipeline.removeCamera(this.camera);this.pipeline.addCamera(this.camera);}
  if(this.mirror){const size=high?1024:this.mobile?(quality==='native'?512:256):512;if(this.mirror.getSize().width!==size)this.mirror.resize(size);this.mirror.refreshRate=high?1:this.mobile&&quality==='native'?2:3;this.mirror.adaptiveBlurKernel=high?3:5;}
  if(this.probe){for(const material of this.vehicleMaterials)material.reflectionTexture=high?this.probe.cubeTexture:null;}
 }
 setWet(wet){
  this.wet=wet;
  if(wet&&!this.mirror){
   const B=this.B;this.mirror=new B.MirrorTexture('street-water-planar',512,this.scene,true);
   this.mirror.mirrorPlane=new B.Plane(0,-1,0,.026);this.mirror.level=.95;this.mirror.renderList=[];
   this.water.reflectionTexture=this.mirror;this.setQuality(this.quality);
  }
  this.road.roughness=wet?.54:.94;this.road.albedoColor=wet?new this.B.Color3(.68,.70,.71):this.B.Color3.White();
  this.road.clearCoat.isEnabled=wet;this.road.clearCoat.intensity=.32;this.road.clearCoat.roughness=.28;
  this.lastPool.set(Infinity,0,Infinity);if(!wet)this.puddles.forEach(m=>m.setEnabled(false));
  if(this.mirror)this.mirror.refreshRate=wet?(this.quality==='native'&&!this.mobile?1:3):0;
 }
 staticList(focus){
  return [...new Set(this.reflectors.concat(this.world.shadowCasters(focus)))].filter(m=>!m.isDisposed()&&m.isEnabled()&&m.isVisible!==false&&this.B.Vector3.Distance(m.getBoundingInfo().boundingBox.centerWorld,focus)<58);
 }
 update(focus,dt,frame){
  this.clock+=dt;
  if(this.wet&&this.B.Vector3.DistanceSquared(focus,this.lastPool)>16){
   this.lastPool.copyFrom(focus);const candidates=[];
   // Map roads are x=80*n and z=80*n-16. Positions repeat deterministically.
   for(const vertical of [true,false]){
    const axis=vertical?focus.x:focus.z+16,along=vertical?focus.z:focus.x;
    for(let lane=Math.round(axis/80)-1;lane<=Math.round(axis/80)+1;lane++)for(let k=Math.floor(along/12)-4;k<=Math.floor(along/12)+4;k++){
     const hash=((Math.imul(lane,73856093)^Math.imul(k,19349663)^(vertical?91:311))>>>0),side=hash%2?1:-1;
     const a=lane*80-(vertical?0:16)+side*(1.0+(hash%53)/100),b=k*12+2+(hash%31)/10;
     const x=vertical?a:b,z=vertical?b:a,d=Math.hypot(x-focus.x,z-focus.z);
     if(d<43&&this.world.roadAt(x,z)&&!this.world.pavementAt(x,z))candidates.push({x,z,d,hash,vertical});
     const x2=vertical?lane*80-side*(1.0+(hash%53)/100):x+5.7,z2=vertical?z+5.7:lane*80-16-side*1.45,d2=Math.hypot(x2-focus.x,z2-focus.z);
     if(d2<43&&this.world.roadAt(x2,z2)&&!this.world.pavementAt(x2,z2))candidates.push({x:x2,z:z2,d:d2,hash:hash^157,vertical});
    }
   }
   candidates.sort((a,b)=>a.d-b.d);
   this.puddles.forEach((m,i)=>{const c=candidates[i];m.setEnabled(!!c);if(!c)return;const width=1.4+(c.hash%31)/100,length=3.9+(c.hash%23)/10;m.position.set(c.x,.026,c.z);m.scaling.set(c.vertical?width:length,1,c.vertical?length:width);m.rotation.y=(c.hash%17-8)*.015;});
  }
  if(frame%15===0&&this.wet){
   const staticMeshes=this.staticList(focus),actors=this.crowd.shadowCasters(focus).concat(this.traffic.shadowCasters(focus),this.fleet.shadowCasters(focus));
   this.mirror.renderList=[...new Set([this.sky,...staticMeshes,...actors])].filter(m=>!m.isDisposed()).slice(0,this.mobile?100:220);
  }
  // Six cubemap views are cached until entering another 16 m neighbourhood.
  if(this.probe&&this.quality==='native'&&frame%45===0&&(this.B.Vector3.DistanceSquared(focus,this.lastProbe)>256)){
   this.lastProbe.copyFrom(focus);this.probe.position.set(focus.x,1.6,focus.z);
   this.probe.cubeTexture.boundingBoxPosition=this.probe.position.clone();
   const vehicleMeshes=new Set(this.traffic.agents.flatMap(a=>a.parts));
   this.probe.renderList=this.staticList(focus).filter(m=>!this.vehicleMeshes.has(m)&&!vehicleMeshes.has(m)).slice(0,90).concat(this.sky);
   this.probe.cubeTexture.resetRefreshCounter();this.probeUpdates++;
  }
 }
 snapshot(){return {quality:this.quality,wet:this.wet,puddlePool:this.puddles.length,visiblePuddles:this.puddles.filter(m=>m.isEnabled()).length,reflectionSize:this.mirror?.getSize().width||0,reflectionMeshes:this.mirror?.renderList.length||0,probeUpdates:this.probeUpdates,probeSize:this.probe?256:0,bloom:!!this.pipeline?.bloomEnabled};}
};
