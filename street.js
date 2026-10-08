
/* Old Quarter, revision 6. Living street. Metres, +Y up, +Z along the lane.
   Procedural street + the user's supplied Faquir model, with shared GPU crowd rigs.
   Texture colour, tangent-space normal and roughness data are NEVER aliased.
   Rendering is WebGL2-first for local Android files; no WebGPU/secure-origin dependency. */
(async function main(){
'use strict';
const el=id=>document.getElementById(id), canvas=el('view');
const boot=window.STREET_BOOT={version:'6.0',started:performance.now(),stage:'starting',events:[],errors:[],decoded:[],gpuReady:[],engineSources:[],frames:0,rendered:0};
const compatibility=location.hash.includes('compat');
let fatal=false,contextLost=false,engineRef=null,loopRef=null,watchdog=null;
const note=(s)=>{boot.events.push({ms:Math.round(performance.now()-boot.started),message:String(s).slice(0,800)});if(boot.events.length>70)boot.events.shift();};
const progress=(s,p)=>{boot.stage=s;el('loadText').textContent=s;el('bar').style.width=p+'%';note(s);};
const yieldUI=()=>new Promise(r=>setTimeout(r,0));
function report(){
 const s=window.STREET;
 const summary={version:boot.version,stage:boot.stage,ready:!!s?.ready,compatibility,engine:window.BABYLON?.Engine?.Version,webGL:s?.engine?.webGLVersion,buffer:s?.engine?[s.engine.getRenderWidth(),s.engine.getRenderHeight()]:null,frames:boot.frames,renderedMeshes:boot.rendered,decoded:boot.decoded,gpuReady:boot.gpuReady,errors:boot.errors,events:boot.events,shaderErrors:s?.shaderErrors||[]};
 el('diagnosticText').textContent=JSON.stringify(summary,null,2);return summary;
}
function fail(error){
 if(fatal)return;fatal=true;clearInterval(watchdog);
 const message=String(error?.message||error);boot.errors.push(message);note('ERROR: '+message);console.error(error);
 if(engineRef&&loopRef)engineRef.stopRenderLoop(loopRef);
 el('loader').classList.remove('gone');el('loader').setAttribute('aria-hidden','false');
 el('loadTitle').textContent='Startup needs attention';el('loadText').textContent=message;
 el('retry').hidden=false;el('compatRetry').hidden=false;el('diagnostics').hidden=false;el('diagnostics').open=true;report();
}
window.addEventListener('error',e=>{if(!window.STREET?.ready)fail(e.error||e.message);else{boot.errors.push(String(e.message).slice(0,500));report();}});
window.addEventListener('unhandledrejection',e=>{if(!window.STREET?.ready)fail(e.reason||'An asynchronous operation failed.');else{boot.errors.push(String(e.reason).slice(0,500));report();}});
el('compatRetry').onclick=()=>{location.hash=compatibility?'':'compat';location.reload();};
el('copyReport').onclick=async()=>{
 const text=JSON.stringify(report(),null,2);
 try{await navigator.clipboard.writeText(text);el('copyReport').textContent='Copied';}
 catch(_){el('diagnostics').hidden=false;el('diagnostics').open=true;const r=document.createRange();r.selectNodeContents(el('diagnosticText'));getSelection().removeAllRanges();getSelection().addRange(r);el('copyReport').textContent='Report selected';}
};
try {
progress('Loading the 3D engine…',6);
async function loadEngine(){
 if(window.BABYLON)return;
 const urls=['https://cdn.jsdelivr.net/npm/babylonjs@9.0.0/babylon.js','https://unpkg.com/babylonjs@9.0.0/babylon.js','https://cdn.babylonjs.com/babylon.js'];
 for(const url of urls){
  if(fatal)throw new Error('Startup cancelled.');boot.engineSources.push(url);note('Engine source: '+url);
  try{await new Promise((resolve,reject)=>{const s=document.createElement('script');let done=false;const finish=e=>{if(done)return;done=true;clearTimeout(timer);if(e){s.remove();reject(e);}else resolve();};const timer=setTimeout(()=>finish(new Error('Connection timed out')),25000);s.src=url;s.onload=()=>finish();s.onerror=()=>finish(new Error('Engine download failed'));document.head.append(s);});if(window.BABYLON)return;}catch(e){console.warn(e.message,url);}
 }
 throw new Error('Babylon.js could not be downloaded. Connect to the internet, then tap Retry. All street textures are already inside this file.');
}
await loadEngine();
const B=BABYLON, V=B.Vector3, C3=B.Color3;
const mobile=matchMedia('(pointer:coarse)').matches;
if(fatal)return;
const engine=engineRef=new B.Engine(canvas,true,{stencil:false,preserveDrawingBuffer:false,premultipliedAlpha:false,alpha:false,powerPreference:'high-performance',disableWebGL2Support:compatibility},false);
note('Babylon '+B.Engine.Version+' / WebGL '+engine.webGLVersion);
canvas.addEventListener('webglcontextlost',ev=>{ev.preventDefault();contextLost=true;el('status').textContent='Graphics context interrupted — waiting for restoration';note('WebGL context lost');});
canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;note('WebGL context restored');const sh=window.STREET?.shadow?.getShadowMap();if(sh)sh.refreshRate=1;el('status').textContent='Graphics restored';});
const scene=new B.Scene(engine);scene.skipPointerMovePicking=true;
const S=window.STREET={version:'6.0',engine,scene,ready:false,errors:boot.errors,shaderErrors:[],seed:271828};
const RENDER={mode:'native',ratio:1};
function resolution(){
 const device=Math.max(1,window.devicePixelRatio||1),cw=Math.max(1,canvas.clientWidth),ch=Math.max(1,canvas.clientHeight);
 // Engine is NOT adapting DPR itself: hardware scaling is the inverse of the desired pixel ratio.
 const requested=RENDER.mode==='native'?device:Math.min(1.5,device);
 const ratio=Math.max(1,Math.min(requested,3,Math.sqrt(3000000/(cw*ch))));
 engine.setHardwareScalingLevel(1/ratio);engine.resize();RENDER.ratio=ratio;
 el('quality').textContent=RENDER.mode==='native'?'Native':'Balanced';
}
resolution();
scene.clearColor=new B.Color4(.65,.73,.77,1);scene.fogMode=B.Scene.FOGMODE_LINEAR;scene.fogStart=52;scene.fogEnd=88;scene.fogColor=new C3(.68,.72,.71);
scene.ambientColor=new C3(.12,.13,.14);
const cam=new B.UniversalCamera('street-camera',new V(.15,3.32,-5.5),scene);
cam.minZ=.08;cam.maxZ=190;cam.fov=.87;cam.fovMode=B.Camera.FOVMODE_VERTICAL_FIXED;cam.setTarget(new V(.4,1.75,8.6));
scene.activeCamera=cam;S.camera=cam;
const ip=scene.imageProcessingConfiguration;ip.toneMappingEnabled=true;ip.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;ip.exposure=1.02;ip.contrast=1.035;ip.vignetteEnabled=false;ip.colorCurvesEnabled=false;
// No blur, DOF, grain, chromatic aberration or image enlargement masquerading as sharpness.
const sun=new B.DirectionalLight('afternoon-sun',new V(.50,-1.05,.47),scene);sun.position=new V(-24,44,-15);sun.intensity=3.15;sun.diffuse=new C3(1,.90,.73);
sun.shadowMinZ=1;sun.shadowMaxZ=120;sun.autoUpdateExtends=false;sun.orthoLeft=-31;sun.orthoRight=31;sun.orthoTop=29;sun.orthoBottom=-29;
const skyLight=new B.HemisphericLight('soft-sky-fill',new V(0,1,0),scene);skyLight.intensity=.84;skyLight.diffuse=new C3(.81,.88,1);skyLight.groundColor=new C3(.39,.34,.26);skyLight.specular=C3.Black();
const shadow=new B.ShadowGenerator(2048,sun);shadow.bias=.00035;shadow.normalBias=.018;
if(engine.webGLVersion>1){shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=B.ShadowGenerator.QUALITY_MEDIUM;}else shadow.usePoissonSampling=true;
shadow.setDarkness(.14);
S.shadow=shadow;
// Decode the embedded files ourselves, in sequence. No relative texture URLs,
// no duplicated asynchronous requests from material clones, no indefinite texture waits.
const tx={};
async function decodeImage(key,data){
 return new Promise((resolve,reject)=>{
  const image=new Image();let done=false;
   const timer=setTimeout(()=>finish(new Error('Embedded image '+key+' did not decode. The HTML may be incomplete; reopen the original project file.')),20000);
  const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);image.onload=image.onerror=null;error?reject(error):resolve(image);};
  image.onload=()=>image.naturalWidth&&image.naturalHeight?finish():finish(new Error('Empty embedded image: '+key));
  image.onerror=()=>finish(new Error('Unable to decode embedded image: '+key));
  image.src=data;
 });
}
const assetEntries=Object.entries(ASSETS);
for(let index=0;index<assetEntries.length;index++){
 const [key,data]=assetEntries[index];progress('Preparing surface '+(index+1)+' / '+assetEntries.length+' · '+key,10+index/assetEntries.length*14);
 const image=await decodeImage(key,data);boot.decoded.push(key);
 if(fatal)return;
 const t=new B.DynamicTexture('embedded-'+key,{width:image.naturalWidth,height:image.naturalHeight},scene,true,B.Texture.TRILINEAR_SAMPLINGMODE);
 const ctx=t.getContext();ctx.drawImage(image,0,0);t.update(true,false);
 t.wrapU=t.wrapV=B.Texture.WRAP_ADDRESSMODE;t.anisotropicFilteringLevel=8;
 t.gammaSpace=!key.endsWith('_n')&&!key.endsWith('_r');t.metadata={embeddedAsset:key};
 if(key==='contact'||key==='puddle'){t.hasAlpha=true;t.wrapU=t.wrapV=B.Texture.CLAMP_ADDRESSMODE;}
 if(!t.isReady())throw new Error('The image '+key+' decoded, but its graphics upload failed. Try Compatibility mode below.');
 boot.gpuReady.push(key);tx[key]=t;await yieldUI();
}
S.textures=tx;
// An embedded, procedurally coloured cube provides reflection/sky fill even with no HDR download.
function makeEnvironment(){
 const size=128,faces=[];
 for(let f=0;f<6;f++){
  const arr=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1;let dx,dy,dz;
   if(f===0){dx=1;dy=-v;dz=-u;}if(f===1){dx=-1;dy=-v;dz=u;}if(f===2){dx=u;dy=1;dz=v;}if(f===3){dx=u;dy=-1;dz=-v;}if(f===4){dx=u;dy=-v;dz=1;}if(f===5){dx=-u;dy=-v;dz=-1;}
   const l=Math.hypot(dx,dy,dz);dx/=l;dy/=l;dz/=l;let rgb;
   if(dy>0){const t=Math.pow(dy,.45);rgb=[224-90*t,221-55*t,202+4*t];}
   else{const t=Math.min(1,-dy*2.5);rgb=[178-82*t,165-78*t,139-64*t];}
   const az=Math.atan2(dx,dz),silhouette=.12+.15*Math.sin(az*5)**2;
   if(dy<silhouette&&dy>-.25){const wave=(Math.sin(az*32)>.65&&Math.sin(dy*85)>.3)?-.20:0;rgb=rgb.map(c=>c*(.63+wave));}
   const dot=dx*(-.40)+dy*.85+dz*(-.34),shine=Math.pow(Math.max(0,dot),220)*110;const i=(y*size+x)*4;
   arr[i]=Math.min(255,rgb[0]+shine);arr[i+1]=Math.min(255,rgb[1]+shine*.87);arr[i+2]=Math.min(255,rgb[2]+shine*.68);arr[i+3]=255;
  }faces.push(arr);
 }
 const env=new B.RawCubeTexture(scene,faces,size,B.Engine.TEXTUREFORMAT_RGBA,B.Engine.TEXTURETYPE_UNSIGNED_BYTE,true,false,B.Texture.TRILINEAR_SAMPLINGMODE);
 env.name='procedural-sky-and-street';env.gammaSpace=true;env.coordinatesMode=B.Texture.CUBIC_MODE;
 // Low-frequency diffuse sky coefficients, deliberately separate from specular sky pixels.
 if(B.SphericalPolynomial){const p=new B.SphericalPolynomial();p.xx=new V(.25,.28,.32);p.yy=new V(.29,.33,.38);p.zz=new V(.25,.28,.32);p.y=new V(.07,.09,.12);env.sphericalPolynomial=p;}
 scene.environmentTexture=env;scene.environmentIntensity=.6;return env;
}
const environment=makeEnvironment();
let seed=S.seed;function rand(a=0,b=1){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return a+(seed/4294967296)*(b-a);}const pick=a=>a[Math.floor(rand(0,a.length))];
const hex=s=>C3.FromHexString(s).toLinearSpace();
const mats={};
function mat(name,color,rough=.85,metal=0,texture=null){
 const m=new B.PBRMaterial(name,scene);m.albedoColor=hex(color);m.metallic=metal;m.roughness=rough;m.environmentIntensity=.55;
 m.emissiveColor=hex(color).scale(.014); // tiny, bounded bounce floor; cannot erase the sun/shadows.
 if(texture){m.albedoTexture=tx[texture];m.bumpTexture=tx[texture+'_n']||null;if(m.bumpTexture)m.bumpTexture.level=.40;m.metadata={texMeters:texture==='brick'?3.4:texture==='paving'?4:3.6};if(tx[texture+'_r']){m.metallicTexture=tx[texture+'_r'];m.useRoughnessFromMetallicTextureGreen=true;m.useRoughnessFromMetallicTextureAlpha=false;m.useMetallnessFromMetallicTextureBlue=false;m.useAmbientOcclusionFromMetallicTextureRed=false;}}
 m.maxSimultaneousLights=3;mats[name]=m;return m;
}
const ivory=mat('chalky-stone','#e0d0ad',.94,0,'plaster'),trim=mat('worn-limestone','#b3a68c',.92,0,'plaster');
const wallMats=['#ded0ad','#e0b499','#bd9580','#aebeb4','#c7b08c','#c6b99e','#d3b8a2'].map((c,i)=>mat('plaster-'+i,c,.93,0,'plaster'));
const dark=mat('recesses','#263330',.96),iron=mat('wrought-iron','#515448',.72,.28),steel=mat('old-steel','#96988b',.52,.55),rust=mat('rust','#8c6144',.90,0,'plaster');
const wood=mat('timber','#d0b188',.88,0,'wood'),paint=mat('teal-paint','#467b70',.75,0,'plaster'),redpaint=mat('oxide-paint','#8d5240',.83,0,'plaster');
const brick=mat('exposed-brick','#dbc7b3',.94,0,'brick'),rubber=mat('rubber','#303331',.88),cream=mat('cream','#ece3c9',.75),roadMat=mat('dust-and-asphalt','#ffffff',.94,0,'road');
roadMat.bumpTexture.level=.24;
const paving=mat('old-paving','#d7d2bf',.91,0,'paving'),glass=mat('old-window-glass','#57746f',.27,.22);
const materialsForCustom=new Map();
function doubleMat(m){
 if(!materialsForCustom.has(m)){
  // Share already-uploaded textures explicitly, instead of serialising/reloading them.
  const c=new B.PBRMaterial(m.name+'-2s',scene);
  for(const key of ['albedoColor','ambientColor','emissiveColor','reflectivityColor','reflectionColor'])if(m[key])c[key]=m[key].clone();
  for(const key of ['albedoTexture','bumpTexture','metallicTexture','ambientTexture','opacityTexture','emissiveTexture','reflectionTexture','environmentBRDFTexture','metallic','roughness','alpha','transparencyMode','environmentIntensity','maxSimultaneousLights','useAlphaFromAlbedoTexture','useRoughnessFromMetallicTextureGreen','useRoughnessFromMetallicTextureAlpha','useMetallnessFromMetallicTextureBlue','useAmbientOcclusionFromMetallicTextureRed'])if(m[key]!==undefined)c[key]=m[key];
  for(const key of ['isEnabled','intensity','roughness'])c.clearCoat[key]=m.clearCoat[key];
  c.metadata=m.metadata;c.backFaceCulling=false;c.twoSidedLighting=true;materialsForCustom.set(m,c);
 }
 return materialsForCustom.get(m);
}
const batches=new Map(),unbatched=[],reflectors=[];let originalMeshes=0;
function queue(mesh,m,parent,cast=true,merge=true){
 mesh.material=m;mesh.isPickable=false;mesh.receiveShadows=true;if(parent)mesh.parent=parent;
 originalMeshes++;
 let moving=parent;while(moving&&!moving.metadata?.dynamic)moving=moving.parent;
 if(merge){const zone=parent?.metadata?.zone||'street';const key=zone+'/'+m.uniqueId+'/'+(cast?'cast':'nocast')+'/'+(moving?.uniqueId||'static');if(!batches.has(key))batches.set(key,{meshes:[],mat:m,cast,zone,moving});batches.get(key).meshes.push(mesh);}else{unbatched.push(mesh);if(cast)shadow.addShadowCaster(mesh,false);}
 return mesh;
}
function box(name,w,h,d,x,y,z,m,parent=null,cast=true){
 const opts={width:w,height:h,depth:d};
 const u=m.metadata?.texMeters;if(u)opts.faceUV=[new B.Vector4(0,0,w/u,h/u),new B.Vector4(0,0,w/u,h/u),new B.Vector4(0,0,d/u,h/u),new B.Vector4(0,0,d/u,h/u),new B.Vector4(0,0,d/u,w/u),new B.Vector4(0,0,d/u,w/u)];
 const a=B.MeshBuilder.CreateBox(name,opts,scene);a.position.set(x,y,z);return queue(a,m,parent,cast);
}
function sphere(name,w,h,d,x,y,z,m,parent=null,cast=true){const a=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:12},scene);a.scaling.set(w,h,d);a.position.set(x,y,z);return queue(a,m,parent,cast);}
function cylinder(name,diam,height,x,y,z,m,parent=null,cast=true,segments=16,top=null){const a=B.MeshBuilder.CreateCylinder(name,{diameter:diam,diameterTop:top??diam,diameterBottom:diam,height,tessellation:segments},scene);a.position.set(x,y,z);return queue(a,m,parent,cast);}
function tube(name,pts,r,m,parent=null,cast=true,sides=6){const a=B.MeshBuilder.CreateTube(name,{path:pts.map(p=>p instanceof V?p:new V(...p)),radius:r,tessellation:sides,cap:B.Mesh.CAP_ALL},scene);return queue(a,m,parent,cast);}
function custom(name,pos,indices,norm,uv,m,parent=null,cast=true){const a=new B.Mesh(name,scene),vd=new B.VertexData();vd.positions=pos;vd.indices=indices;vd.normals=norm||[];if(!norm)B.VertexData.ComputeNormals(pos,indices,vd.normals);vd.uvs=uv||new Array(pos.length/3*2).fill(0);vd.applyToMesh(a);return queue(a,doubleMat(m),parent,cast);}
function panel(name,w,h,x,y,z,m,parent=null,cast=false){const a=B.MeshBuilder.CreatePlane(name,{width:w,height:h,sideOrientation:B.Mesh.DOUBLESIDE},scene);a.position.set(x,y,z);return queue(a,m,parent,cast);}
function rounded(name,w,h,d,r,x,y,z,m,parent=null){
 const half=[w/2,h/2,d/2],inner=half.map(v=>Math.max(.001,v-r)),pos=[],norm=[],uv=[],ind=[],n=4;
 const axes=[[[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]];
 for(const [N,T,U] of axes){const off=pos.length/3;for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
  const p=half.map((v,k)=>v*(N[k]+T[k]*(i/n*2-1)+U[k]*(j/n*2-1))),c=p.map((v,k)=>Math.max(-inner[k],Math.min(inner[k],v))),delta=p.map((v,k)=>v-c[k]),len=Math.hypot(...delta)||1;
  pos.push(...p.map((v,k)=>c[k]+delta[k]/len*r));norm.push(...delta.map(v=>v/len));uv.push(i/n,j/n);
 }for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=off+j*(n+1)+i,b=a+1,c=a+n+2,d=a+n+1;ind.push(a,c,b,a,d,c);}}
 const mesh=custom(name,pos,ind,norm,uv,m,parent);mesh.position.set(x,y,z);return mesh;
}
function sign(name,l1,l2,bg,w,h,x,y,z,parent=null){
 const dt=new B.DynamicTexture(name,{width:1024,height:256},scene,true,B.Texture.TRILINEAR_SAMPLINGMODE),c=dt.getContext();
 c.fillStyle=bg;c.fillRect(0,0,1024,256);c.strokeStyle='#e8d6a4';c.lineWidth=9;c.strokeRect(15,15,994,226);
 c.textAlign='center';c.fillStyle='#fff0c9';c.font='bold 89px Georgia';c.fillText(l1,512,125);c.font='bold 29px Arial';c.fillText(l2,512,192);
 for(let i=0;i<850;i++){c.fillStyle=`rgba(52,38,27,${rand(.02,.16)})`;c.fillRect(rand(0,1024),rand(0,256),rand(1,9),rand(1,3));}
 dt.update(true);dt.anisotropicFilteringLevel=8;
 const m=mat(name+'-ink','#ffffff',.86);m.albedoTexture=dt;
 box(name+'-frame',w+.1,h+.1,.075,x,y,z+.035,wood,parent);
 return panel(name,w,h,x,y,z-.016,m,parent);
}
function clothMaterial(name,c1,c2){
 const dt=new B.DynamicTexture(name,{width:256,height:256},scene,true);const c=dt.getContext();c.fillStyle=c1;c.fillRect(0,0,256,256);c.fillStyle=c2;for(let i=0;i<4;i++)c.fillRect(i*64,0,31,256);
 for(let i=0;i<5000;i++){c.fillStyle=`rgba(63,43,24,${rand(.01,.12)})`;c.fillRect(rand(0,256),rand(0,256),1,3);}dt.update(true);
 const m=mat(name,'#eee2c6',.98);m.albedoTexture=dt;return m;
}
const clothGreen=clothMaterial('canvas-green','#bec4a4','#527467'),clothRed=clothMaterial('canvas-red','#d7cbb4','#985e4a'),roofCloth=mat('weathered-canvas','#77705b',.98,0,'plaster');
function awning(root,width,y,depth,m){
 const p=[],n=[],uv=[],ind=[],nx=14,ny=5;
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/ny;p.push((u-.5)*width,y-.35*v-.11*Math.sin(Math.PI*u),-.08-depth*v);n.push(0,.94,-.34);uv.push(u*3,v);}
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i;ind.push(a,a+1,a+nx+2,a,a+nx+2,a+nx+1);}
 custom('sagging-cloth-awning',p,ind,n,uv,m,root);
 const v=[],vn=[],vu=[],vi=[];for(let i=0;i<=40;i++){const u=i/40,xx=(u-.5)*width,yy=y-.35-.11*Math.sin(Math.PI*u);v.push(xx,yy,-depth-.08,xx,yy-.16-.05*Math.cos(u*Math.PI*20),-depth-.085);vn.push(0,0,-1,0,0,-1);vu.push(u*3,0,u*3,.25);if(i<40){let a=i*2;vi.push(a,a+1,a+3,a,a+3,a+2);}}
 custom('scalloped-awning-valance',v,vi,vn,vu,m,root);
 tube('awning-rim',[[-width/2,y-.36,-depth-.07],[width/2,y-.36,-depth-.07]],.025,iron,root);
 for(const s of [-1,1])tube('awning-brace',[[s*width*.47,y-.7,0],[s*width*.47,y-.35,-depth]],.025,iron,root);
}
function windowUnit(root,x,y,w=1.06,h=1.48,open=false){
 box('window-recess',w+.19,h+.22,.11,x,y,-.046,dark,root,false);
 box('window-inner',w-.03,h-.04,.09,x,y,-.12,glass,root,false);
 for(const s of [-1,1])box('window-jamb',.09,h+.22,.18,x+s*(w/2+.025),y,-.16,trim,root);
 box('stone-lintel',w+.36,.16,.34,x,y+h/2+.13,-.20,ivory,root);
 box('projecting-sill',w+.35,.15,.45,x,y-h/2-.13,-.23,ivory,root);
 box('window-transom',w,.036,.065,x,y+.16,-.20,cream,root,false);box('window-mullion',.04,h,.065,x,y,-.20,cream,root,false);
 if(open){
  for(const s of [-1,1]){const shutter=box('open-louvred-shutter',w*.39,h,.09,x+s*(w*.75),y,-.15,paint,root);shutter.rotation.y=s*.22;for(let k=0;k<8;k++)box('shutter-slat',w*.35,.033,.055,x+s*w*.75,y-h*.42+k*h*.12,-.215,trim,root,false);}
 }else if(rand()<.50){for(let k=0;k<3;k++)box('security-bar',.017,h,.035,x+(k-1)*w*.27,y,-.27,iron,root,false);}
 // Window drip/grime is small, geometrically local, never a full-wall opaque overlay.
}
function balcony(root,w,y){
 box('balcony-slab',w,.19,.98,0,y,-.42,ivory,root);
 box('balcony-fascia',w+.06,.18,.13,0,y-.10,-.92,trim,root);
 tube('balcony-top-rail',[[-w/2,y+1,-.9],[w/2,y+1,-.9]],.028,iron,root);
 tube('balcony-bottom-rail',[[-w/2,y+.2,-.9],[w/2,y+.2,-.9]],.019,iron,root);
 for(let x=-w/2+.1;x<w/2;x+=.19)tube('baluster',[[x,y+.13,-.9],[x,y+.97,-.9]],.015,iron,root,false,5);
 for(const s of [-1,1]){tube('return-rail',[[s*w/2,y+1,-.9],[s*w/2,y+1,.01]],.025,iron,root);tube('balcony-bracket',[[s*w*.35,y-.15,-.65],[s*w*.35,y-.65,0]],.035,iron,root);}
}
function arch(root,x,w,h){
 const r=w/2,spring=h-r;
 box('door-shadow',w,h,.08,x,h/2,.08,dark,root,false);
 // Upper curved silhouette over real recess, and stone voussoirs rather than a rectangle texture.
 const pts=[],ind=[],norm=[],uv=[];
 for(let i=0;i<=28;i++){const a=i/28*Math.PI,xx=x+r*Math.cos(a),yy=spring+r*Math.sin(a);pts.push(xx,yy,-.03,xx,3.22,-.03);norm.push(0,0,-1,0,0,-1);uv.push(xx/3,yy/3,xx/3,3.22/3);if(i<28){let k=i*2;ind.push(k,k+1,k+3,k,k+3,k+2);}}
 custom('arch-spandrel',pts,ind,norm,uv,ivory,root);
 for(let i=0;i<13;i++){const a=(i+.5)/13*Math.PI,rr=r+.115;const stone=box('arched-limestone-block',.215,.245,.26,x+Math.cos(a)*rr,spring+Math.sin(a)*rr,-.08,ivory,root);stone.rotation.z=a-Math.PI/2;}
 for(const s of [-1,1])for(let j=0;j<5;j++)box('arch-jamb-stone',.25,spring/5-.013,.24,x+s*(r+.115),(j+.5)*spring/5,-.08,ivory,root);
 for(const s of [-1,1]){box('arched-door-leaf',w*.45,spring*.97,.07,x+s*w*.235,spring*.49,.0,paint,root,false);for(let k=0;k<3;k++)box('door-wood-panel',w*.39,.33,.033,x+s*w*.235,.27+k*.49,-.054,wood,root,false);}
}
function acUnit(root,x,y){
 box('AC-case',.83,.54,.34,x,y,-.24,cream,root);box('AC-grille',.55,.38,.025,x+.09,y,-.425,iron,root,false);
 const fan=cylinder('AC-fan',.29,.04,x+.11,y,-.454,steel,root,false,20);fan.rotation.x=Math.PI/2;
 for(let i=0;i<6;i++)box('AC-vents',.59,.014,.03,x+.1,y-.15+i*.06,-.48,trim,root,false);
 tube('AC-drain',[[x-.27,y-.2,-.20],[x-.31,y-.7,-.17],[x-.31,y-.95,-.025]],.025,rust,root,false);
}
function shopInside(root,w,kind){
 box('shop-floor',w,.11,2.8,0,.16,1.25,trim,root,false);
 box('interior-back',w,2.9,.19,0,1.60,2.8,wood,root,false);
 for(const s of [-1,1])box('shop-pier',.32,3.23,3.0,s*(w/2-.15),1.62,1.4,ivory,root);
 if(kind%3===0){
  const shutter=mat('shutter-'+kind,'#829789',.68,.12);box('closed-rolling-shutter',w-.6,2.56,.09,0,1.43,.08,shutter,root,false);
  for(let j=0;j<27;j++)box('rolling-shutter-rib',w-.59,.025,.035,0,.22+j*.09,.014,steel,root,false);
 }else{
  box('shop-counter',w*.64,.81,.70,0,.56,.65,wood,root);box('counter-top',w*.68,.09,.77,0,1.0,.63,trim,root);
  for(let row=0;row<3;row++){box('stock-shelf',w*.75,.06,.27,0,.82+row*.59,2.51,wood,root,false);for(let i=0;i<8;i++){const m=pick([cream,paint,redpaint,trim]);cylinder('stock-tin',.13,.21,-w*.31+i*w*.088,.95+row*.59,2.47,m,root,false,8);}}
  for(let i=0;i<7;i++)cylinder('tea-tin',.15,.22,-w*.25+i*.27,1.16,.59,pick([cream,paint,rust]),root,false,10);
 }
}
progress('Building the architecture and shopfronts…',26);
await new Promise(r=>setTimeout(r,30));
const buildingRoots=[],buildingPlots=[];
const authoredBuildings=await loadQuarterBuildings({B,scene,shadow,reflectors,paving});S.buildings=authoredBuildings;
function building(side,z,w,h,index,kind){
 const root=new B.TransformNode('building-'+side+'-'+index,scene);root.position.set(side*(5.15+rand(-.07,.12)),.08,z);root.rotation.y=side*Math.PI/2;root.metadata={zone:'block'+Math.floor((z+7)/16)+'-'+side};buildingRoots.push(root);
 const wm=wallMats[(index+(side>0?2:0))%wallMats.length];
 box('upper-masonry',w,h-3.20,3.15,0,(h+3.20)/2,1.55,wm,root);
 box('base-plinth',w,.28,.22,0,.22,-.025,trim,root);
 if(kind==='arches'){
  box('shop-rear',w,3.15,.3,0,1.65,2.1,wood,root,false);for(const x of [-w*.255,w*.255])arch(root,x,w*.30,2.92);
  for(const x of [-w*.485,0,w*.485])box('arch-pier',.38,3.2,.46,x,1.60,.1,ivory,root);
 }else shopInside(root,w,index);
 box('floor-band',w+.15,.22,.30,0,3.25,-.085,ivory,root);box('roof-cornice',w+.28,.22,3.32,0,h+.05,1.48,ivory,root);
 box('parapet',w+.1,.52,.22,0,h+.35,.03,wm,root);
 for(const s of [-1,1])box('edge-pilaster',.14,h-3.3,.19,s*(w/2-.12),(h+3.35)/2,-.05,trim,root);
 const floors=Math.floor((h-3.8)/2.6),cols=w>6.6?3:2;
 for(let f=0;f<floors;f++){
  const yy=4.53+f*2.6;
  for(let j=0;j<cols;j++)windowUnit(root,(j-(cols-1)/2)*(w*.69/cols*1.25),yy,1.00,1.43,(f+index+j)%3===0);
  if(f===0&&index%2===1)balcony(root,w*.74,yy-.88);
  if(f>0&&index%3===0)box('string-course',w+.04,.11,.12,0,yy-1.1,-.07,ivory,root);
 }
 if(index%2===0)acUnit(root,w*.34,5.25);
 const pipeX=-w/2+.3;tube('rainwater-pipe',[[pipeX,h+.3,-.12],[pipeX,h-.1,-.19],[pipeX,.4,-.19],[pipeX+.22,.24,-.3]],.035,rust,root);
 for(let yy=1;yy<h;yy+=1.7)box('pipe-strap',.11,.045,.07,pipeX,yy,-.21,steel,root,false);
 if(kind!=='arches'){
  const labels=[['OLD TOWN','GENERAL STORES · EST. 1978','#425950'],['CHAI HOUSE','FRESH TEA · COFFEE · SNACKS','#75523d'],['CYCLE WORKS','REPAIRS & SPARES','#365854'],['PAPER & INK','PRINT · COPY · STATIONERY','#5d6965'],['FAMILY STORES','GROCERIES & HOUSEHOLD','#785646']];
  const l=labels[index%labels.length];sign('shop-sign-'+side+'-'+index,...l,w*.80,.66,0,3.0,-.19,root);
  awning(root,w*.88,2.65,index%2?1.16:.83,index%2?clothGreen:clothRed);
 }
 // Ground floor worn masonry fragments are local patches, not albedo used as normals.
 if(index%2===1)box('exposed-brick-patch',.38,1.21,.055,w*.44,.91,-.054,brick,root,false);
 return root;
}
// A compact continuous neighbourhood with shared authored facades.
for(const side of [-1,1]){let z=side===-1?-2.1:-4.7;const widths=side===-1?[6.8,5.8,7.2,5.4,6.8,6.1,6.6]:[7.3,5.6,6.2,7.4,5.8,6.5,7.3];for(let i=0;i<widths.length;i++){
 const w=widths[i],height=i===0?(side===-1?9.2:11.8):rand(9.0,13.1);let instance=null;
 if((side===-1&&[1,4].includes(i))||(side===1&&[2,5].includes(i)))instance=authoredBuildings.add(side,z+w/2,w,i,1);
 else if((side===-1&&[2,5].includes(i))||(side===1&&[1,4].includes(i)))instance=authoredBuildings.add(side,z+w/2,w,i,2);
 else if([3,6].includes(i))instance=authoredBuildings.add(side,z+w/2,w,i,3);
 else building(side,z+w/2,w,height,i,side===-1&&i===0?'arches':'shop');
 buildingPlots.push({side,start:z,end:z+w,height:instance?instance.getBoundingInfo().boundingBox.maximumWorld.y:height,material:wallMats[(i+(side>0?2:0))%wallMats.length]});z+=w+.16;await yieldUI();
}}
// Masonry closes party-wall seams; continuous foundations cover irregular scan skirts.
for(const side of [-1,1]){
 const plots=buildingPlots.filter(p=>p.side===side);
 for(let i=1;i<plots.length;i++){const a=plots[i-1],b=plots[i],height=Math.min(a.height,b.height),gap=b.start-a.end;
  box('building-party-wall',8,height,gap+.48,side*9.45,height/2+.04,(a.end+b.start)/2,a.material,null,true);
 }
 // Extend the paving below every building and behind all joined walls.
 box('continuous-building-foundation',15,.16,92,side*12,.0,24,paving,null,false);
}
box('continuous-world-floor',50,.16,110,0,-.12,24,paving,null,false);
S.buildingPlots=buildingPlots;
// Far corner at the end, not a blank flat wall filling the entire sky.
building(1,46.0,7.2,14.0,7,'shop');
box('far-building-party-wall',8,10,.6,9.45,5,42.5,wallMats[2],null,true);
// Broad road surface with subtle geometry, and explicit metric UV coordinates.
const road=B.MeshBuilder.CreateGround('road',{width:10.4,height:79,subdivisionsX:24,subdivisionsY:100},scene);road.position.z=24;road.material=roadMat;road.receiveShadows=true;road.isPickable=false;
const uvs=road.getVerticesData(B.VertexBuffer.UVKind);for(let i=0;i<uvs.length;i+=2){uvs[i]*=1;uvs[i+1]*=79/24;}road.setVerticesData(B.VertexBuffer.UVKind,uvs);
const pv=road.getVerticesData(B.VertexBuffer.PositionKind);for(let i=0;i<pv.length;i+=3)pv[i+1]=.006*Math.sin(pv[i]*3.7)*Math.cos(pv[i+2]*2.1);road.setVerticesData(B.VertexBuffer.PositionKind,pv);road.refreshBoundingInfo();
for(const side of [-1,1]){
 box('sidewalk',1.59,.19,72.8,side*4.365,.065,24,paving,null,false);
 for(let zz=-11.8;zz<60;zz+=1.18){const curb=box('curb-stone',.19,.23,1.155,side*3.58,.085,zz,trim,null,false);curb.rotation.y=rand(-.012,.012);}
 for(let zz=-5;zz<58;zz+=7.5){box('drain-grate',.34,.028,.66,side*3.31,.02,zz,iron,null,false);for(let k=0;k<8;k++)box('drain-slit',.28,.004,.026,side*3.31,.037,zz-.27+k*.074,dark,null,false);}
}
// Contact cards only below objects; the road and whole buildings are never multiplied to black.
const contactM=new B.StandardMaterial('contact-occlusion',scene);contactM.opacityTexture=tx.contact;
contactM.diffuseColor=C3.Black();contactM.emissiveColor=new C3(.04,.03,.02);contactM.disableLighting=true;contactM.backFaceCulling=false;contactM.alpha=.70;
function contact(x,z,w,d){const p=B.MeshBuilder.CreateGround('contact',{width:w,height:d},scene);p.position.set(x,.025,z);queue(p,contactM,null,false,false);}
function crate(x,z,y=.2,w=.66){
 const r=new B.TransformNode('crate',scene);r.position.set(x,y,z);r.rotation.y=rand(-.28,.28);r.metadata={zone:'props'};
 box('crate-bottom',w,.055,w,0,.035,0,wood,r);
 for(const sx of [-1,1])for(const sz of [-1,1])box('crate-corner',.052,.63,.052,sx*(w/2-.03),.34,sz*(w/2-.03),wood,r);
 for(let j=0;j<4;j++)for(const side of [-1,1]){box('crate-slat',w,.12,.034,0,.10+j*.155,side*w/2,wood,r);box('crate-side',.034,.12,w,side*w/2,.10+j*.155,0,wood,r);}
 contact(x,z,w*1.45,w*1.45);return r;
}
function planter(x,z,scale=1,parent=null){
 const r=new B.TransformNode('planter',scene);r.position.set(x,.2,z);r.scaling.setAll(scale);if(parent)r.parent=parent;r.metadata={zone:'plants'};
 const shape=[new V(.0,0,0),new V(.18,0,0),new V(.27,.42,0),new V(.28,.45,0),new V(.28,.50,0),new V(.23,.50,0),new V(.23,.43,0),new V(0,.10,0)];
 const pot=B.MeshBuilder.CreateLathe('terracotta-pot',{shape,radius:1,tessellation:18,sideOrientation:B.Mesh.DOUBLESIDE},scene);queue(pot,rust,r);
 cylinder('soil',.45,.05,0,.43,0,dark,r,false);
 for(let i=0;i<12;i++){const a=rand(0,Math.PI*2),len=rand(.3,.72),tip=[Math.cos(a)*.32,.55+len*.5,Math.sin(a)*.32];tube('leaf-stalk',[[0,.42,0],[tip[0]*.5,.5+len,tip[2]*.5],tip],.012,iron,r,false,4);
  const leaf=sphere('leaf',.085,.29,.023,tip[0]*.7,.5+len*.77,tip[2]*.7,paint,r,false);leaf.rotation.z=Math.cos(a)*.8;leaf.rotation.y=-a;}
}
crate(-3.09,1.2);crate(-3.02,1.28,.84,.62);crate(-3.3,2.05);crate(3.18,14.0);crate(3.15,15.0);planter(3.16,6.6);planter(-3.25,17.4,.85);planter(3.35,29,.78);
const bagM=mat('bin-bags','#4c554c',.77),paperM=mat('paper','#d2c7ad',.98),clothM=mat('cloth-neutral','#b4ba9f',.97);
for(let i=0;i<28;i++){
 const side=i%2?-1:1,zz=rand(1,49),xx=side*rand(2.98,3.55);if(i%3===0){const a=sphere('tied-refuse-bag',rand(.28,.5),rand(.3,.5),rand(.25,.42),xx,.19,zz,bagM);a.rotation.y=rand(0,6);sphere('bag-knot',.09,.1,.08,xx,.45,zz,bagM,null,false);contact(xx,zz,.65,.65);}
 else{const a=box('discarded-paper',rand(.09,.22),.006,rand(.12,.26),xx,.027,zz,paperM,null,false);a.rotation.y=rand(0,6);a.rotation.x=rand(-.03,.04);}
}
for(let i=0;i<55;i++){const side=pick([-1,1]),zz=rand(-3,53);const a=sphere('grit',rand(.025,.07),rand(.024,.07),rand(.03,.09),side*rand(2.3,3.4),.025,zz,pick([trim,ivory,brick]),null,false);}
// Utility wires use a smooth parabola, never point-by-point random kinks.
function sagWire(z,y,offset=0){const pts=[];for(let i=0;i<=35;i++){const t=i/35;pts.push(new V(-4.45+t*8.9,y-.76*4*t*(1-t),z+offset*Math.sin(Math.PI*t)));}tube('overhead-cable',pts,.012,iron,null,false,5);return pts;}
for(const [zz,yy] of [[3.5,7.7],[15,8.0],[25,7.2],[36,8.4],[46,9.1]]){sagWire(zz,yy,.18);sagWire(zz+.16,yy+.09,.14);}
for(const side of [-1,1]){const pts=[];for(let i=0;i<60;i++)pts.push(new V(side*4.22,6.3-.16*Math.sin(i*.7),-3+i));tube('facade-wiring',pts,.018,iron,null,false,5);}
// A few recognisable shirt silhouettes. No oversized floating rectangle laundry.
for(let k=0;k<5;k++){
 const x=-2.4+k*1.1,z=15.0,y=8-.76*(1-(x/4.45)**2)-.025;
 const outline=[[-.17,0],[-.30,-.07],[-.42,-.28],[-.28,-.36],[-.21,-.22],[-.20,-.70],[.20,-.70],[.21,-.22],[.28,-.36],[.42,-.28],[.30,-.07],[.17,0]];
 const p=[x,y-.34,z],n=[0,0,-1],uv=[.5,.5],ind=[];outline.forEach(([u,v],i)=>{p.push(x+u,y+v,z+.05*Math.sin(u*6));n.push(0,0,-1);uv.push(u+.5,1+v);});for(let i=0;i<outline.length;i++)ind.push(0,1+i,1+(i+1)%outline.length);
 custom('hanging-shirt',p,ind,n,uv,pick([clothM,clothGreen,cream,redpaint]),null,false);
}
// Street fixtures and posters.
for(let i=0;i<4;i++){
 const side=i%2?1:-1,zz=9+i*11,x=side*4.94;
 tube('lamp-post',[[x,.15,zz],[x,4.7,zz],[x-side*.68,4.85,zz],[x-side*.88,4.6,zz]],.042,iron);
 const lamp=rounded('lamp-housing',.44,.13,.28,.04,x-side*.87,4.6,zz,iron);
 const lm=mat('warm-lamp-'+i,'#f9d395',.3);lm.emissiveColor=new C3(.45,.27,.10);box('lamp-glass',.31,.03,.20,x-side*.87,4.52,zz,lm,null,false);
}
progress('Modelling the vehicles and street life…',58);
await new Promise(r=>setTimeout(r,20));
const green=mat('rickshaw-green','#28754c',.36,.10),yellow=mat('rickshaw-yellow','#ddae38',.42,.06),chrome=mat('brushed-chrome','#cad1c7',.32,.78),seat=mat('brown-vinyl','#694b37',.7),tail=mat('tail-lenses','#ad3325',.25,.1);
green.clearCoat.isEnabled=true;green.clearCoat.intensity=.28;green.clearCoat.roughness=.28;
yellow.clearCoat.isEnabled=true;yellow.clearCoat.intensity=.22;
const autoWheels=[];
function wheel(root,x,y,z,r=.33){
 if(root.metadata?.dynamic){
  const pivot=new B.TransformNode('wheel-pivot-'+autoWheels.length,scene);pivot.parent=root;pivot.position.set(x,y,z);pivot.metadata={dynamic:true,zone:'rickshaw-wheel'};
  const axle=new B.TransformNode('wheel-axle-'+autoWheels.length,scene);axle.parent=pivot;axle.metadata={dynamic:true,zone:'rickshaw-wheel'};
  autoWheels.push({pivot,axle,front:z>0,radius:r});root=axle;x=y=z=0;
 }
 const tire=cylinder('tyre-sidewall',r*1.94,.17,x,y,z,rubber,root,true,24);tire.rotation.z=Math.PI/2;
 const t=B.MeshBuilder.CreateTorus('rounded-tyre',{diameter:r*1.56,thickness:r*.44,tessellation:28},scene);t.position.set(x,y,z);t.rotation.z=Math.PI/2;queue(t,rubber,root);
 const rim=cylinder('wheel-rim',r*1.03,.184,x,y,z,steel,root,false,18);rim.rotation.z=Math.PI/2;
 const hub=cylinder('hubcap',r*.55,.199,x,y,z,chrome,root,false,16);hub.rotation.z=Math.PI/2;
 for(let k=0;k<9;k++){const a=k/9*Math.PI*2;const h=cylinder('rim-hole',r*.11,.201,x,y+Math.sin(a)*r*.36,z+Math.cos(a)*r*.36,dark,root,false,6);h.rotation.z=Math.PI/2;}
}
const hero=await loadQuarterRickshaw({B,scene,shadow,reflectors,autoWheels});S.hero=hero;
const parkedVehicles=await loadQuarterParkedVehicles({B,scene,shadow,reflectors,contactMaterial:contactM});S.parkedVehicles=parkedVehicles;
function scooter(x,z,rot,color){
 const r=new B.TransformNode('parked-scooter',scene);r.position.set(x,.08,z);r.rotation.set(0,rot,-.055);r.metadata={zone:'scooters'};const body=mat('scooter-'+color,color,.4,.1);
 rounded('scooter-rear-body',.53,.47,.80,.13,0,.63,-.34,body,r);rounded('footboard',.50,.10,.78,.04,0,.36,.20,iron,r);
 const front=rounded('scooter-legshield',.58,.84,.20,.09,0,.90,.56,body,r);front.rotation.x=.15;
 rounded('scooter-seat',.51,.13,.74,.062,0,.93,-.28,seat,r);
 rounded('scooter-headlamp-housing',.40,.19,.26,.07,0,1.38,.64,body,r);
 rounded('scooter-headlamp',.25,.13,.045,.03,0,1.39,.79,cream,r);
 tube('scooter-bars',[[-.31,1.33,.58],[.31,1.33,.58]],.025,iron,r);
 for(const s of [-1,1]){tube('mirror-stem',[[s*.24,1.36,.57],[s*.34,1.65,.58]],.012,steel,r,false);sphere('rear-view-mirror',.13,.09,.045,s*.35,1.68,.58,chrome,r,false);}
 wheel(r,0,.27,-.57,.26);wheel(r,0,.27,.75,.26);tube('stand',[[.13,.35,-.1],[.32,.03,-.23]],.022,iron,r);contact(x,z,1.1,2.0);
}
scooter(-2.84,7.8,-.24,'#805344');scooter(3.00,18.0,Math.PI+.38,'#56766b');scooter(-3.0,36,.25,'#968363');
progress('Batching geometry and preparing the lighting…',77);
await new Promise(r=>setTimeout(r,25));
// Merge by material AND neighbourhood, retaining meaningful frustum culling.
for(const group of batches.values()){
 const meshes=group.meshes;for(const m of meshes)m.computeWorldMatrix(true);
 let combined;
 if(meshes.length>1)combined=B.Mesh.MergeMeshes(meshes,true,true,undefined,false,false);
 else{combined=meshes[0];combined.bakeCurrentTransformIntoVertices();combined.parent=null;combined.position.setAll(0);combined.scaling.setAll(1);combined.rotation.setAll(0);combined.rotationQuaternion=null;}
 if(!combined)throw new Error('Geometry batch failed: '+group.zone);
 combined.name=group.zone+' / '+group.mat.name;combined.material=group.mat;combined.isPickable=false;combined.receiveShadows=true;
 if(group.moving){
  // Merge in world space, then restore the moving root's LOCAL coordinates.
  // The starter froze these meshes into the street, leaving an empty vehicle root.
  const inverse=group.moving.computeWorldMatrix(true).clone().invert();combined.bakeTransformIntoVertices(inverse);
  combined.parent=group.moving;combined.position.setAll(0);combined.rotation.setAll(0);combined.rotationQuaternion=null;combined.scaling.setAll(1);
 }else combined.freezeWorldMatrix();
 if(group.cast)shadow.addShadowCaster(combined,false);
 if(!/contact|paper|grit|drain|window-glass/.test(group.mat.name))reflectors.push(combined);
}
S.originalMeshCount=originalMeshes;S.batches=batches.size;
progress('Preparing the character and shared walking rigs…',83);
const crowd=await OldQuarterCrowd.create({B,scene,shadow,contactMaterial:contactM,mobile,hero});S.crowd=crowd;
const staticCasters=shadow.getShadowMap().renderList.slice();
const world=new QuarterTileWorld({B,scene,buildings:authoredBuildings,paving,road:roadMat,wallMats,crowd,mobile});S.world=world;
const traffic=await QuarterTraffic.create({B,scene,hero,autoWheels,crowd,world,mobile,parked:parkedVehicles,allowed:(x,z,h)=>carAllowed(x,z,h,true)});S.traffic=traffic;
const hud=new QuarterHUD();S.hud=hud;S.started=false;S.paused=false;
new MutationObserver(()=>{el('status').classList.add('flash');clearTimeout(S.statusTimer);S.statusTimer=setTimeout(()=>el('status').classList.remove('flash'),3500);}).observe(el('status'),{childList:true});
const vehicleContact=B.MeshBuilder.CreateGround('moving-rickshaw-contact',{width:2.4,height:3.3},scene);
vehicleContact.material=contactM;vehicleContact.parent=hero;vehicleContact.position.y=.019;vehicleContact.isPickable=false;
const sky=B.MeshBuilder.CreateSphere('atmosphere',{diameter:360,segments:16,sideOrientation:B.Mesh.BACKSIDE},scene);
sky.isPickable=false;sky.infiniteDistance=true;
B.Effect.ShadersStore.quarterSkyVertexShader='precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;varying vec3 vSky;void main(){vSky=position;gl_Position=worldViewProjection*vec4(position,1.0);}';
B.Effect.ShadersStore.quarterSkyFragmentShader='precision highp float;varying vec3 vSky;void main(){float h=clamp(normalize(vSky).y,0.,1.);vec3 c=mix(vec3(.73,.78,.77),vec3(.33,.51,.66),pow(h,.5));gl_FragColor=vec4(c,1.);}';
const skyM=new B.ShaderMaterial('gradient-atmosphere',scene,{vertex:'quarterSky',fragment:'quarterSky'},{attributes:['position'],uniforms:['worldViewProjection']});
skyM.disableDepthWrite=true;sky.material=skyM;
// Half-resolution AO gives masonry recesses and character feet spatial contact.
// Keep final colour at native resolution and leave touch/WebGL1 light.
let ambientOcclusion=null;
if(!mobile&&engine.webGLVersion>1&&B.SSAO2RenderingPipeline.IsSupported){
 ambientOcclusion=new B.SSAO2RenderingPipeline('quarter-contact-lighting',scene,{ssaoRatio:.5,blurRatio:.5},[cam]);
 ambientOcclusion.radius=.55;ambientOcclusion.totalStrength=.55;ambientOcclusion.samples=8;
 ambientOcclusion.expensiveBlur=false;ambientOcclusion.textureSamples=4;ambientOcclusion.maxZ=70;
 S.ambientOcclusion=ambientOcclusion;
}
// Planar reflections are restricted to a few irregular puddles, and rendered only in wet mode.
let mirror=null,wet=false;
const wetMeshes=[];
const puddleM=mat('water-surface','#bac4bc',.16,.02);puddleM.albedoTexture=tx.puddle;puddleM.useAlphaFromAlbedoTexture=true;puddleM.alpha=.75;puddleM.transparencyMode=B.PBRMaterial.PBRMATERIAL_ALPHABLEND;
for(const [x,z,w,d,rot] of [[-1.40,-.3,1.3,2.3,.5],[1.45,9.8,1.10,1.8,-.6],[-1.9,16.2,1.5,2.8,.3]]){
 const p=[],uv=[],ind=[],norm=[],N=34;p.push(0,.017,0);uv.push(.5,.5);norm.push(0,1,0);
 for(let i=0;i<N;i++){const a=i/N*Math.PI*2,r=1+.11*Math.sin(a*3)+.065*Math.cos(a*7);p.push(Math.cos(a)*w*.5*r,.017,Math.sin(a)*d*.5*r);uv.push(.5+Math.cos(a)*.48,.5+Math.sin(a)*.48);norm.push(0,1,0);ind.push(0,1+i,1+(i+1)%N);}
 const mesh=new B.Mesh('irregular-puddle',scene),vd=new B.VertexData();vd.positions=p;vd.indices=ind;vd.normals=norm;vd.uvs=uv;vd.applyToMesh(mesh);mesh.material=doubleMat(puddleM);mesh.position.set(x,.011,z);mesh.rotation.y=rot;mesh.setEnabled(false);mesh.isPickable=false;wetMeshes.push(mesh);
}
function toggleWet(){
 wet=!wet;el('wet').setAttribute('aria-pressed',wet);el('wet').textContent=wet?'Wet':'Dry';
 if(wet&&!mirror){mirror=new B.MirrorTexture('puddle-reflection',mobile?384:768,scene,true);mirror.mirrorPlane=new B.Plane(0,-1,0,.028);mirror.renderList=reflectors;mirror.level=.8;mirror.adaptiveBlurKernel=6;doubleMat(puddleM).reflectionTexture=mirror;}
 wetMeshes.forEach(m=>m.setEnabled(wet));roadMat.roughness=wet?.76:.94;roadMat.albedoColor=wet?new C3(.75,.76,.74):C3.White();
 el('status').textContent=wet?'Wet stone · local planar reflections':'Warm light · dry street';
}
let warm=false;
function toggleLight(){warm=!warm;el('light').setAttribute('aria-pressed',warm);el('light').textContent=warm?'Golden':'Daylight';sun.diffuse=warm?new C3(1,.75,.49):new C3(1,.90,.73);sun.intensity=warm?2.55:3.15;skyLight.intensity=warm?.87:.84;ip.exposure=warm?1.05:1.02;el('status').textContent=warm?'Late afternoon · warm bounce':'Daylight · warm masonry';}
// Third-person walking and a kinematic bicycle vehicle, sharing desktop/touch input.
let mode='tour',tourTime=0,tourPlaying=true,yaw=0,pitch=.20,pressed=false,lastX=0,lastY=0,move={x:0,y:0};const keys=new Set();
const player={position:new V(-.9,0,1.3),heading:.25,speed:0};
const vehicle={speed:0,steer:0,distance:0,heading:-.035};
const obstacles=[[-3.09,1.2,.43],[-3.3,2.05,.43],[3.18,14,.43],[3.15,15,.43],
 [3.16,6.6,.32],[-3.25,17.4,.28],[3.35,29,.28],[-2.84,7.3,.47],[-2.84,8.3,.47],
 [3,17.5,.47],[3,18.5,.47],[-3,35.5,.47],[-3,36.5,.47]];
