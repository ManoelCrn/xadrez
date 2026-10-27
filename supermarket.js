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
  model.traverse(o => { if (/^(SideItems|Floor|TheFlowers|flowers|Others Flower|Others vaze|Tables Chair)/.test(o.name)) o.visible=false; });
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
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;room.add(m);
  }
  sign('MERCADO DA TURMA',0,floor+2.85,5.88,6);
  sign('ESTRATÉGIA EM CADA JOGADA',0,floor+2.3,5.87,4.4,'#23455b');
  const palette=[0xdf5944,0xf3bd4f,0x4b9364,0x4a87bd,0xebdbb5,0xb46685];
  const products=palette.map(color=>new THREE.InstancedMesh(geometry,material(color),160));const counts=palette.map(()=>0);const dummy=new THREE.Object3D();
  function shelf(x,z,rotation,label) {
    const g=new THREE.Group();g.position.set(x,floor,z);g.rotation.y=rotation;room.add(g);
    box(0,1,.22,2.6,2,.09,0xd8dfdd,g);
    [-1.25,1.25].forEach(a=>box(a,1,0,.065,2,.65,0x344e55,g));
    for(let row=0;row<4;row++) {
      const y=.18+row*.46;box(0,y,0,2.6,.055,.72,0xdce3df,g);box(0,y-.015,-.37,2.6,.08,.025,0xf4c754,g);
      for(let col=0;col<11;col++) for(let depth=0;depth<2;depth++) {
        const k=(col+row*2)%palette.length;dummy.position.set(-1.1+col*.22,y+.18,-.19+depth*.26);dummy.rotation.set(0,0,0);dummy.scale.set(.15,.29+(col%3)*.025,.18);dummy.updateMatrix();g.updateMatrixWorld(true);
        const matrix=new THREE.Matrix4().multiplyMatrices(g.matrixWorld,dummy.matrix);products[k].setMatrixAt(counts[k]++,matrix);
      }
    }
    sign(label,x,floor+2.23,z,2.4,'#126859',rotation);
  }
  shelf(-3.6,4.9,0,'MERCEARIA');shelf(3.6,4.9,0,'BEBIDAS');
  shelf(-4.7,1.3,Math.PI/2,'LIMPEZA');shelf(4.7,1.3,-Math.PI/2,'ALIMENTOS');
  products.forEach((m,i)=>{m.count=counts[i];m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();room.add(m);});
  [-3.7,3.7].forEach((x,i)=>{
    box(x,floor+.46,-3.6,1.8,.92,.85,0x126859);box(x,floor+.95,-3.6,1.95,.09,.95,0xe4e9e6);
    box(x+.35,floor+1.1,-3.6,.1,.3,.1,0x253d47);const screen=box(x+.35,floor+1.3,-3.6,.48,.3,.08,0x263f50);screen.rotation.x=-.15;
    sign('CAIXA 0'+(i+1),x,floor+2,-3.6,1.8,'#23455b');
  });
  const light=new THREE.HemisphereLight(0xffffff,0x9fae9d,1.5);scene.add(light);
  scene.background=new THREE.Color(0xe8eee9);
  return room;
}
