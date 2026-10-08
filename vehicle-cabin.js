/* Interior visibility copies are created only for a vehicle the player enters.
   Exterior scans and shared traffic geometry retain their full bodywork. */
window.QuarterVehicleCabin=class QuarterVehicleCabin {
 constructor(B,scene){this.B=B;this.scene=scene;this.cache=new Map();this.active=null;this.textures=new Map();}
 async load(records){for(const record of records)for(const mesh of record.root.getChildMeshes()){const tex=(mesh.sourceMesh||mesh).material?.albedoTexture;if(tex&&!this.textures.has(tex))this.textures.set(tex,{pixels:await tex.readPixels(),size:tex.getSize()});}}
 prepare(record){if(this.cache.has(record.root))return this.cache.get(record.root);const B=this.B,root=record.root,hip=root.driver.hip,shape=root.collision,originals=root.getChildMeshes().filter(m=>m.getTotalVertices()>0&&!(m.sourceMesh||m).skeleton&&!/contact/.test(m.name)),copies=[];
  for(const original of originals){if(/wheel|spin|contact/.test(original.name))continue;const source=original.sourceMesh||original,relative=original.computeWorldMatrix(true).multiply(B.Matrix.Invert(root.computeWorldMatrix(true))),positions=source.getVerticesData(B.VertexBuffer.PositionKind),indices=source.getIndices(),uv=source.getVerticesData(B.VertexBuffer.UVKind),texture=this.textures.get(source.material.albedoTexture),points=[];
   for(let i=0;i<positions.length;i+=3)points.push(B.Vector3.TransformCoordinates(new B.Vector3(positions[i],positions[i+1],positions[i+2]),relative));
   const kept=[];for(let i=0;i<indices.length;i+=3){const p=points[indices[i]].add(points[indices[i+1]]).add(points[indices[i+2]]).scale(1/3),pixel=(()=>{if(!texture?.pixels||!uv)return [0,0,0];const k=indices[i],x=Math.max(0,Math.min(texture.size.width-1,Math.floor(uv[k*2]*texture.size.width))),y=Math.max(0,Math.min(texture.size.height-1,Math.floor(uv[k*2+1]*texture.size.height))),offset=(y*texture.size.width+x)*4;return Array.from(texture.pixels.slice(offset,offset+3));})(),neutral=Math.max(...pixel)-Math.min(...pixel)<90,glass=neutral&&!(record.kind==='rickshaw'&&Math.abs(p.x)>.55&&p.y>1.46&&p.y<1.90)&&p.y>hip[1]+.22&&p.y<hip[1]+1.20&&p.z>hip[2]+(record.kind==='rickshaw'?.25:.40)&&p.z<shape.maxZ*.91&&Math.abs(p.x)<shape.halfWidth*.96,roof=false,rearSeat=record.kind==='rickshaw'&&Math.abs(p.x)<shape.halfWidth*.96&&p.z<hip[2]&&p.y>.55&&p.y<hip[1]+.70;
    if(!glass&&!roof&&!rearSeat)kept.push(indices[i],indices[i+1],indices[i+2]);}
   if(kept.length===indices.length)continue;const copy=source.clone('cabin-'+original.name,null,true);copy.makeGeometryUnique();copy.setIndices(kept);copy.parent=root;copy.rotationQuaternion=B.Quaternion.Identity();relative.decompose(copy.scaling,copy.rotationQuaternion,copy.position);copy.unfreezeWorldMatrix();copy.isVisible=true;copy.setEnabled(false);copy.isPickable=false;copies.push({original,copy});
  }
  const interior=[];
  if(record.kind==='car'){
   const material=new B.PBRMaterial('cabin-trim-'+root.name,this.scene);material.albedoColor=new B.Color3(.045,.052,.052);material.roughness=.82;material.metallic=.03;
   const make=(name,size,position)=>{const mesh=B.MeshBuilder.CreateBox(name,size,this.scene);mesh.parent=root;mesh.position.set(...position);mesh.material=material;mesh.isPickable=false;mesh.setEnabled(false);interior.push(mesh);return mesh;};
   make('interior-dashboard',{width:shape.halfWidth*1.68,height:.18,depth:.35},[0,hip[1]+.22,hip[2]+.72]);
   for(const side of [-1,1]){make('interior-door-trim',{width:.06,height:.28,depth:1.50},[side*shape.halfWidth*.86,hip[1]+.02,hip[2]]);make('interior-windscreen-pillar',{width:.045,height:.64,depth:.055},[side*shape.halfWidth*.82,hip[1]+.60,hip[2]+.70]);}
   const steering=B.MeshBuilder.CreateTorus('interior-steering-wheel',{diameter:.35,thickness:.027,tessellation:24},this.scene);steering.parent=root;steering.position.set(hip[0],hip[1]+.32,hip[2]+.52);steering.rotation.x=1.14;steering.material=material;steering.setEnabled(false);interior.push(steering);
  }
  const cabin={record,copies,interior};this.cache.set(root,cabin);return cabin;
 }
 update(record,inside){const next=inside?this.prepare(record):null;if(next===this.active)return;if(this.active)for(const {original,copy} of this.active.copies){original.isVisible=true;copy.setEnabled(false);}if(this.active)for(const m of this.active.interior)m.setEnabled(false);this.active=next;if(next)for(const m of next.interior)m.setEnabled(true);if(next)for(const {original,copy} of next.copies){original.isVisible=false;copy.setEnabled(true);}}
};
