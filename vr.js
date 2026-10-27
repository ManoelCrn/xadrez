import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
export function setupVR({ renderer, scene, camera, controls, targets, select, boardCenter, canPlay, promote }) {
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  const rig = new THREE.Group(); scene.add(rig);
  const raycaster = new THREE.Raycaster();
  const rotation = new THREE.Matrix4();
  let desktopPosition, desktopQuaternion;
  const vrButton = VRButton.createButton(renderer);
  vrButton.id = 'enter-vr';
  document.body.append(vrButton);
  const controllers = [];
  const hudCanvas = document.createElement('canvas'); hudCanvas.width = 1024; hudCanvas.height = 256;
  const ctx = hudCanvas.getContext('2d');
  const hudTexture = new THREE.CanvasTexture(hudCanvas);
  const hud = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), new THREE.MeshBasicMaterial({ map: hudTexture, transparent: true, depthTest: false }));
  hud.position.set(0, -0.34, -1.1); hud.renderOrder = 100; camera.add(hud);
  const promotionGroup = new THREE.Group();
  promotionGroup.position.set(0, -0.12, -0.8); camera.add(promotionGroup);
  const promotionTargets = [];
  ['q','r','b','n'].forEach((type, i) => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
    const c = canvas.getContext('2d'); c.fillStyle = '#183d68'; c.fillRect(0,0,256,128); c.fillStyle = 'white'; c.font = 'bold 28px sans-serif'; c.textAlign = 'center'; c.fillText(['Dama','Torre','Bispo','Cavalo'][i],128,74);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.17,0.085), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
    mesh.position.x = (i - 1.5) * 0.19; mesh.userData.promotion = type; mesh.renderOrder = 101; promotionGroup.add(mesh); promotionTargets.push(mesh);
  });
  promotionGroup.visible = false;
  let status = 'Aponte para uma peça e aperte o gatilho. Depois selecione a casa.';
  const writeStatus = text => {
    status = text || 'Aponte e aperte o gatilho para jogar.';
    ctx.clearRect(0,0,1024,256); ctx.fillStyle = 'rgba(4,18,40,0.92)'; ctx.fillRect(0,0,1024,256);
    ctx.fillStyle = 'white'; ctx.font = '30px sans-serif';
    const words = status.split(' '); let line = '', y = 50;
    for (const word of words) { if (ctx.measureText(line + word).width > 960) { ctx.fillText(line,32,y); line = ''; y += 42; } line += word + ' '; }
    ctx.fillText(line,32,y); ctx.font = '25px sans-serif'; ctx.fillStyle = '#a8d4ff'; ctx.fillText('Gatilho: selecionar · Botão do sistema: sair do VR',32,226); hudTexture.needsUpdate = true;
  };
  writeStatus(status);
  function hit(controller) {
    scene.updateMatrixWorld(true);
    rotation.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0,0,-1).applyMatrix4(rotation);
    return raycaster.intersectObjects(promotionGroup.visible ? promotionTargets : targets, true)[0];
  }
  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]), new THREE.LineBasicMaterial({ color: 0x7dd3fc }));
    line.scale.z = 2; controller.add(line); rig.add(controller); controllers.push(controller);
    controller.addEventListener('selectstart', () => {
      if (!canPlay()) return;
      const intersection = hit(controller);
      if (!intersection) return;
      if (intersection.object.userData.promotion) promote(intersection.object.userData.promotion);
      else select(intersection.object);
    });
  }
  renderer.xr.addEventListener('sessionstart', () => {
    desktopPosition = camera.position.clone(); desktopQuaternion = camera.quaternion.clone();
    const center = boardCenter();
    controls.enabled = false;
    rig.position.set(center.x, center.y - 0.85, center.z + (center.black ? 0.65 : -0.65));
    rig.rotation.y = center.black ? 0 : Math.PI;
    rig.add(camera); camera.position.set(0,0,0); camera.quaternion.identity();
    document.body.classList.add('in-vr');
  });
  renderer.xr.addEventListener('sessionend', () => {
    scene.add(camera); camera.position.copy(desktopPosition); camera.quaternion.copy(desktopQuaternion);
    controls.enabled = true; controls.update(); document.body.classList.remove('in-vr');
  });
  return { status: writeStatus, update() {
    if (!renderer.xr.isPresenting) return;
    promotionGroup.visible = document.getElementById('promosion').classList.contains('promot');
    for (const controller of controllers) { const intersection = hit(controller); controller.children[0].scale.z = intersection ? intersection.distance : 2; }
  } };
}
