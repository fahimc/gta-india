const {chromium}=require('C:/Users/fahim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert'),fs=require('fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8096/india.html');await page.waitForFunction(()=>window.STREET?.ready,null,{timeout:90000});
 const report={buildings:await page.evaluate(()=>({info:STREET.buildings.snapshot(),bounds:STREET.buildings.instances.map(m=>{const b=m.getBoundingInfo().boundingBox;return {min:b.minimumWorld.asArray(),max:b.maximumWorld.asArray()};}),textures:STREET.buildings.source.material.getActiveTextures().map(t=>t.getSize()),foundations:STREET.scene.meshes.filter(m=>m.name.startsWith('old-building-foundation')).length}))};
 assert.equal(report.buildings.info.instances,12);assert(report.buildings.info.sharedGeometry&&report.buildings.info.sharedMaterial);assert(report.buildings.info.types.every(t=>t.triangles<75000));assert.equal(report.buildings.foundations,12);
 assert(report.buildings.bounds.every(b=>Math.min(Math.abs(b.min[0]),Math.abs(b.max[0]))>4.95));assert(report.buildings.textures.every(t=>t.width<=2048&&t.height<=2048));
 await page.keyboard.press('KeyE');await page.evaluate(()=>{STREET.reviewCamera=true;const h=STREET.hero.position;STREET.camera.position.set(h.x-4.5,1.05,h.z+.1);STREET.camera.setTarget(h.add(new BABYLON.Vector3(0,.65,0)));STREET.engine.stopRenderLoop();});
 const bodyBefore=await page.evaluate(()=>Array.from(STREET.hero.getChildMeshes().find(m=>m.name==='rickshaw-authored-body').computeWorldMatrix(true).m));
 report.rotation=[];
 for(let i=0;i<8;i++){
  const state=await page.evaluate(angle=>{const B=BABYLON,h=STREET.hero,parts=h.getChildMeshes().filter(m=>m.name.startsWith('rickshaw-wheel-'));for(const m of parts){m.parent.rotation.x=angle;m.parent.parent.rotation.y=m.name==='rickshaw-wheel-3'?.28:0;}STREET.scene.render();
   return {angle,body:Array.from(h.getChildMeshes().find(m=>m.name==='rickshaw-authored-body').computeWorldMatrix(true).m),wheels:parts.map(m=>{const p=m.getVerticesData(B.VertexBuffer.PositionKind);let maxRadius=0,maxAxial=0;for(let j=0;j<p.length;j+=3){maxRadius=Math.max(maxRadius,Math.hypot(p[j+1],p[j+2]));maxAxial=Math.max(maxAxial,Math.abs(p[j]));}return {name:m.name,maxRadius,maxAxial,spin:m.parent.rotation.x};})};},i*Math.PI/4);
  assert.deepEqual(state.body,bodyBefore);assert.equal(state.wheels.length,3);assert(state.wheels.every(w=>w.maxRadius<.29));assert(state.wheels.find(w=>w.name==='rickshaw-wheel-3').maxAxial<.10);report.rotation.push(state);
  if(i%2===0)await page.screenshot({path:'artifacts/wheels-clean-'+i+'.png'});
 }
 await page.evaluate(()=>{STREET.reset();STREET.reviewCamera=true;const b=STREET.buildings.instances.find(m=>m.metadata.side===1&&m.metadata.index===2),box=b.getBoundingInfo().boundingBox;STREET.camera.position.set(-1.2,3.0,box.centerWorld.z-6.5);STREET.camera.setTarget(new BABYLON.Vector3(5.5,3.6,box.centerWorld.z));STREET.scene.render();});
 await page.screenshot({path:'artifacts/old-building-1-street.png'});
 report.errors=errors.concat(await page.evaluate(()=>STREET.errors));report.shaders=await page.evaluate(()=>STREET.shaderErrors);assert.equal(report.errors.length,0);assert.equal(report.shaders.length,0);
 await page.reload();await page.waitForFunction(()=>window.STREET?.ready,null,{timeout:90000});
 await page.evaluate(()=>{STREET.reviewCamera=true;const b=STREET.buildings.instances.find(m=>m.metadata.side===1&&m.metadata.index===2),box=b.getBoundingInfo().boundingBox;STREET.camera.position.set(-1.2,3,box.centerWorld.z-6.5);STREET.camera.setTarget(new BABYLON.Vector3(5.5,3.6,box.centerWorld.z));});await page.waitForTimeout(1600);await page.screenshot({path:'artifacts/old-building-1-live.png'});
 await page.keyboard.press('KeyE');await page.evaluate(()=>{const h=STREET.hero.position;STREET.camera.position.set(h.x-4.5,1.05,h.z+.1);STREET.camera.setTarget(h.add(new BABYLON.Vector3(0,.65,0)));});await page.waitForTimeout(1200);await page.screenshot({path:'artifacts/wheels-fixed-live.png'});
 fs.writeFileSync('artifacts/asset-integration-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify({buildings:report.buildings,rotationSamples:report.rotation.length,errors:report.errors}));
}finally{await browser.close();}})();
