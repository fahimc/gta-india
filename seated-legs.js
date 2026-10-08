/* Small CCD solve, run once per cached seated pose, never per driver/frame. */
window.QuarterSeatedLegs={solve(B,nodes,side,target){
 const get=name=>nodes[name]?.node||nodes[name],end=get(side+'Foot');
 for(let i=0;i<16;i++)for(const name of [side+'Leg',side+'UpLeg']){
  const node=get(name);node.computeWorldMatrix(true);end.computeWorldMatrix(true);
  const origin=node.getAbsolutePosition(),current=end.getAbsolutePosition().subtract(origin).normalize(),wanted=target.subtract(origin).normalize(),axis=B.Vector3.Cross(current,wanted),length=axis.length();if(length<.00001)continue;
  const world=node.getWorldMatrix(),local=B.Vector3.TransformNormal(axis.scale(1/length),B.Matrix.Invert(world)).normalize().scale(world.determinant()<0?-1:1),angle=Math.acos(Math.max(-1,Math.min(1,B.Vector3.Dot(current,wanted))));node.rotationQuaternion=node.rotationQuaternion.multiply(B.Quaternion.RotationAxis(local,angle));
 }
}};
