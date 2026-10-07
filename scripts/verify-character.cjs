const {chromium}=require('C:/Users/fahim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8096/india.html');await page.waitForFunction(()=>window.STREET?.ready,null,{timeout:60000});
  const report={asset:await page.evaluate(()=>STREET.snapshot().character)};assert.equal(report.asset.source,'character2-rigged.glb');assert.equal(report.asset.bones,65);assert.deepEqual(report.asset.loadedClips,['Idle','Walk','Run','Jump']);
  report.poses=await page.evaluate(()=>{
   const p=STREET.crowd.player;let soleError=0;const nodes=['LeftUpLeg','LeftLeg','RightUpLeg','RightLeg','LeftArm','RightArm'];
   const rotations=nodes.map(n=>p.nodes[n].node.rotationQuaternion.asArray());
   for(const ground of [0,.163])for(const clip of ['idle','walk','run','jump'])for(let i=0;i<32;i++){
    p.phase=i/32;p.time=i/32*p.clips.idle.duration;p.animationWeights=[clip==='idle'?1:0,clip==='walk'?1:0,clip==='run'?1:0];
    if(clip==='jump'){p.animationWeights=[1,0,0];p.jumpTime=i/32*p.clips.jump.duration;}else p.jumpTime=-1;
    p.update(new BABYLON.Vector3(-.9,ground,1.3),.25,1.65,0,true);
    soleError=Math.max(soleError,Math.abs(p.lowestSole()-ground-p.motionLift));
   }
   p.jumpTime=-1;p.phase=.25;p.animationWeights=[0,1,0];p.pose();
   const changes=nodes.map((n,i)=>p.nodes[n].node.rotationQuaternion.asArray().some((q,j)=>Math.abs(q-rotations[i][j])>.005));
   p.resetMotion();p.update(STREET.player.position,STREET.player.heading,0,0,true);
   return {samples:256,soleError,changedLimbs:changes};
  });assert(report.poses.soleError<.002);assert(report.poses.changedLimbs.every(Boolean));
  await page.locator('#tour').click();
  await page.evaluate(()=>{STREET.reviewCamera=true;const p=STREET.player.position;STREET.camera.position.set(p.x-2.3,1.45,p.z+2.3);STREET.camera.setTarget(new BABYLON.Vector3(p.x,1.0,p.z));});
  await page.waitForTimeout(1200);await page.screenshot({path:'artifacts/character2-idle.png'});
  await page.evaluate(()=>{STREET.camera.position.set(1.4,1.4,-1.5);STREET.camera.setTarget(new BABYLON.Vector3(-.9,1,2));});
  const before=await page.evaluate(()=>STREET.player.position.asArray());await page.keyboard.down('KeyW');await page.waitForTimeout(750);
  report.walk=await page.evaluate(()=>({position:STREET.player.position.asArray(),character:STREET.snapshot().character}));
  await page.screenshot({path:'artifacts/character2-walking.png'});await page.keyboard.up('KeyW');
  assert(report.walk.character.gait>.9);assert(Math.hypot(report.walk.position[0]-before[0],report.walk.position[2]-before[2])>.5);
  await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');await page.waitForTimeout(700);
  report.fast=await page.evaluate(()=>({speed:STREET.player.speed,character:STREET.snapshot().character}));
  await page.evaluate(()=>{const p=STREET.player.position;STREET.camera.position.set(p.x-3.1,1.65,p.z-.4);STREET.camera.setTarget(new BABYLON.Vector3(p.x,1.05,p.z));});
  await page.screenshot({path:'artifacts/mixamo-running.png'});await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');assert(report.fast.speed>2.4);assert.equal(report.fast.character.state,'run');
  await page.waitForTimeout(600);report.stopped=await page.evaluate(()=>STREET.snapshot().character);assert(report.stopped.gait<.02);
  await page.keyboard.press('KeyR');await page.locator('#tour').click();
  await page.evaluate(()=>{STREET.reviewCamera=true;STREET.camera.position.set(-3.3,1.7,3.1);STREET.camera.setTarget(new BABYLON.Vector3(-.9,1.3,1.3));});
  const jumpTiming=await page.evaluate(()=>{const p=STREET.crowd.player,c=p.clips.jump,s=p.motionPack.stride;let max=0,index=0;for(let i=0;i<c.frames;i++){const v=c.values[i*s+s-1];if(v>max){max=v;index=i;}}return {peak:index/(c.frames-1)*c.duration,duration:c.duration,peakHeight:max*p.scale};});
  await page.keyboard.press('Space');await page.waitForTimeout(250);const started=await page.evaluate(()=>STREET.snapshot().character);assert.equal(started.state,'jump');
  await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>STREET.snapshot().mode),'explore');
  await page.keyboard.press('Space');const repeat=await page.evaluate(()=>STREET.crowd.player.jumpTime);assert(repeat>=started.jumpTime-.001);
  await page.waitForTimeout(Math.max(0,jumpTiming.peak*1000-250));report.jump={timing:jumpTiming,atPeak:await page.evaluate(()=>STREET.snapshot().character)};
  assert(report.jump.atPeak.airborneHeight>.2);await page.screenshot({path:'artifacts/mixamo-jumping.png'});
  await page.waitForTimeout((jumpTiming.duration-jumpTiming.peak)*1000+500);report.jump.landed=await page.evaluate(()=>({character:STREET.snapshot().character,sole:STREET.crowd.player.lowestSole()}));
  assert.equal(report.jump.landed.character.state,'idle');assert(Math.abs(report.jump.landed.sole)<.002);
  await page.keyboard.press('KeyR');await page.keyboard.press('KeyE');await page.waitForTimeout(200);
  report.seated=await page.evaluate(()=>({mode:STREET.snapshot().mode,character:STREET.snapshot().character,parent:STREET.crowd.player.mesh.parent.name,
   rootCount:STREET.scene.transformNodes.filter(n=>n.name==='character2-player').length,contact:STREET.crowd.player.contact.isEnabled(),
   oldAvatars:STREET.scene.meshes.filter(m=>/player-palette|driver-palette/.test(m.name)).length}));
  assert.equal(report.seated.mode,'drive');assert.equal(report.seated.character.state,'seated');assert.equal(report.seated.parent,'hero-auto-rickshaw');assert.equal(report.seated.rootCount,1);assert(!report.seated.contact);assert.equal(report.seated.oldAvatars,0);
  report.gripErrors=await page.evaluate(()=>{const B=BABYLON,p=STREET.crowd.player,inv=B.Matrix.Invert(STREET.hero.computeWorldMatrix(true));return ['Left','Right'].map(side=>{
   const hand=B.Vector3.TransformCoordinates(p.nodes[side+'Hand'].node.getAbsolutePosition(),inv);return B.Vector3.Distance(hand,new B.Vector3(...STREET.hero.driver.grips[side==='Left'?0:1]));});});
  assert(report.gripErrors.every(e=>e<.04));
  await page.evaluate(()=>{STREET.camera.position.set(2.7,1.6,6.2);STREET.camera.setTarget(new BABYLON.Vector3(.37,1.3,4.7));});
  await page.waitForTimeout(400);await page.screenshot({path:'artifacts/character2-driving.png'});
  await page.keyboard.press('KeyE');await page.waitForTimeout(400);
  report.exited=await page.evaluate(()=>({mode:STREET.snapshot().mode,parent:STREET.crowd.player.mesh.parent,character:STREET.snapshot().character,
   sole:STREET.crowd.player.lowestSole(),ground:STREET.player.position.y,casters:STREET.crowd.shadowCasters(STREET.camera.position).some(m=>m.name==='character2-player-body')}));
  assert.equal(report.exited.mode,'explore');assert.equal(report.exited.parent,null);assert(Math.abs(report.exited.sole-report.exited.ground)<.002);assert(report.exited.casters);
  report.errors=errors.concat(await page.evaluate(()=>STREET.errors));report.shaderErrors=await page.evaluate(()=>STREET.shaderErrors);assert.equal(report.errors.length,0);assert.equal(report.shaderErrors.length,0);
  fs.writeFileSync('artifacts/character2-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
