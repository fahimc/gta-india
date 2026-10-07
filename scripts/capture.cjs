const { chromium } = require('C:/Users/fahim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8096/'+(process.argv[2]||'india.html'));
 await page.waitForFunction(()=>window.ready||window.STREET?.ready||window.STREET_BOOT?.errors.length,null,{timeout:120000});
 await page.waitForTimeout(5500);
 await page.screenshot({path:'artifacts/'+(process.argv[3]||'baseline')+'.png'});
 console.log(JSON.stringify(await page.evaluate(()=>window.STREET?.snapshot?.()||(window.STREET_BOOT?{errors:STREET_BOOT.errors,stage:STREET_BOOT.stage}:{meshes:review.meshes.map(m=>({name:m.name,vertices:m.getTotalVertices()})),lo:review.lo,hi:review.hi})),null,2));console.log({errors});
 if(process.argv[2]?.includes('character')){await page.evaluate(()=>{review.c.alpha=Math.PI/2;});await page.waitForTimeout(500);await page.screenshot({path:'artifacts/character-back.png'});}
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
