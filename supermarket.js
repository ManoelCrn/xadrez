import * as THREE from 'three';

// Procedural scenery: shared geometry and instanced products keep VR draw calls low.
export function createSupermarket(scene, model) {
  const room = new THREE.Group(); room.name = 'Supermercado'; scene.add(room);
  const materials = new Map();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = color => { if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({color, roughness: .78})); return materials.get(color); };
  const box = (x,y,z,w,h,d,color,parent=room) => { const m = new THREE.Mesh(geometry,material(color)); m.position.set(x,y,z); m.scale.set(w,h,d); parent.add(m); return m; };
  const bounds = new THREE.Box3();
  model.updateMatrixWorld(true);
  model.traverse(o => { if (o.isMesh && /Square_/.test(o.name)) bounds.expandByObject(o); });
  const center = bounds.isEmpty() ? new THREE.Vector3(0,0,0) : bounds.getCenter(new THREE.Vector3());
  const floor = center.y - .82;
  // Replace the original room while retaining the board, table and game objects.
  model.traverse(o => {
    const name=o.name.replaceAll('_',' ');
    if (/^(SideItems|Floor|TheFlowers|flowers|Others Flower|Others vaze|Tables Chair|Tables obj|Tables Leg|The Table)/.test(name)) o.visible=false;
  });
  const size=bounds.isEmpty()?new THREE.Vector3(1,0,1):bounds.getSize(new THREE.Vector3());
  const tableWidth=Math.max(1.45,size.x+.5), tableDepth=Math.max(1.65,size.z+.8);
  // Checkout-style game counter, with a clear playing surface.
  box(center.x,center.y-.065,center.z,tableWidth,.1,tableDepth,0xe8e9df);
  box(center.x,center.y-.15,center.z,tableWidth,.08,tableDepth,0x126859);
  box(center.x, floor+.34,center.z,tableWidth*.78,.68,tableDepth*.65,0xd5dcda);
  box(center.x, floor+.37,center.z-tableDepth*.33-.008,tableWidth*.78,.42,.018,0x126859);
  sign('CAIXA DO XADREZ',center.x,floor+.4,center.z-tableDepth*.33-.022,tableWidth*.65,'#126859',Math.PI);
  for(const side of [-1,1]) {
    const z=center.z+side*(tableDepth/2+.38);
    box(center.x,floor+.47,z,.46,.07,.43,0x126859);
    box(center.x,floor+.76,z+side*.2,.46,.45,.055,0x126859);
    for(const dx of [-.18,.18]) for(const dz of [-.15,.15])box(center.x+dx,floor+.23,z+dz,.035,.46,.035,0x344e55);
  }
  // Replace the English 3D lettering while retaining the turn animation objects.
  model.traverse(o=>{
    if(!['WTurn','BTurn'].includes(o.name))return;
    const c=document.createElement('canvas');c.width=512;c.height=128;
    const ctx=c.getContext('2d');ctx.fillStyle='#126859';ctx.fillRect(0,0,512,128);ctx.fillStyle='#ffffff';ctx.font='bold 68px sans-serif';ctx.textAlign='center';ctx.fillText('SUA VEZ',256,89);
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    o.geometry=new THREE.PlaneGeometry(2.7,.7);o.material=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide});
  });
  box(0,floor-.06,0,14,.12,14,0xe8e6db);
  box(0,floor+1.7,6,14,3.4,.15,0xf3f0e7);
  box(-6.5,floor+1.7,0,.15,3.4,12,0xf3f0e7);
  box(6.5,floor+1.7,0,.15,3.4,12,0xf3f0e7);
  for(let i=-6;i<=6;i++) {box(i,floor+.003,0,.012,.006,12,0xc9cfc9);box(0,floor+.004,i,13,.006,.012,0xc9cfc9);}
  function sign(text,x,y,z,w=2.3,color='#126859',rotation=0) {
    const c=document.createElement('canvas');c.width=1024;c.height=256;
    const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1024,256);
    ctx.fillStyle='#f8cc60';ctx.fillRect(0,230,1024,26);ctx.fillStyle='white';ctx.font='bold 76px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,121,970);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    for(const side of [0,1]) {
      const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:t,side:THREE.FrontSide}));
      const angle=rotation+side*Math.PI;
      m.position.set(x+Math.sin(angle)*.008,y,z+Math.cos(angle)*.008);m.rotation.y=angle;room.add(m);
    }
  }
  sign('MERCADO DA TURMA',0,floor+2.85,5.88,6);
  sign('ESTRATÉGIA EM CADA JOGADA',0,floor+2.3,5.87,4.4,'#23455b');
  const palette=[0xdf5944,0xf3bd4f,0x4b9364,0x4a87bd,0xebdbb5,0xb46685];
  const cylinder=new THREE.CylinderGeometry(.5,.5,1,10);
  const sphere=new THREE.SphereGeometry(.5,8,6);
  const products=palette.map((color,i)=>new THREE.InstancedMesh(i===2 || i===5 ? cylinder : geometry,material(color),160));
  const caps=[2,5].map(k=>({k,mesh:new THREE.InstancedMesh(cylinder,material(k===2?0xffffff:0x1c5367),160),count:0}));const counts=palette.map(()=>0);const dummy=new THREE.Object3D();
  const productNames=['ARROZ','FEIJÃO','LEITE','CAFÉ','MASSA','LIMPEZA'];
  const labels=productNames.map((name,i)=>{
    const c=document.createElement('canvas');c.width=256;c.height=192;const ctx=c.getContext('2d');
    ctx.fillStyle='#fff9e8';ctx.fillRect(0,0,256,192);ctx.fillStyle='#183c36';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.fillText(name,128,78);ctx.font='28px sans-serif';ctx.fillText('MERCADO',128,128);
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    return new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map}),160);
  });
  function shelf(x,z,rotation,label) {
    const g=new THREE.Group();g.position.set(x,floor,z);g.rotation.y=rotation;room.add(g);
    box(0,1,.22,2.6,2,.09,0xd8dfdd,g);
    [-1.25,1.25].forEach(a=>box(a,1,0,.065,2,.65,0x344e55,g));
    for(let row=0;row<4;row++) {
      const y=.18+row*.46;box(0,y,0,2.6,.055,.72,0xdce3df,g);box(0,y-.015,-.37,2.6,.08,.025,0xf4c754,g);
      for(let col=0;col<11;col++) for(let depth=0;depth<2;depth++) {
        const k=(col+row*2)%palette.length;dummy.position.set(-1.1+col*.22,y+.18,-.19+depth*.26);dummy.rotation.set(0,0,0);dummy.scale.set(k===2||k===5?.14:.15,k===5?.24:.29+(col%3)*.025,k===2||k===5?.14:.18);dummy.updateMatrix();g.updateMatrixWorld(true);
        const matrix=new THREE.Matrix4().multiplyMatrices(g.matrixWorld,dummy.matrix);products[k].setMatrixAt(counts[k],matrix);
        const cap=caps.find(c=>c.k===k);
        if(cap) {
          const bottle=new THREE.Object3D();bottle.position.copy(dummy.position);bottle.position.y+=dummy.scale.y*.5+.035;bottle.scale.set(.065,.07,.065);bottle.updateMatrix();
          cap.mesh.setMatrixAt(cap.count++,new THREE.Matrix4().multiplyMatrices(g.matrixWorld,bottle.matrix));
        }
        dummy.position.z-=.091;dummy.position.y-=.015;dummy.scale.set(.13,.15,1);dummy.updateMatrix();
        labels[k].setMatrixAt(counts[k],new THREE.Matrix4().multiplyMatrices(g.matrixWorld,dummy.matrix).multiply(new THREE.Matrix4().makeRotationY(Math.PI)));
        counts[k]++;
      }
    }
    sign(label,x,floor+2.23,z,2.4,'#126859',rotation);
  }
  shelf(-3.6,4.9,0,'MERCEARIA');shelf(3.6,4.9,0,'BEBIDAS');
  shelf(-4.7,1.3,-Math.PI/2,'LIMPEZA');shelf(4.7,1.3,Math.PI/2,'ALIMENTOS');
  products.forEach((m,i)=>{m.count=counts[i];m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();room.add(m);});
  caps.forEach(({mesh,count})=>{mesh.count=count;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();room.add(mesh);});
  labels.forEach((m,i)=>{m.count=counts[i];m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();room.add(m);});
  // Produce bins, a basket stack and shopping carts establish the retail setting.
  for(const x of [-2.8,2.8]) {
    box(x,floor+.38,-.9,1.15,.76,.85,0x9e7850);
    box(x,floor+.78,-.9,1.22,.08,.92,0x344e55);
    const fruit=new THREE.InstancedMesh(sphere,material(x<0?0xd65d37:0x83a844),24);let index=0;
    for(let i=0;i<6;i++)for(let j=0;j<4;j++) {
      const item=new THREE.Object3D();item.position.set(x-.46+i*.18,floor+.9,-1.2+j*.2);item.scale.set(.17,.16,.17);item.updateMatrix();fruit.setMatrixAt(index++,item.matrix);
    }
    fruit.instanceMatrix.needsUpdate=true;fruit.computeBoundingSphere();room.add(fruit);
    sign(x<0?'HORTIFRÚTI':'OFERTAS',x,floor+1.45,-.9,1.35);
  }
  function cart(x,z) {
    const g=new THREE.Group();g.position.set(x,floor,z);room.add(g);
    for(const dx of [-.23,.23])for(const dz of [-.34,.34])box(dx,.09,dz,.09,.15,.09,0x243d44,g);
    for(const dx of [-.28,.28]) {
      box(dx,.4,0,.035,.6,.035,0xa2b4b8,g);
      for(let k=0;k<4;k++)box(dx,.5+k*.09,0,.025,.025,.75,0xa2b4b8,g);
    }
    for(const dz of [-.37,.37])for(let k=0;k<4;k++)box(0,.5+k*.09,dz,.58,.025,.025,0xa2b4b8,g);
    box(0,.47,0,.58,.03,.75,0xa2b4b8,g);box(0,.88,-.44,.65,.045,.05,0x126859,g);
  }
  cart(-2.5,-2.8);cart(-3.3,-2.8);
  sign('ENTRADA • BEM-VINDOS',0,floor+2.7,-5.8,4,'#126859',Math.PI);
  [-3.7,3.7].forEach((x,i)=>{
    box(x,floor+.46,-3.6,1.8,.92,.85,0x126859);box(x,floor+.95,-3.6,1.95,.09,.95,0xe4e9e6);
    box(x+.35,floor+1.1,-3.6,.1,.3,.1,0x253d47);const screen=box(x+.35,floor+1.3,-3.6,.48,.3,.08,0x263f50);screen.rotation.x=-.15;
    sign('CAIXA 0'+(i+1),x,floor+2,-3.6,1.8,'#23455b');
  });
  function person(x,z,shirt,skin,rotation=0,cashier=false) {
    const g=new THREE.Group();g.name=cashier?'Atendente do caixa':'Cliente';g.position.set(x,floor,z);g.rotation.y=rotation;room.add(g);
    const head=new THREE.Mesh(sphere,material(skin));head.position.y=1.57;head.scale.set(.23,.29,.23);g.add(head);
    const hair=new THREE.Mesh(sphere,material(0x49352a));hair.position.set(0,1.67,.015);hair.scale.set(.24,.16,.24);g.add(hair);
    box(0,1.15,0,.4,.53,.24,shirt,g);
    for(const side of [-1,1]) {
      box(side*.105,.52,0,.15,.75,.19,0x344554,g);box(side*.105,.11,-.05,.17,.13,.3,0x26343a,g);
      const arm=box(side*.27,1.15,-.02,.13,.5,.14,shirt,g);arm.rotation.z=side*.12;
      box(side*.29,.87,-.04,.11,.15,.12,skin,g);
    }
    if(cashier) {box(0,1.13,-.128,.3,.4,.015,0x126859,g);box(-.1,1.28,-.143,.085,.045,.01,0xffffff,g);}
    else {box(.3,.67,-.05,.34,.22,.25,0xd89d39,g);box(.3,.84,-.05,.025,.14,.025,0x344e55,g);}
  }
  person(-3.7,-4.25,0xf0eee6,0xd4a37c,0,true);
  person(3.7,-4.25,0xf0eee6,0x986b50,0,true);
  person(-3.7,-2.5,0x5274a4,0xbd8a65,Math.PI);
  person(2.8,2.5,0xb66554,0xe0b18b,-Math.PI/2);
  person(-3.15,3.5,0x8068a3,0x986b50,Math.PI/2);
  person(4,-.8,0xdfb65a,0xbd8a65,-Math.PI/2);
  const light=new THREE.HemisphereLight(0xffffff,0x9fae9d,1.5);scene.add(light);
  scene.background=new THREE.Color(0xe8eee9);
  room.updateMatrixWorld(true);
  const batches=new Map(), originals=[];
  room.traverse(o=>{
    if(o.isMesh && !o.isInstancedMesh && o.geometry===geometry) {
      if(!batches.has(o.material))batches.set(o.material,[]);
      batches.get(o.material).push(o.matrixWorld.clone()); originals.push(o);
    }
  });
  originals.forEach(o=>o.removeFromParent());
  for(const [mat,matrices] of batches) {
    const mesh=new THREE.InstancedMesh(geometry,mat,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();room.add(mesh);
  }
  return room;
}
