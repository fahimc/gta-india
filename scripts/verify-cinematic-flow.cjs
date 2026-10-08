const fs=require('node:fs'),assert=require('node:assert');
const {chromium}=require('C:/Users/fahim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const results=[];
 try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]||'http://127.0.0.1:8096/india.html');
  await page.waitForFunction(()=>window.STREET?.ready&&!document.getElementById('enterGame').disabled,null,{timeout:180000});await page.waitForTimeout(700);
  await page.screenshot({path:`artifacts/cinematic-title-${mobile?'phone':'desktop'}.png`});
  if(!mobile){await page.setViewportSize({width:900,height:500});await page.waitForTimeout(200);await page.screenshot({path:'artifacts/cinematic-title-landscape.png'});const entryBox=await page.locator('#enterGame').boundingBox();assert(entryBox.y>=0&&entryBox.y+entryBox.height<=500);await page.setViewportSize({width:1440,height:900});}
  assert(await page.evaluate(()=>!STREET.started&&QUARTER_AUDIO.audio.paused));
  await page.getByRole('button',{name:'Display & atmosphere',exact:true}).click();
  await page.screenshot({path:`artifacts/cinematic-settings-${mobile?'phone':'desktop'}.png`});
  const before=await page.evaluate(()=>STREET.cinematic.snapshot());assert(before.wet&&before.visiblePuddles>0);
  await page.locator('#front-wet').click();assert(!(await page.evaluate(()=>STREET.cinematic.wet)));await page.locator('#front-wet').click();
  await page.locator('#front-quality').click();await page.waitForTimeout(350);const alternate=await page.evaluate(()=>STREET.cinematic.snapshot());assert(before.quality!==alternate.quality);await page.locator('#front-quality').click();
  await page.keyboard.press('Escape');assert(await page.locator('#frontPanel').isHidden());assert(!(await page.evaluate(()=>STREET.paused)));
  await page.getByRole('button',{name:'Controls',exact:true}).click();assert(await page.locator('#frontControls').isVisible());await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await page.evaluate(()=>{window.cinematicAudioOrder=[];QUARTER_AUDIO.audio.addEventListener('playing',()=>cinematicAudioOrder.push({time:performance.now(),covered:!document.getElementById('loader').classList.contains('gone')}));});
  await page.getByRole('button',{name:'Enter Old Quarter',exact:true}).click();await page.waitForTimeout(3600);
  assert(await page.evaluate(()=>cinematicAudioOrder[0]?.covered&&cinematicAudioOrder[0].time<=STREET.fadeStartedAt&&!QUARTER_AUDIO.audio.paused));
  await page.evaluate(()=>{STREET.reviewCamera=true;const B=BABYLON;STREET.camera.position.set(-2.7,1.5,-2.6);STREET.camera.setTarget(new B.Vector3(.4,1.2,5.5));});await page.waitForTimeout(1400);
  await page.screenshot({path:`artifacts/cinematic-street-${mobile?'phone':'desktop'}.png`});
  await page.keyboard.press('Escape');assert(await page.locator('#pauseMenu').isVisible());await page.screenshot({path:`artifacts/cinematic-pause-${mobile?'phone':'desktop'}.png`});await page.getByRole('button',{name:'Resume',exact:true}).click();
  const rendering=await page.evaluate(()=>({look:STREET.cinematic.snapshot(),shaderErrors:STREET.shaderErrors,bootErrors:STREET_BOOT.errors,activePuddles:STREET.cinematic.puddles.filter(m=>m.isEnabled()).map(m=>[m.position.x,m.position.z,STREET.world.roadAt(m.position.x,m.position.z)]),body:document.body.className}));
  rendering.reflectionPixels=await page.evaluate(async()=>{const pixels=await STREET.cinematic.mirror.readPixels();let min=255,max=0;for(let i=0;i<pixels.length;i+=1132){min=Math.min(min,pixels[i]);max=Math.max(max,pixels[i]);}return {min,max};});assert(rendering.reflectionPixels.max-rendering.reflectionPixels.min>20);
  assert(rendering.look.reflectionMeshes>0);assert(rendering.look.reflectionSize===(mobile?256:1024));assert(rendering.look.puddlePool===(mobile?10:22));assert(rendering.activePuddles.every(p=>p[2]));assert.equal(rendering.shaderErrors.length,0);assert.equal(rendering.bootErrors.length,0);assert.equal(errors.length,0);
  const stream=await page.evaluate(()=>{const S=STREET,B=BABYLON,pool=S.cinematic.puddles.slice(),out=[];for(const [x,z] of [[80,90],[-80,-70],[160,180]]){const p=new B.Vector3(x,0,z);S.world.update(p,0,true);S.cinematic.update(p,0,180);out.push({count:S.cinematic.puddles.length,near:S.cinematic.puddles.filter(m=>m.isEnabled()).every(m=>Math.hypot(m.position.x-x,m.position.z-z)<44&&S.world.roadAt(m.position.x,m.position.z)),same:S.cinematic.puddles.every((m,i)=>m===pool[i])});}return out;});assert(stream.every(s=>s.near&&s.same));
  results.push({mobile,rendering,stream,errors});console.log(JSON.stringify({mobile,look:rendering.look,errors}));await page.close();
 }
 const compatibility=await browser.newPage({viewport:{width:1000,height:700}});await compatibility.goto((process.argv[2]||'http://127.0.0.1:8096/india.html').split('#')[0]+'#compat');await compatibility.waitForFunction(()=>window.STREET?.ready&&!document.getElementById('enterGame').disabled,null,{timeout:180000});await compatibility.getByRole('button',{name:'Enter Old Quarter',exact:true}).click();await compatibility.waitForTimeout(3000);
 const fallback=await compatibility.evaluate(()=>({webGL:STREET.engine.webGLVersion,errors:STREET_BOOT.errors,shaderErrors:STREET.shaderErrors,sky:STREET.scene.getMaterialByName('generated-panorama-atmosphere').emissiveTexture.getSize(),look:STREET.cinematic.snapshot()}));assert.equal(fallback.webGL,1);assert.equal(fallback.errors.length,0);assert.equal(fallback.shaderErrors.length,0);assert.equal(fallback.sky.width,2048);assert(!fallback.look.bloom&&fallback.look.probeSize===0);await compatibility.screenshot({path:'artifacts/cinematic-webgl1.png'});results.push({compatibility:fallback});console.log(JSON.stringify({compatibility:fallback}));await compatibility.close();
 }finally{await browser.close();}fs.writeFileSync('artifacts/cinematic-flow-validation.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
