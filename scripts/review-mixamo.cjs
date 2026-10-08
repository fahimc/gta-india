const {chromium}=require('C:/Users/fahim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  await page.goto('http://127.0.0.1:8096/india.html');await page.waitForFunction(()=>window.STREET?.ready,null,{timeout:60000});
  await page.getByRole('button',{name:'Enter Old Quarter',exact:true}).click();await page.waitForTimeout(1400);
  await page.evaluate(()=>{STREET.engine.stopRenderLoop();STREET.reviewCamera=true;STREET.world.update(new BABYLON.Vector3(80,0,90),0,true);STREET.camera.position.set(77.2,1.55,90.3);STREET.camera.setTarget(new BABYLON.Vector3(80,1.05,90));});
  for(const clip of ['idle','walk','run','jump'])for(const phase of [.20,.45,.70]){
   await page.evaluate(({clip,phase})=>{
    const p=STREET.crowd.player;p.time=phase*p.clips.idle.duration;p.phase=phase;
    p.animationWeights=[clip==='idle'||clip==='jump'?1:0,clip==='walk'?1:0,clip==='run'?1:0];p.jumpTime=clip==='jump'?phase*p.clips.jump.duration:-1;
    p.update(new BABYLON.Vector3(80,0,90),0,0,0,true);STREET.scene.render();
   },{clip,phase});
   await page.screenshot({path:`artifacts/mixamo-${clip}-${Math.round(phase*100)}.png`});
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
