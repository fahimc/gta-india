const {chromium}=require('C:/Users/fahim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const p=await browser.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:8096/india.html');await p.waitForFunction(()=>STREET?.ready||STREET_BOOT.errors.length,null,{timeout:60000});
console.log(JSON.stringify(await p.evaluate(()=>{if(!STREET.ready)return STREET_BOOT.errors;
 const m=STREET.scene.meshes.find(m=>m.material?.name==='old-paving'),b=BABYLON,uv=m.getVerticesData(b.VertexBuffer.UVKind),pos=m.getVerticesData(b.VertexBuffer.PositionKind),n=m.getVerticesData(b.VertexBuffer.NormalKind),top=[];
 for(let i=0;i<n.length;i+=3)if(n[i+1]>.9)top.push({p:pos.slice(i,i+3),uv:uv.slice(i/3*2,i/3*2+2)});
 return {paving:top.slice(0,12),texture:{u:m.material.albedoTexture.uScale,v:m.material.albedoTexture.vScale},casts:STREET.shadow.getShadowMap().renderList.length,shaderErrors:STREET.shaderErrors,snapshot:STREET.crowd.snapshot(),ao:!!STREET.ambientOcclusion,aoSupport:b.SSAO2RenderingPipeline.IsSupported,activeContacts:STREET.scene.getActiveMeshes().data.filter(m=>m?.name.includes('contact')).slice(0,5).map(m=>({name:m.name,y:m.position.y,enabled:m.isEnabled(),visible:m.isVisible})),ground:STREET.crowd.shadowSource.getVerticesData(b.VertexBuffer.PositionKind)};}),null,2));
await p.waitForTimeout(1500);await p.screenshot({path:'artifacts/refined.png'});await browser.close();})().catch(console.error);
