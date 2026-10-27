import * as THREE from 'three';
import { RoundedBoxGeometry } from './jsm/geometries/RoundedBoxGeometry.js';

// A compact store with real aisle circulation. Static meshes are instanced by
// geometry/material, and product textures are generated once, not per package.
export function createSupermarket(scene, model) {
  const room=new THREE.Group();room.name='Supermercado';scene.add(room);
  const unit=new THREE.BoxGeometry(1,1,1),round=new RoundedBoxGeometry(1,1,1,1,.08);
  const cylinder=new THREE.CylinderGeometry(.5,.5,1,10),sphere=new THREE.SphereGeometry(.5,10,7);
  const mats=new Map();
  const mat=(color)=>{if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.8}));return mats.get(color);};
  function mesh(geo,material,x,y,z,w,h,d,parent=room){const o=new THREE.Mesh(geo,material);o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;}
  const box=(x,y,z,w,h,d,color,parent=room)=>mesh(unit,mat(color),x,y,z,w,h,d,parent);
  const rounded=(x,y,z,w,h,d,color,parent=room)=>mesh(round,mat(color),x,y,z,w,h,d,parent);
  const bounds=new THREE.Box3();model.updateMatrixWorld(true);
  model.traverse(o=>{if(o.isMesh && /^Square[_ ]/.test(o.name))bounds.expandByObject(o);});
  const center=bounds.isEmpty()?new THREE.Vector3():bounds.getCenter(new THREE.Vector3());
  const size=bounds.isEmpty()?new THREE.Vector3(.65,0,.65):bounds.getSize(new THREE.Vector3());
  const floor=center.y-.82;
  model.traverse(o=>{const n=o.name.replaceAll('_',' ');if(/^(BStorage|WStorage|SideItems|Floor|TheFlowers|flowers|Others Flower|Others vaze|Tables Chair|Tables obj|Tables Leg|The Table)/.test(n)||['WTurn','BTurn'].includes(n))o.visible=false;});
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const texture=c=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;};
  function label(text,x,y,z,w,h=.22,color='#285548',angle=0,double=true){
    const c=canvas(1024,256),ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1024,256);ctx.fillStyle='#fffdf2';ctx.font='600 80px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,128,960);
    const m=new THREE.MeshBasicMaterial({map:texture(c)});
    for(let i=0;i<(double?2:1);i++){const a=angle+i*Math.PI;const o=mesh(new THREE.PlaneGeometry(w,h),m,x+Math.sin(a)*.007,y,z+Math.cos(a)*.007,1,1,1);o.rotation.y=a;o.name='Placa: '+text;}
  }
  // Materials with subtle variation, not large phototextures.
  const woodCanvas=canvas(256,256),woodCtx=woodCanvas.getContext('2d');woodCtx.fillStyle='#9b7650';woodCtx.fillRect(0,0,256,256);
  for(let i=0;i<100;i++){woodCtx.fillStyle=i%2?'#a58058':'#8d6a49';woodCtx.fillRect((i*37)%256,0,1,256);}
  const wood=new THREE.MeshStandardMaterial({map:texture(woodCanvas),roughness:.7});
  const glass=new THREE.MeshStandardMaterial({color:0xb5d2cf,transparent:true,opacity:.18,roughness:.14,metalness:.08,depthWrite:false,side:THREE.DoubleSide});
  const metal=0x626e70,ivory=0xd9dbd3,green=0x245c4b;
  // Architecture: complete enclosed retail space, storefront and visible exterior.
  box(0,floor-.07,2,14,.14,13,0xc8cbc4);
  box(0,floor+1.8,8.5,14,3.6,.18,0xd8dbd1);
  box(-7,floor+1.8,2,.18,3.6,13,0xd8dbd1);box(7,floor+1.8,2,.18,3.6,13,0xd8dbd1);
  box(0,floor+3.64,2,14,.12,13,0xd9dcd4);
  box(0,floor+.13,8.38,14,.25,.06,green);
  for(const x of [-6.88,6.88])box(x,floor+.13,2,.06,.25,13,green);
  for(let x=-7;x<=7;x++)box(x,floor+.001,2,.008,.002,13,0xaeb5ad);
  for(let z=-4;z<=8;z++)box(0,floor+.002,z,14,.002,.008,0xaeb5ad);
  // Front wall has an actual opening, two glazed shop windows and sliding leaves.
  box(-4,floor+1.75,-4.5,6,3.5,.16,0xd8dbd1);
  box(6.6,floor+1.75,-4.5,.8,3.5,.16,0xd8dbd1);
  box(3.1,floor+3.24,-4.5,6.2,.62,.17,green);
  for(const x of [.05,1.55,4.65,6.15])box(x,floor+1.4,-4.5,.055,2.8,.13,metal);
  for(const x of [.8,5.4])mesh(unit,glass,x,floor+1.4,-4.5,1.43,2.75,.025);
  for(const x of [1.8,4.4]){
    const leaf=new THREE.Group();leaf.position.set(x,floor,-4.44);room.add(leaf);leaf.name='Porta de vidro';
    mesh(unit,glass,0,1.37,0,1.5,2.72,.025,leaf);
    for(const dx of [-.75,.75])box(dx,1.38,0,.035,2.76,.06,metal,leaf);
    for(const y of [.04,2.74])box(0,y,0,1.53,.035,.06,metal,leaf);
    box(0,1.07,-.025,1.48,.09,.01,0xa1b8ac,leaf);
    box(x<3?.65:-.65,1.16,-.06,.025,.32,.025,0x3c5351,leaf);
  }
  label('ENTRADA  /  SAÍDA',3.1,floor+3.23,-4.62,2.5,.26,'#245c4b');
  box(3.1,floor+.008,-4.25,3,.015,.65,0x4e5c55);
  // Outside pavement and a planted edge are visible through the glass.
  box(3,floor-.025,-6.5,9,.05,4,0x929b95);box(3,floor-.07,-9,12,.05,2,0x596461);
  for(const x of [0,6]){box(x,floor+.2,-7.8,1.5,.4,.7,0xb0afa0);mesh(sphere,mat(0x59714e),x,floor+.7,-7.8,1.5,1,.8);}
  label('MERCADO DA TURMA',0,floor+3.02,8.36,3.8,.36,'#245c4b',Math.PI,false);
  // Lights: emissive fixtures, one hemisphere and one sun, no per-aisle lights.
  const lampMat=new THREE.MeshBasicMaterial({color:0xf4f3e8});
  for(const x of [-4.8,-1.6,1.6,4.8])for(const z of [-2,2,6]){
    box(x,floor+3.54,z,1.7,.06,.33,0x7a8580);mesh(unit,lampMat,x,floor+3.5,z,1.58,.015,.25);
  }
  // Lounge: light wood table, slender legs and rounded seating near the storefront.
  const tw=Math.max(1.28,size.x+.45),td=Math.max(1.32,size.z+.55);
  mesh(round,wood,center.x,center.y-.052,center.z,tw,.075,td);
  for(const x of [-tw*.4,tw*.4])for(const z of [-td*.39,td*.39])box(x,floor+.37,z,.055,.74,.055,0x465650);
  box(0,floor+.009,0,3.4,.012,3.65,0xa0a99c);
  for(const side of [-1,1]){
    const z=side*(td/2+.36);
    mesh(round,wood,0,floor+.46,z,.43,.055,.42);
    rounded(0,floor+.72,z+side*.18,.43,.38,.045,green);
    for(const x of [-.17,.17])for(const dz of [-.15,.15])box(x,floor+.22,z+dz,.027,.44,.027,0x465650);
  }
  const turnIndicators=[];
  for(const [i,side] of [-1,1].entries()){
    const c=canvas(512,128),ctx=c.getContext('2d');ctx.fillStyle='#285548';ctx.fillRect(0,0,512,128);ctx.fillStyle='white';ctx.font='bold 60px Arial';ctx.textAlign='center';ctx.fillText('SUA VEZ',256,86);
    const badge=mesh(new THREE.PlaneGeometry(.33,.083),new THREE.MeshBasicMaterial({map:texture(c)}),0,center.y+.016,side*(size.z/2+.115),1,1,1);badge.rotation.x=-Math.PI/2;badge.rotation.z=i?0:Math.PI;badge.visible=false;turnIndicators.push(badge);
  }
  room.userData.turnIndicators=turnIndicators;
  // A low divider leaves views of the store open, without a sign behind the table.
  for(const x of [-1.65,1.65]){rounded(x,floor+.2,1.55,.35,.4,.35,0x7c8575);for(let i=0;i<3;i++)mesh(sphere,mat(0x4b7049),x+(i-1)*.1,floor+.53+i*.07,1.55,.3,.5,.3);}
  // Six product families, reusable labels and geometry. All stock is instanced.
  const families=[
    {name:'ARROZ',color:'#c9ab69',accent:'#446c40',kind:'bag',weight:'1 kg'},
    {name:'FEIJÃO',color:'#ad624b',accent:'#843e32',kind:'bag',weight:'1 kg'},
    {name:'LEITE',color:'#e4e7df',accent:'#3b718d',kind:'carton',weight:'1 L'},
    {name:'CAFÉ',color:'#815c39',accent:'#503c29',kind:'bag',weight:'500 g'},
    {name:'MASSA',color:'#d2b654',accent:'#a54536',kind:'carton',weight:'500 g'},
    {name:'ÁGUA',color:'#a8c1b9',accent:'#2d7a7b',kind:'bottle',weight:'1,5 L'},
    {name:'DETERGENTE',color:'#b8c678',accent:'#376b51',kind:'bottle',weight:'500 ml'},
    {name:'SABÃO',color:'#d0dce3',accent:'#526b9e',kind:'carton',weight:'1 kg'}
  ];
  const prototypes=families.map(f=>{
    const c=canvas(256,384),ctx=c.getContext('2d');ctx.fillStyle=f.color;ctx.fillRect(0,0,256,384);ctx.fillStyle=f.accent;ctx.fillRect(0,20,256,62);ctx.fillRect(0,316,256,68);
    ctx.fillStyle='#fff7df';ctx.font='bold 24px Arial';ctx.textAlign='center';ctx.fillText('BOA COLHEITA',128,59);ctx.fillStyle='#fcf7e9';ctx.fillRect(14,96,228,192);
    ctx.fillStyle=f.accent;ctx.font='bold 33px Arial';ctx.fillText(f.name,128,152,214);ctx.font='18px Arial';ctx.fillText('QUALIDADE SELECIONADA',128,184);
    ctx.fillStyle=f.color;ctx.beginPath();ctx.ellipse(128,233,48,28,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff7df';ctx.font='bold 29px Arial';ctx.fillText(f.weight,128,360);
    return {f,body:[],front:[],cap:[],map:texture(c)};
  });
  const dummy=new THREE.Object3D();
  function addStock(g,k,x,y,z){
    const p=prototypes[k],bottle=p.f.kind==='bottle';const w=bottle?.12:.16,h=bottle?.3:.29,d=bottle?.12:.13;
    dummy.position.set(x,y+h/2,z);dummy.rotation.set(0,0,0);dummy.scale.set(w,h,d);dummy.updateMatrix();g.updateMatrixWorld(true);p.body.push(new THREE.Matrix4().multiplyMatrices(g.matrixWorld,dummy.matrix));
    if(bottle){dummy.position.y+=h/2+.025;dummy.scale.set(.045,.05,.045);dummy.updateMatrix();p.cap.push(new THREE.Matrix4().multiplyMatrices(g.matrixWorld,dummy.matrix));}
    dummy.position.set(x,y+h/2,z-d/2-.002);dummy.rotation.y=Math.PI;dummy.scale.set(w*.94,h*.94,1);dummy.updateMatrix();p.front.push(new THREE.Matrix4().multiplyMatrices(g.matrixWorld,dummy.matrix));
  }
  const pricingCanvas=canvas(512,64),pc=pricingCanvas.getContext('2d');pc.fillStyle='#eee8d4';pc.fillRect(0,0,512,64);pc.fillStyle='#353c32';pc.font='bold 23px Arial';for(let i=0;i<4;i++)pc.fillText(['R$ 5,99','R$ 7,49','R$ 4,89','R$ 8,90'][i],i*128+12,42);
  const pricing=new THREE.MeshBasicMaterial({map:texture(pricingCanvas)});
  function shelf(x,z,angle,width,category,types,signage=true){
    const g=new THREE.Group();g.position.set(x,floor,z);g.rotation.y=angle;room.add(g);g.name='Gôndola '+category;
    box(0,.95,.23,width,1.9,.05,ivory,g);box(0,.09,0,width,.18,.64,0x78847c,g);
    for(const dx of [-width/2,width/2])box(dx,.95,.23,.045,1.9,.045,metal,g);
    for(let row=0;row<4;row++){
      const y=.23+row*.43;box(0,y,0,width,.03,.6,ivory,g);box(0,y-.035,-.31,width,.07,.018,0x9e9b73,g);
      const price=mesh(new THREE.PlaneGeometry(width,.055),pricing,0,y-.035,-.322,1,1,1,g);price.rotation.y=Math.PI;
      const columns=Math.floor((width-.16)/.2);
      for(let col=0;col<columns;col++)for(let depth=0;depth<2;depth++)addStock(g,types[(Math.floor(col/3)+row)%types.length],-width/2+.16+col*.2,y+.02,-.16+depth*.2);
    }
    if(signage){const pos=new THREE.Vector3(0,2.08,0).applyMatrix4(g.matrixWorld);label(category,pos.x,pos.y,pos.z,Math.min(width,1.45),.2,'#285548',angle);}
  }
  // Long, double-sided gondolas form three shopping aisles behind the lounge.
  for(const [x,name,types] of [[-3.5,'MERCEARIA',[0,1,3]],[0,'ALIMENTOS',[0,1,4]],[3.5,'BEBIDAS',[2,5]]]){
    shelf(x-.29,4.65,Math.PI/2,4.2,name,types,true);
    shelf(x+.29,4.65,-Math.PI/2,4.2,name,types,false);
    for(const z of [2.53,6.77])box(x,floor+.88,z,.63,1.76,.065,ivory);
    label('OFERTAS',x,floor+1.25,2.485,.48,.18,'#8c693b',Math.PI,false);
    label('DA SEMANA',x,floor+1.05,2.484,.48,.13,'#8c693b',Math.PI,false);
  }
  shelf(-6.45,4.6,-Math.PI/2,4.4,'LIMPEZA',[6,7],true);
  // Back wall refrigerator bank, with glass doors, handles and bottle stock.
  for(const x of [-4.9,-3.25,-1.6,.05,1.7,3.35,5]){
    box(x,floor+1.05,8.25,1.58,2.1,.08,0x445653);box(x,floor+1.05,8.19,1.45,1.95,.035,0x89a09a);
    for(const dx of [-.77,.77])box(x+dx,floor+1.05,7.9,.04,2.1,.75,0x445653);box(x,floor+2.08,7.9,1.58,.06,.75,0x445653);
    for(let r=0;r<4;r++){
      box(x,floor+.25+r*.43,7.56,1.42,.025,.55,0xbecdc4);
      const g=new THREE.Group();g.position.set(x,floor,7.67);room.add(g);for(let col=0;col<6;col++)addStock(g,r%2?2:5,-.56+col*.21,.27+r*.43,0);
    }
    mesh(unit,glass,x,floor+1.05,7.27,1.46,1.95,.018);for(const dx of [-.76,.76])box(x+dx,floor+1.05,7.25,.04,2.03,.07,0x394c48);box(x+.58,floor+1.04,7.19,.025,.45,.03,0xc8d4ce);
  }
  label('LATICÍNIOS  •  REFRIGERADOS',0,floor+2.35,7.26,3.5,.23,'#285548',Math.PI,false);
  // Produce display on the right, leaving a direct path from storefront to aisles.
  for(const [x,z,color] of [[5.75,.4,0xc95e37],[5.75,1.55,0x83a04b]]){
    mesh(round,wood,x,floor+.42,z,1.5,.8,1);box(x,floor+.83,z,1.5,.07,1,0x3d5141);
    for(let a=0;a<3;a++)for(let b=0;b<3;b++)mesh(sphere,mat(color),x-.52+a*.46,floor+.95,z-.32+b*.3,.25,.24,.25);
  }
  label('HORTIFRÚTI',5.75,floor+1.65,.9,1.4,.22,'#285548',-Math.PI/2);
  // Checkouts: conveyor, scanner, till and bagging area with the staff behind.
  for(const x of [-5.15,-3.05]){
    rounded(x,floor+.46,-1.9,1.8,.9,.85,green);rounded(x,floor+.94,-1.9,1.88,.06,.92,0xb7c1b8);
    box(x-.35,floor+.98,-1.9,.9,.02,.65,0x303b38);box(x+.24,floor+1,-1.9,.22,.045,.28,0x253d36);
    box(x+.65,floor+1.12,-1.82,.035,.3,.035,metal);const screen=box(x+.65,floor+1.31,-1.82,.35,.24,.035,0x243833);screen.rotation.x=-.1;
    box(x+.9,floor+1.05,-1.9,.25,.18,.33,0xa78c64);label('CAIXA '+(x<-4?'01':'02'),x,floor+1.7,-1.9,.68,.16,'#285548');
  }
  // Stock batching is independent from scene batching, preserving shared labels.
  function instances(geo,material,matrices,name){if(!matrices.length)return;const m=new THREE.InstancedMesh(geo,material,matrices.length);m.name=name;matrices.forEach((a,i)=>m.setMatrixAt(i,a));m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();room.add(m);}
  prototypes.forEach(p=>{instances(p.f.kind==='bottle'?cylinder:unit,mat(new THREE.Color(p.f.color).getHex()),p.body,'Produtos '+p.f.name);instances(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:p.map}),p.front,'Rótulos '+p.f.name);instances(cylinder,mat(0x426c6b),p.cap,'Tampas');});
  const capsule=new THREE.CapsuleGeometry(.5,1,3,8);
  const torsoGeometry=new THREE.CylinderGeometry(.17,.145,.48,10);
  const limbGeometry=new THREE.CylinderGeometry(.055,.045,1,8);
  const smoothSphere=new THREE.SphereGeometry(.5,12,8);
  function person(x,z,shirt,skin,rotation=0,cashier=false) {
    const g=new THREE.Group();g.name=cashier?'Atendente do caixa':'Cliente';g.position.set(x,floor,z);g.rotation.y=rotation;room.add(g);
    const part=(geo,color,pos,scale)=>{const m=new THREE.Mesh(geo,mat(color));m.position.set(...pos);m.scale.set(...scale);g.add(m);return m;};
    part(torsoGeometry,shirt,[0,1.16,0],[1,1,1.3]);
    part(smoothSphere,shirt,[0,.93,0],[.31,.22,.26]);
    part(limbGeometry,skin,[0,1.46,0],[.8,.12,.8]);
    part(smoothSphere,skin,[0,1.61,-.006],[.205,.27,.22]);
    part(smoothSphere,0x40322b,[0,1.7,.02],[.216,.13,.22]);
    part(smoothSphere,skin,[0,1.61,-.115],[.045,.055,.045]);
    for(const side of [-1,1]) {
      part(smoothSphere,0x303631,[side*.043,1.645,-.106],[.013,.013,.009]);
      const leg=part(limbGeometry,0x465260,[side*.085,.52,side*.018],[1.22,.75,1.3]);leg.rotation.z=side*.035;
      part(smoothSphere,0x303a3d,[side*.1,.105,-.055],[.15,.13,.3]);
      const upper=part(limbGeometry,shirt,[side*.21,1.24,-.005],[1.12,.28,1.12]);upper.rotation.z=side*.17;
      const forearm=part(limbGeometry,skin,[side*.245,.995,-.035],[.85,.25,.85]);forearm.rotation.x=-.16;
      part(smoothSphere,skin,[side*.245,.85,-.06],[.09,.14,.09]);
    }
    if(cashier) {
      part(torsoGeometry,0x126859,[0,1.12,-.022],[.87,.95,1.31]);
      box(-.075,1.32,-.219,.07,.035,.008,0xffffff,g);
    } else {
      box(.28,.69,-.065,.27,.18,.2,0xb89765,g);
      part(new THREE.TorusGeometry(.08,.009,4,10),0x735b3d,[.28,.83,-.065],[1,.8,1]);
    }
  }

  person(-5.15,-2.55,0xe2dfcf,0xd4a37c,Math.PI,true);
  person(-3.05,-2.55,0xe2dfcf,0x986b50,Math.PI,true);
  person(-3.05,-.85,0x52748c,0xbd8a65,0);
  person(-1.25,4,0xa66a56,0xd4a37c,Math.PI/2);
  person(1.75,5.5,0x796484,0x986b50,-Math.PI/2);
  person(4.7,.9,0xc2a25b,0xbd8a65,-Math.PI/2);
  // Proper shopping trolley: wheels, lower chassis, uprights and wire basket.
  function cart(x,z){
    const g=new THREE.Group();g.position.set(x,floor,z);room.add(g);g.name='Carrinho';
    const tube=(a,b,r=.012)=>{const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);const o=mesh(cylinder,mat(0x879896),...(va.clone().add(vb).multiplyScalar(.5).toArray()),r*2,delta.length(),r*2,g);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());};
    for(const dx of [-.25,.25])for(const dz of [-.32,.32]){const w=mesh(cylinder,mat(0x303c37),dx,.075,dz,.12,.04,.12,g);w.rotation.z=Math.PI/2;}
    for(const dx of [-.25,.25]){tube([dx,.12,-.32],[dx,.12,.32]);tube([dx,.12,-.3],[dx,.88,-.3]);tube([dx,.47,-.3],[dx,.47,.38]);tube([dx,.47,.38],[dx,.84,.38]);}
    for(const y of [.48,.6,.72,.84]){
      tube([-.27,y,-.3],[-.27,y,.38]);tube([.27,y,-.3],[.27,y,.38]);tube([-.27,y,.38],[.27,y,.38]);tube([-.27,y,-.3],[.27,y,-.3]);
    }
    for(let i=0;i<6;i++){const z=-.3+i*.136;tube([-.27,.48,z],[-.27,.84,z],.007);tube([.27,.48,z],[.27,.84,z],.007);tube([-.27,.48,z],[.27,.48,z],.007);}
    tube([-.3,.9,-.33],[.3,.9,-.33],.023);
  }
  cart(5.3,-3.35);cart(6.05,-3.35);
  // A single shared soft contact texture anchors furniture and customers.
  const shadowCanvas=canvas(128,128),sc=shadowCanvas.getContext('2d'),gradient=sc.createRadialGradient(64,64,8,64,64,64);
  gradient.addColorStop(0,'rgba(20,30,21,.35)');gradient.addColorStop(1,'rgba(20,30,21,0)');sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
  const shadowMat=new THREE.MeshBasicMaterial({map:texture(shadowCanvas),transparent:true,depthWrite:false});
  for(const [x,z,w,d] of [[0,0,2.2,2.2],[-5.15,-2.55,.75,.6],[-3.05,-2.55,.75,.6],[-3.05,-.85,.75,.6],[-1.25,4,.75,.6],[1.75,5.5,.75,.6],[4.7,.9,.75,.6]]){
    const o=mesh(new THREE.PlaneGeometry(w,d),shadowMat,x,floor+(x===0?.024:.004),z,1,1,1);o.rotation.x=-Math.PI/2;
  }
  scene.add(new THREE.HemisphereLight(0xf2f3e9,0x687766,.65));scene.background=new THREE.Color(0xb4c4bf);scene.fog=new THREE.Fog(0xbec7be,16,32);
  // Opaque static furniture and figures are batched; glass stays separate for sorting.
  room.updateMatrixWorld(true);const groups=new Map(),originals=[];
  room.traverse(o=>{if(!o.isMesh || o.isInstancedMesh || o.material.transparent || o.material.map)return;
    const key=o.geometry.uuid+':'+o.material.uuid;if(!groups.has(key))groups.set(key,{geo:o.geometry,material:o.material,matrices:[]});groups.get(key).matrices.push(o.matrixWorld.clone());originals.push(o);
  });
  originals.forEach(o=>o.removeFromParent());for(const {geo,material,matrices} of groups.values())instances(geo,material,matrices,'Estrutura');
  return room;
}
