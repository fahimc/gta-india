/* Clothing-only per-instance colour. Shared maps, geometry and bone palettes. */
window.QuarterClothing={
 colours:[[1,1,1],[.46,.78,1.28],[.58,1.14,.69],[1.18,.53,.60],[1.20,.99,.55],[.76,.56,1.20],[.53,.86,.88],[1.16,.79,.60]],
 tint(B,mesh,id){const c=this.colours[((id%this.colours.length)+this.colours.length)%this.colours.length];mesh.instancedBuffers.clothingTint=new B.Vector4(...c,1);},
 prepare(B,mesh){
  if(!mesh.material._quarterClothes){
   class Clothes extends B.MaterialPluginBase {
    constructor(material){super(material,'QuarterClothes',170,{});this._enable(true);}
    getAttributes(attributes){attributes.push('clothMask','clothingTint');}
    getCustomCode(type){return type==='vertex'?{
     CUSTOM_VERTEX_DEFINITIONS:'attribute float clothMask; varying float vClothMask; varying vec3 vClothingTint;\n#ifdef INSTANCES\nattribute vec4 clothingTint;\n#endif',
     CUSTOM_VERTEX_MAIN_END:'vClothMask=clothMask; vClothingTint=vec3(1.0);\n#ifdef INSTANCES\nvClothingTint=clothingTint.rgb;\n#endif'
    }:{CUSTOM_FRAGMENT_DEFINITIONS:'varying float vClothMask; varying vec3 vClothingTint;',CUSTOM_FRAGMENT_UPDATE_ALBEDO:'surfaceAlbedo *= mix(vec3(1.0), vClothingTint, vClothMask);'};}
   }
   mesh.material._quarterClothes=new Clothes(mesh.material);
  }
  if(!mesh.isVerticesDataPresent('clothMask'))mesh.setVerticesData('clothMask',new Float32Array(mesh.getTotalVertices()),false,1);
  mesh.registerInstancedBuffer('clothingTint',4);mesh.instancedBuffers.clothingTint=new B.Vector4(1,1,1,1);
 },
 async mask(B,mesh,female){
  const tex=mesh.material.albedoTexture,rgba=await tex.readPixels(),size=tex.getSize(),uv=mesh.getVerticesData(B.VertexBuffer.UVKind),joints=mesh.getVerticesData(B.VertexBuffer.MatricesIndicesKind),weights=mesh.getVerticesData(B.VertexBuffer.MatricesWeightsKind),bones=mesh.skeleton.bones,mask=new Float32Array(mesh.getTotalVertices());
  for(let i=0;i<mask.length;i++){
   let cloth=0;for(let k=0;k<4;k++)if(/Spine|UpLeg|Leg$|Arm$/.test(bones[joints[i*4+k]]?.name||'')&&!/ForeArm/.test(bones[joints[i*4+k]]?.name||''))cloth+=weights[i*4+k];
   if(female&&rgba){const x=Math.max(0,Math.min(size.width-1,Math.floor(uv[i*2]*size.width))),y=Math.max(0,Math.min(size.height-1,Math.floor(uv[i*2+1]*size.height))),p=(y*size.width+x)*4,r=rgba[p],g=rgba[p+1],b=rgba[p+2];if(r>g*1.09&&g>b*1.12&&r-b>20)cloth=0;}
   mask[i]=Math.min(1,cloth);
  }
  mesh.setVerticesData('clothMask',mask,false,1);
 }
};