function syncLook(){const dir=cam.getForwardRay().direction;yaw=Math.atan2(dir.x,dir.z);pitch=.20;}
function interfaceMode(){
 el('tour').setAttribute('aria-pressed',mode==='tour');el('tour').textContent=mode==='tour'?'Walk':'Tour';
 el('drive').setAttribute('aria-pressed',mode==='drive');el('drive').textContent=mode==='drive'?'Exit · E':'Drive · E';
 el('speedometer').hidden=mode!=='drive';el('joystick').classList.toggle('show',mobile&&mode!=='tour');
 el('sprint').hidden=!mobile||mode==='drive';el('touchDrive').hidden=!mobile;el('touchDrive').textContent=mode==='drive'?'Exit':'Enter';el('brake').hidden=!(mobile&&mode!=='tour');el('brake').textContent=mode==='drive'?'Brake':'Jump';el('brake').setAttribute('aria-label',mode==='drive'?'Hold to brake':'Jump');
 el('status').textContent=mode==='drive'?(mobile?'Joystick forward / back · left / right to steer · hold Brake':'W / S accelerate & reverse · A / D steer · Space brake'):mode==='explore'?(mobile?'Joystick to walk · drag to look · tap Jump':'WASD walk · Shift run · Space jump · E drive'):'A living neighbourhood · '+crowd.agents.length+' pedestrians';
}
function reset(){
 cam.position.set(.15,3.32,-5.5);cam.setTarget(new V(.4,1.75,8.6));tourTime=0;mode='tour';tourPlaying=true;
 hero.position.set(.37,0,4.15);hero.rotation.y=-.035;vehicle.speed=vehicle.steer=vehicle.distance=0;vehicle.heading=-.035;
 player.position.set(-.9,0,1.3);player.heading=.25;player.speed=0;syncLook();interfaceMode();
 crowd.player.resetMotion();
}
function explore(){if(!S.started||S.paused||mode!=='tour')return;mode='explore';tourPlaying=false;syncLook();interfaceMode();}
function footAllowed(x,z,avoidCar=true){
 if(!world.walkable(x,z))return false;
 if(parkedVehicles.pointBlocked(x,z)||traffic.pointBlocked(x,z))return false;
 if(obstacles.some(o=>Math.hypot(x-o[0],z-o[1])<o[2]+.25))return false;
 if(avoidCar){const dx=x-hero.position.x,dz=z-hero.position.z,c=Math.cos(vehicle.heading),s=Math.sin(vehicle.heading);
  if(Math.abs(dx*c-dz*s)<1.13&&Math.abs(dx*s+dz*c)<1.72)return false;}
 return !crowd.agents.some(a=>Math.hypot(x-a.x,z-a.z)<.46);
}
function interact(){
 if(!S.started)return;
 if(hud.open)hud.toggle(false);
 if(crowd.player.jumpTime>=0){el('status').textContent='Land before entering the rickshaw';return;}
 if(mode==='drive'){
  if(Math.abs(vehicle.speed)>.3){el('status').textContent='Brake to a stop before stepping out';return;}
  const s=Math.sin(vehicle.heading),c=Math.cos(vehicle.heading);
  const options=[[-1.48,-.15],[1.48,-.15],[-1.55,-1.2],[1.55,-1.2],[0,-2.0]];
  const spot=options.map(([x,z])=>({x:hero.position.x+x*c+z*s,z:hero.position.z-x*s+z*c})).find(p=>footAllowed(p.x,p.z));
  if(!spot){el('status').textContent='The pavement is busy · wait for a clear space';return;}
  player.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);player.heading=vehicle.heading;mode='explore';vehicle.speed=0;yaw=vehicle.heading;interfaceMode();
 }else if(Math.hypot(player.position.x-hero.position.x,player.position.z-hero.position.z)<3.6){
  mode='drive';tourPlaying=false;yaw=vehicle.heading;pitch=.30;interfaceMode();
 }else{explore();el('status').textContent='Move closer to the rickshaw to drive · E';}
}
function carAllowed(x,z,heading,ignoreTraffic=false){
 if(!ignoreTraffic&&traffic.carBlocked(x,z,heading))return false;
 if(parkedVehicles.carBlocked(x,z,heading))return false;
 const c=Math.cos(heading),s=Math.sin(heading);
 for(const sx of [-.91,.91])for(const sz of [hero.collision.minZ,hero.collision.maxZ]){
  if(!world.roadAt(x+sx*c+sz*s,z-sx*s+sz*c))return false;
 }
 for(const [ox,oz,r] of obstacles){const dx=ox-x,dz=oz-z,lx=dx*c-dz*s,lz=dx*s+dz*c;
  const nx=Math.max(-.91,Math.min(.91,lx)),nz=Math.max(hero.collision.minZ,Math.min(hero.collision.maxZ,lz));
  if(Math.hypot(lx-nx,lz-nz)<r+.07)return false;}
 return true;
}
function updateVehicle(dt,forward,lateral){
 const braking=keys.has('Space'),target=braking?0:forward>0?7*Math.min(1,forward):forward<0?2.6*Math.max(-1,forward):0;
 const accel=braking?12:forward?2.7:1.8;
 vehicle.speed+=Math.max(-accel*dt,Math.min(accel*dt,target-vehicle.speed));
 vehicle.steer+=(lateral*.44-vehicle.steer)*(1-Math.exp(-dt*7));
 const count=Math.max(1,Math.ceil(Math.abs(vehicle.speed*dt)/.08));
 for(let i=0;i<count;i++){
  const step=dt/count,nextHeading=vehicle.heading+vehicle.speed/1.88*Math.tan(vehicle.steer)*step;
  const x=hero.position.x+Math.sin(nextHeading)*vehicle.speed*step,z=hero.position.z+Math.cos(nextHeading)*vehicle.speed*step;
  if(carAllowed(x,z,nextHeading)){hero.position.x=x;hero.position.z=z;vehicle.heading=nextHeading;vehicle.distance+=vehicle.speed*step;}
  else{vehicle.speed=0;el('status').textContent='Street edge or parked vehicle · reverse to clear';break;}
 }
 hero.rotation.y=vehicle.heading;
 for(const w of autoWheels){w.axle.rotation.x=vehicle.distance/w.radius;if(w.front)w.pivot.rotation.y=vehicle.steer;}
 el('speedValue').textContent=Math.round(Math.abs(vehicle.speed)*3.6);el('gearValue').textContent=vehicle.speed<-.05?'R':vehicle.speed>.05?'D':'N';
 if(!pressed){let delta=(vehicle.heading-yaw+Math.PI*3)%(Math.PI*2)-Math.PI;yaw+=delta*(1-Math.exp(-dt*2.6));}
}
function updatePlayer(dt,forward,lateral){
 const len=Math.max(1,Math.hypot(forward,lateral)),speed=(keys.has('ShiftLeft')?5.4:2.6)/len;
 const vx=(Math.sin(yaw)*forward+Math.cos(yaw)*lateral)*speed,vz=(Math.cos(yaw)*forward-Math.sin(yaw)*lateral)*speed;
 const previous=player.position.clone(),x=previous.x+vx*dt,z=previous.z+vz*dt;
 if(footAllowed(x,previous.z))player.position.x=x;if(footAllowed(player.position.x,z))player.position.z=z;
 player.position.y=world.heightAt(player.position.x,player.position.z);
 player.speed=Math.hypot(player.position.x-previous.x,player.position.z-previous.z)/Math.max(dt,.0001);
 if(player.speed>.03){const heading=Math.atan2(vx,vz),delta=(heading-player.heading+Math.PI*3)%(Math.PI*2)-Math.PI;player.heading+=delta*(1-Math.exp(-dt*12));}
}
function followCamera(dt){
 const position=mode==='drive'?hero.position:player.position,height=mode==='drive'?1.25:1.22;
 const aspect=Math.max(.35,canvas.clientWidth/canvas.clientHeight);
 const distance=(mode==='drive'?5.1:3.75)*Math.max(1,.75/aspect);
 const target=new V(position.x,position.y+height+(mode==='explore'?crowd.player.motionLift*.55:0),position.z);
 const wanted=new V(position.x-Math.sin(yaw)*distance*Math.cos(pitch),target.y+Math.sin(pitch)*distance,position.z-Math.cos(yaw)*distance*Math.cos(pitch));
 wanted.y=Math.max(.45,wanted.y);
 V.LerpToRef(cam.position,wanted,1-Math.exp(-dt*9),cam.position);cam.setTarget(target);
}
function drag(ev){if(!pressed)return;const dx=ev.clientX-lastX,dy=ev.clientY-lastY;lastX=ev.clientX;lastY=ev.clientY;yaw+=dx*.0033;pitch=Math.max(-.10,Math.min(.68,pitch+dy*.0031));}
canvas.addEventListener('pointerdown',ev=>{if(!S.started||S.paused)return;explore();pressed=true;lastX=ev.clientX;lastY=ev.clientY;canvas.setPointerCapture(ev.pointerId);});canvas.addEventListener('pointermove',drag);canvas.addEventListener('pointerup',()=>pressed=false);canvas.addEventListener('pointercancel',()=>pressed=false);
window.addEventListener('keydown',ev=>{if(!S.started||S.paused)return;if(/^(Key[WASD]|Arrow)/.test(ev.code)){explore();keys.add(ev.code);ev.preventDefault();}if(ev.code==='Space'){if(mode==='drive')keys.add(ev.code);else if(!ev.repeat){explore();crowd.player.jump();}ev.preventDefault();}if(ev.code==='ShiftLeft'||ev.code==='ShiftRight')keys.add('ShiftLeft');if(ev.code==='KeyR')reset();if(ev.code==='KeyE'&&!ev.repeat)interact();});window.addEventListener('keyup',ev=>keys.delete(ev.code==='ShiftRight'?'ShiftLeft':ev.code));window.addEventListener('blur',()=>{keys.clear();pressed=false;move={x:0,y:0};});
const joy=el('joystick'),knob=el('knob');let joyId=null;
joy.addEventListener('pointerdown',ev=>{explore();joyId=ev.pointerId;joy.setPointerCapture(joyId);updateJoy(ev);});joy.addEventListener('pointermove',ev=>{if(ev.pointerId===joyId)updateJoy(ev);});
function updateJoy(ev){const r=joy.getBoundingClientRect();let x=(ev.clientX-r.left-r.width/2)/35,y=(ev.clientY-r.top-r.height/2)/35,l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}move={x,y:-y};knob.style.transform=`translate(${x*27}px,${y*27}px)`;}
function stopJoy(){joyId=null;move={x:0,y:0};knob.style.transform='translate(0,0)';}joy.addEventListener('pointerup',stopJoy);joy.addEventListener('pointercancel',stopJoy);
el('tour').onclick=()=>{if(hud.open)hud.toggle(false);if(mode==='tour')explore();else{vehicle.speed=0;mode='tour';tourPlaying=true;tourTime=0;interfaceMode();}};
for(const ev of ['pointerup','pointercancel','lostpointercapture'])el('sprint').addEventListener(ev,()=>keys.delete('ShiftLeft'));el('sprint').addEventListener('pointerdown',ev=>{if(!S.started||S.paused)return;keys.add('ShiftLeft');el('sprint').setPointerCapture(ev.pointerId);ev.preventDefault();});
el('drive').onclick=interact;el('touchDrive').onclick=interact;S.clearInput=()=>{keys.clear();stopJoy();pressed=false;};
el('brake').addEventListener('pointerdown',ev=>{if(mode==='drive')keys.add('Space');else{explore();crowd.player.jump();}el('brake').setPointerCapture(ev.pointerId);ev.preventDefault();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])el('brake').addEventListener(event,()=>keys.delete('Space'));
el('wet').onclick=toggleWet;el('light').onclick=toggleLight;el('reset').onclick=reset;el('quality').onclick=()=>{
 RENDER.mode=RENDER.mode==='native'?'balanced':'native';resolution();
 if(ambientOcclusion){const manager=scene.postProcessRenderPipelineManager;if(RENDER.mode==='native')manager.attachCamerasToRenderPipeline(ambientOcclusion.name,[cam]);else manager.detachCamerasFromRenderPipeline(ambientOcclusion.name,[cam]);}
};el('info').onclick=()=>{el('details').classList.toggle('open');report();};
const stats=new B.EngineInstrumentation(engine);stats.captureGPUFrameTime=false;S.instrumentation=stats;
let fpsFrames=0,fpsTime=performance.now(),lastStat=0,readyFrames=0,stableFrames=0,shadowFrames=0;
let drawStart=0,mainPassDraws=0;
// Count the camera draw phase separately from the shadow-map render pass.
scene.onBeforeDrawPhaseObservable.add(()=>{drawStart=engine._drawCalls?.current??0;});
scene.onAfterDrawPhaseObservable.add(()=>{mainPassDraws=(engine._drawCalls?.current??0)-drawStart;});
function finishStartup(){
 if(S.ready)return;S.ready=true;boot.stage='Rendering';clearInterval(watchdog);note('First visible scene frames completed');
 el('bar').style.width='100%';el('loadTitle').textContent='Old Quarter.';el('loadText').textContent='Your neighbourhood is ready. Enter to begin.';
 QUARTER_AUDIO.prepare().then(()=>{el('enterGame').disabled=false;el('enterGame').textContent='Enter Old Quarter';}).catch(e=>{el('loadText').textContent=e.message;el('enterGame').disabled=false;el('enterGame').textContent='Retry sound';});
  interfaceMode();report();
}
function visibleMaterialReadiness(){
 const active=scene.getActiveMeshes();let ready=0,pending=0;
 for(let i=0;i<active.length;i++)for(const sub of active.data[i].subMeshes||[]){
  const effect=sub.effect||sub._drawWrapper?.effect;if(effect?.isReady())ready++;else pending++;
 }
 return {ready,pending};
}
function frame(){
 if(fatal||contextLost)return;
 try{
 const dt=S.started&&!S.paused?Math.min(.06,engine.getDeltaTime()/1000):0;
  if(mode==='tour'&&tourPlaying&&!S.reviewCamera){if(S.ready)tourTime+=dt;const t=tourTime;cam.position.set(.15+Math.sin(t*.085)*.38,3.32+Math.sin(t*.07)*.10,-5.5+(1-Math.cos(t*.065))*1.15);cam.setTarget(new V(.40,1.75,8.6));}
  if(mode!=='tour'&&S.started&&!S.paused){
  const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+move.y;
  const lateral=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+move.x;
   if(mode==='drive')updateVehicle(dt,forward,lateral);else updatePlayer(dt,forward,lateral);
   if(!S.reviewCamera)followCamera(dt);
 }
  world.update(mode==='drive'?hero.position:player.position,dt);
  const focus=mode==='drive'?hero.position:player.position;
  traffic.update(dt,focus,cam.position,mode==='drive'?null:player.position,{x:hero.position.x,z:hero.position.z,heading:vehicle.heading});
  hud.update(Math.max(dt,.016),focus,mode==='drive'?vehicle.heading:player.heading,crowd,traffic,mode==='drive',Math.hypot(player.position.x-hero.position.x,player.position.z-hero.position.z)<3.6);
  crowd.update(dt,cam.position,mode==='explore'?{x:player.position.x,z:player.position.z}:null);
  crowd.updatePlayer(player.position,player.heading,mode==='explore'?player.speed:0,dt,mode!=='drive');
  if(readyFrames%12===0){shadow.getShadowMap().renderList=staticCasters.filter(m=>!m.isDisposed()&&m.isEnabled()&&BABYLON.Vector3.Distance(m.getBoundingInfo().boundingBox.centerWorld,cam.position)<65).concat(world.shadowCasters(cam.position),crowd.shadowCasters(cam.position),traffic.shadowCasters(cam.position));
   if(mirror)mirror.renderList=reflectors.filter(m=>m.isEnabled()&&BABYLON.Vector3.Distance(m.getBoundingInfo().boundingBox.centerWorld,cam.position)<65).concat(world.shadowCasters(cam.position),crowd.shadowCasters(cam.position),traffic.shadowCasters(cam.position));}
 mainPassDraws=0;engine._drawCalls?.fetchNewFrame();scene.render();fpsFrames++;const now=performance.now();boot.frames=++readyFrames;
 const visible=visibleMaterialReadiness();boot.rendered=visible.ready;boot.mainPassDraws=mainPassDraws;
 if(!S.ready){
  // Gate on visible materials and successful draw calls, not global scene readiness.
  const drewStreet=mainPassDraws>10||(engine._drawCalls===undefined&&visible.ready>10&&visible.pending===0);
  if(drewStreet)stableFrames++;else stableFrames=0;
  if(stableFrames>=3)finishStartup();
  if(S.shaderErrors.length&&visible.ready===0&&readyFrames>30)throw new Error('A material shader failed to compile: '+S.shaderErrors[0].material+'. Try Compatibility mode; technical details are below.');
 }
 // Cache the static shadow only after its own render is ready, never after an
 // arbitrary four frames while materials may still be compiling.
  // Moving actors need fresh shadows; the old cached map left permanent ghosts.
  if(S.ready&&shadowFrames++===12)shadow.getShadowMap().refreshRate=2;
 if(now-lastStat>750){const fps=fpsFrames*1000/(now-fpsTime);el('fps').textContent=Math.round(fps)+' fps';el('renderSize').textContent=engine.getRenderWidth()+' × '+engine.getRenderHeight();el('draws').textContent=(engine._drawCalls?.current??'—')+' / frame';el('meshes').textContent=scene.getActiveMeshes().length+' active / '+scene.meshes.length+' total';el('renderRatio').textContent=RENDER.ratio.toFixed(2)+'× CSS · '+(window.devicePixelRatio||1).toFixed(2)+'× device';fpsTime=now;fpsFrames=0;lastStat=now;}
 }catch(error){fail(error);}
}
progress('Drawing the street · compiling visible materials…',94);
S.materialChecks=scene.materials.filter(m=>m.albedoTexture&&m.bumpTexture&&m.albedoTexture===m.bumpTexture).map(m=>m.name);
if(S.materialChecks.length)throw new Error('Invalid material: colour texture reused as a normal map');
// Attach shader reporting BEFORE the first render. Never wait for the whole scene
// to become ready before rendering: offscreen/optional effects are not a startup gate.
for(const m of scene.materials)m.onError=(effect,errors)=>{
 const message=String(errors).slice(0,1800);if(!S.shaderErrors.some(e=>e.material===m.name))S.shaderErrors.push({material:m.name,errors:message});
 note('Shader failed: '+m.name);report();
};
loopRef=frame;engine.runRenderLoop(frame);
// A slow startup produces a live report and optional continue button, not a
// fatal timeout that stops an otherwise viable scene.
watchdog=setInterval(()=>{
 if(S.ready||fatal)return;
 const elapsed=Math.round((performance.now()-boot.started)/1000);
 el('loadText').textContent='Preparing visible materials · '+boot.rendered+' ready · '+elapsed+' s';
 if(elapsed>15){el('diagnostics').hidden=false;el('compatRetry').hidden=false;report();}
 if(boot.rendered>10&&elapsed>12){el('continueScene').hidden=false;}
},1000);
el('enterGame').onclick=async()=>{el('enterGame').disabled=true;try{await QUARTER_AUDIO.start();S.audioStartedAt=performance.now();S.started=true;S.fadeStartedAt=performance.now();document.body.classList.add('playing');el('loader').classList.add('gone');el('loader').setAttribute('aria-hidden','true');explore();interfaceMode();}catch(e){el('loadText').textContent=e.message;el('enterGame').disabled=false;}};
el('continueScene').onclick=()=>{note('User chose to show the already-rendering scene');finishStartup();};
window.addEventListener('resize',resolution);
document.addEventListener('visibilitychange',()=>{if(document.hidden){engine.stopRenderLoop(frame);}else if(!fatal){engine.runRenderLoop(frame);}});
S.reset=reset;S.explore=explore;S.interact=interact;S.player=player;S.vehicle=vehicle;S.carAllowed=carAllowed;S.footAllowed=footAllowed;
S.toggleWet=toggleWet;S.toggleLight=toggleLight;S.resolution=resolution;S.snapshot=()=>({ready:S.ready,engine:B.Engine.Version,render:[engine.getRenderWidth(),engine.getRenderHeight()],meshes:scene.meshes.length,materialChecks:S.materialChecks,shaderErrors:S.shaderErrors,mode,wet,seed:S.seed,started:S.started,traffic:traffic.snapshot(),world:world.snapshot(),crowd:crowd.snapshot(),buildings:authoredBuildings.snapshot(),parkedVehicles:parkedVehicles.snapshot(),audio:window.QUARTER_AUDIO.snapshot(),character:crowd.player.snapshot(),vehicle:{speed:vehicle.speed,heading:vehicle.heading,position:hero.position.asArray()},boot:report()});
}catch(e){fail(e);}
})();

