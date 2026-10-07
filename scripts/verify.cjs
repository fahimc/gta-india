const { chromium }=require('C:/Users/fahim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8096/india.html');await page.waitForFunction(()=>STREET?.ready,null,{timeout:60000});
 const report={};report.initial=await page.evaluate(()=>STREET.snapshot());
 assert.equal(report.initial.crowd.crowd,44);assert(report.initial.crowd.sharedGeometry);assert(report.initial.crowd.sharedTextures);assert.equal(report.initial.crowd.offPavement,0);
 await page.waitForTimeout(1500);await page.screenshot({path:'artifacts/street-crowd.png'});
 // Actual input, not direct mutation: enter, accelerate, brake, exit, walk.
 await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>STREET.snapshot().mode),'drive');
 const before=await page.evaluate(()=>STREET.hero.position.asArray());
 await page.keyboard.down('KeyW');await page.waitForTimeout(2200);await page.keyboard.up('KeyW');
 report.driven=await page.evaluate(()=>({position:STREET.hero.position.asArray(),speed:STREET.vehicle.speed,meshes:STREET.hero.getChildMeshes().length}));
 assert(report.driven.position[2]>before[2]+2);assert(report.driven.meshes>=4);assert.equal(report.initial.crowd.source,'npc-man-1.glb');
 await page.screenshot({path:'artifacts/rickshaw-driving.png'});
 await page.keyboard.down('Space');await page.waitForTimeout(1000);await page.keyboard.up('Space');await page.keyboard.press('KeyE');
 assert.equal(await page.evaluate(()=>STREET.snapshot().mode),'explore');
 const footBefore=await page.evaluate(()=>STREET.player.position.asArray());
 await page.keyboard.down('KeyS');await page.waitForTimeout(750);await page.keyboard.up('KeyS');
 report.walked=await page.evaluate(()=>STREET.player.position.asArray());assert(Math.hypot(report.walked[0]-footBefore[0],report.walked[2]-footBefore[2])>.4);
 await page.waitForTimeout(600);await page.screenshot({path:'artifacts/third-person-walking.png'});
 await page.keyboard.press('KeyR');await page.keyboard.press('KeyE');
 await page.keyboard.down('KeyS');await page.waitForTimeout(900);await page.keyboard.up('KeyS');
 report.reverse=await page.evaluate(()=>({speed:STREET.vehicle.speed,z:STREET.hero.position.z}));assert(report.reverse.speed<-.5);assert(report.reverse.z<4.0);
 await page.keyboard.down('Space');await page.waitForTimeout(400);await page.keyboard.up('Space');
 await page.keyboard.down('KeyW');await page.keyboard.down('KeyD');await page.waitForTimeout(2000);await page.keyboard.up('KeyD');await page.keyboard.up('KeyW');
 report.steering=await page.evaluate(()=>({heading:STREET.vehicle.heading,legal:STREET.carAllowed(STREET.hero.position.x,STREET.hero.position.z,STREET.vehicle.heading)}));
 assert(Math.abs(report.steering.heading+.035)>.05);assert(report.steering.legal);
 // Close review of a walking group, showing feet, joints and the pavement.
 await page.evaluate(()=>{STREET.reset();STREET.crowd.paused=true;const a=STREET.crowd.agents.find(a=>a.x>0&&a.z>9&&a.z<20);STREET.camera.position.set(1.9,1.5,a.z-3);STREET.camera.setTarget(new BABYLON.Vector3(4.1,1.1,a.z));});
 // Pause only the scene's camera tour with a click? deterministic tour update is
 // disabled through the exposed review camera hook below.
 await page.evaluate(()=>{STREET.reviewCamera=true;});await page.waitForTimeout(500);await page.screenshot({path:'artifacts/crowd-close.png'});
 report.poseGrounding=await page.evaluate(()=>{
  const c=STREET.crowd,B=BABYLON;let maxError=0,changed=false;const pool=c.pools[0],a=c.agents.find(a=>a.poolIndex===0),first=pool.nodes.LeftLeg.rotationQuaternion.clone();
  for(let i=0;i<48;i++){
   c.poseNPC(pool,i/48);c.flushNPCInstances();const matrices=pool.skeleton.getTransformMatrices(pool.mesh),world=a.walking.computeWorldMatrix(true).m;let low=Infinity;
   for(const f of pool.feet){let x=0,y=0,z=0;for(let j=0;j<4;j++){const w=f.weights[j],k=f.indices[j]*16,p=f.point;x+=(matrices[k]*p[0]+matrices[k+4]*p[1]+matrices[k+8]*p[2]+matrices[k+12])*w;y+=(matrices[k+1]*p[0]+matrices[k+5]*p[1]+matrices[k+9]*p[2]+matrices[k+13])*w;z+=(matrices[k+2]*p[0]+matrices[k+6]*p[1]+matrices[k+10]*p[2]+matrices[k+14])*w;}low=Math.min(low,world[1]*x+world[5]*y+world[9]*z+world[13]);}
   maxError=Math.max(maxError,Math.abs(low-a.route.pavementY));if(Math.abs(B.Quaternion.Dot(first,pool.nodes.LeftLeg.rotationQuaternion))<.99)changed=true;
  }
  return {samples:48,maxSoleError:maxError,changedLeg:changed,renderedInstances:c.agents.filter(a=>a.walking.isEnabled()||a.standing.isEnabled()).length};});assert(report.poseGrounding.maxSoleError<.002);assert(report.poseGrounding.changedLeg);assert.equal(report.poseGrounding.renderedInstances,44);
 report.navigation=await page.evaluate(()=>{
  const c=STREET.crowd;c.paused=false;const savedPose=c.poseNPC;c.poseNPC=()=>{};let min=Infinity,off=0;const cam=new BABYLON.Vector3(0,3,25);
  for(let i=0;i<18000;i++){c.update(1/60,cam,null);if(i%60===0){const s=c.snapshot();min=Math.min(min,s.minimumSeparation);off+=s.offPavement;}}
  c.poseNPC=savedPose;return {seconds:300,minimumSeparation:min,offPavement:off,final:c.snapshot()};});
 assert.equal(report.navigation.offPavement,0);assert(report.navigation.minimumSeparation>=.49);
 report.playerAvoidance=await page.evaluate(()=>{
  const c=STREET.crowd;const savedPose=c.poseNPC;c.poseNPC=()=>{};let p;
  // A player cannot spawn inside an NPC: choose a legal, initially clear point.
  for(let s=0;s<c.routes[0].length;s+=.5){const candidate=c.sample(c.routes[0],s);if(c.agents.every(a=>Math.hypot(a.x-candidate.x,a.z-candidate.z)>1.15)){p=candidate;break;}}
  if(!p)throw new Error('No clear pavement point available for avoidance test');let min=Infinity;
  for(let i=0;i<1200;i++){c.update(1/60,new BABYLON.Vector3(0,3,25),p);for(const agent of c.agents)min=Math.min(min,Math.hypot(agent.x-p.x,agent.z-p.z));}
  c.poseNPC=savedPose;return {seconds:20,minimumSeparation:min};});assert(report.playerAvoidance.minimumSeparation>.45);
 await page.evaluate(()=>{STREET.reviewCamera=false;STREET.reset();STREET.toggleWet();STREET.toggleLight();});
 await page.waitForTimeout(1200);await page.screenshot({path:'artifacts/golden-wet.png'});
 report.performance=await page.evaluate(()=>new Promise(resolve=>{
  const frames=[];const obs=STREET.scene.onAfterRenderObservable.add(()=>{frames.push(STREET.engine.getDeltaTime());if(frames.length===240){STREET.scene.onAfterRenderObservable.remove(obs);frames.sort((a,b)=>a-b);resolve({frames:240,medianMs:frames[120],p95Ms:frames[228],fps:STREET.engine.getFps(),drawCalls:STREET.engine._drawCalls?.current,triangles:STREET.scene.getActiveIndices()/3});}});
 }));
 report.errors=errors.concat(await page.evaluate(()=>STREET.errors));report.shaders=await page.evaluate(()=>STREET.shaderErrors);
 assert.equal(report.errors.length,0);assert.equal(report.shaders.length,0);
 // file:// offline delivery must work with the engine and GLB request blocked.
 const offline=await browser.newPage({viewport:{width:1280,height:720}});await offline.route('https://**',r=>r.abort());
 await offline.goto('file:///I:/Projects/gta-india/india.html');await offline.waitForFunction(()=>STREET?.ready,null,{timeout:60000});
 report.offline=await offline.evaluate(()=>({ready:STREET.ready,characters:STREET.crowd.agents.length,errors:STREET.errors}));assert(report.offline.ready);
 await offline.screenshot({path:'artifacts/offline-1280.png'});
 const compat=await browser.newPage({viewport:{width:1280,height:720}});await compat.goto('http://127.0.0.1:8096/india.html#compat');await compat.waitForFunction(()=>STREET?.ready,null,{timeout:60000});
 report.compatibility=await compat.evaluate(()=>({ready:STREET.ready,webGL:STREET.engine.webGLVersion,errors:STREET.errors}));assert.equal(report.compatibility.webGL,1);assert.equal(report.compatibility.errors.length,0);
 await compat.close();await offline.close();await page.close();
 // Responsive touch profile uses the same vehicle commands and reduced crowd.
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 await mobile.goto('http://127.0.0.1:8096/india.html');await mobile.waitForFunction(()=>STREET?.ready,null,{timeout:60000});
 await mobile.locator('#tour').click();assert.equal(await mobile.locator('#brake').innerText(),'Jump');
 await mobile.locator('#brake').click();await mobile.waitForTimeout(500);
 report.mobileJump=await mobile.evaluate(()=>STREET.snapshot().character);assert.equal(report.mobileJump.state,'jump');
 await mobile.waitForTimeout(2200);assert.equal(await mobile.evaluate(()=>STREET.snapshot().character.state),'idle');
 await mobile.locator('#drive').click();report.mobile=await mobile.evaluate(()=>({mode:STREET.snapshot().mode,crowd:STREET.crowd.agents.length,joystick:document.getElementById('joystick').classList.contains('show')}));
 assert.equal(report.mobile.crowd,32);assert(report.mobile.joystick);
 const joy=await mobile.locator('#joystick').boundingBox(),mx=joy.x+joy.width/2,my=joy.y+joy.height/2;
 await mobile.mouse.move(mx,my);await mobile.mouse.down();await mobile.mouse.move(mx,my-30);await mobile.waitForTimeout(1500);await mobile.mouse.up();
 report.mobile.drivenZ=await mobile.evaluate(()=>STREET.hero.position.z);assert(report.mobile.drivenZ>5.0);
 const brake=await mobile.locator('#brake').boundingBox();await mobile.mouse.move(brake.x+brake.width/2,brake.y+brake.height/2);await mobile.mouse.down();await mobile.waitForTimeout(700);await mobile.mouse.up();
 report.mobile.stoppedSpeed=await mobile.evaluate(()=>STREET.vehicle.speed);assert(Math.abs(report.mobile.stoppedSpeed)<.1);
 await mobile.waitForTimeout(800);await mobile.screenshot({path:'artifacts/mobile-driving.png'});
 fs.writeFileSync('artifacts/validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
