// People of Suncoast City: pedestrians, the fixer Rae, Sable and Marlo, the
// on-foot player with a pistol, and yard enemies with health bars.
// Figures are built from primitives; name labels are canvas-texture sprites.
import * as THREE from 'three';

/** A floating name label above a character's head. */
export function makeLabel(text, color = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 34px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(0,0,0,0.85)';
  g.strokeText(text, 128, 32);
  g.fillStyle = color;
  g.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(5.2, 1.3, 1);
  return sprite;
}

function limb(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** A walking pedestrian with a shirt colour and a simple leg-swing walk. */
export function buildPedestrian(shirtColor, pantsColor = 0x2a2a33) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.7 });
  const legL = limb(0.22, 0.8, 0.22, pants, -0.16, 0.4, 0);
  const legR = limb(0.22, 0.8, 0.22, pants, 0.16, 0.4, 0);
  const torso = limb(0.72, 0.75, 0.38, shirt, 0, 1.18, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
  head.position.set(0, 1.82, 0);
  head.castShadow = true;
  const armL = limb(0.18, 0.65, 0.18, shirt, -0.48, 1.2, 0);
  const armR = limb(0.18, 0.65, 0.18, shirt, 0.48, 1.2, 0);
  g.add(legL, legR, torso, head, armL, armR);
  return { group: g, legL, legR, armL, armR, phase: Math.random() * 6 };
}

/** Swing the limbs for a walk cycle. */
export function updatePedestrian(ped, dt, moving) {
  if (!moving) return;
  ped.phase += dt * 7;
  const s = Math.sin(ped.phase) * 0.55;
  ped.legL.rotation.x = s;
  ped.legR.rotation.x = -s;
  ped.armL.rotation.x = -s * 0.7;
  ped.armR.rotation.x = s * 0.7;
}

/** The on-foot player: dark jacket, pistol in the right hand, muzzle flash. */
export function buildPlayerOnFoot() {
  const ped = buildPedestrian(0x1f2a44, 0x3a3a44);
  const g = ped.group;
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.3, metalness: 0.7 });
  const gun = limb(0.09, 0.09, 0.55, gunMat, 0.48, 1.05, 0.35);
  g.add(gun);
  // Muzzle flash: a bright star plane plus a point light at the barrel tip.
  const flashCanvas = document.createElement('canvas');
  flashCanvas.width = 64;
  flashCanvas.height = 64;
  const fg = flashCanvas.getContext('2d');
  fg.fillStyle = '#fff6c9';
  fg.beginPath();
  fg.moveTo(32, 2);
  fg.lineTo(38, 26);
  fg.lineTo(62, 32);
  fg.lineTo(38, 38);
  fg.lineTo(32, 62);
  fg.lineTo(26, 38);
  fg.lineTo(2, 32);
  fg.lineTo(26, 26);
  fg.closePath();
  fg.fill();
  const flashTex = new THREE.CanvasTexture(flashCanvas);
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({ map: flashTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  flash.position.set(0.48, 1.05, 0.85);
  flash.visible = false;
  g.add(flash);
  const flashLight = new THREE.PointLight(0xffd75e, 0, 12);
  flashLight.position.set(0.48, 1.1, 1.0);
  g.add(flashLight);
  return { ...ped, gun, flash, flashLight, flashUntil: 0 };
}

/** Show the muzzle flash for ~90 ms. */
export function fireFlash(player, now) {
  player.flash.visible = true;
  player.flashLight.intensity = 60;
  player.flashUntil = now + 0.09;
}

/** Hide the flash once its time is up. */
export function updateFlash(player, now) {
  if (player.flash.visible && now >= player.flashUntil) {
    player.flash.visible = false;
    player.flashLight.intensity = 0;
  }
}

/** A yard enemy: red shirt, a name, and a health bar that billboards to the camera. */
export function buildEnemy(name, hp = 100) {
  const ped = buildPedestrian(0xb03030, 0x22222a);
  const g = ped.group;
  const label = makeLabel(name, '#ff8f8f');
  label.position.set(0, 2.5, 0);
  g.add(label);
  // Health bar: dark backing + green foreground that shrinks as hp falls.
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  barBg.position.set(0, 2.2, 0);
  const barFg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.44, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x4dff6a, transparent: true, opacity: 0.95, depthWrite: false }),
  );
  barFg.position.set(0, 2.2, 0.01);
  g.add(barBg, barFg);
  return { ...ped, name, hp, maxHp: hp, barBg, barFg, alive: true };
}

/** Update an enemy's health bar fill/colour and face it at the camera. */
export function updateEnemyBar(enemy, camera) {
  const frac = Math.max(0, enemy.hp / enemy.maxHp);
  enemy.barFg.scale.x = frac;
  enemy.barFg.position.x = -(1 - frac) * 0.72;
  enemy.barFg.material.color.setHex(frac > 0.5 ? 0x4dff6a : frac > 0.25 ? 0xffd75e : 0xff4444);
  enemy.barBg.quaternion.copy(camera.quaternion);
  enemy.barFg.quaternion.copy(camera.quaternion);
}

/** A named story NPC (Rae the fixer, Sable, Marlo) with a coloured label. */
export function buildNamedNPC(name, shirtColor, labelColor) {
  const ped = buildPedestrian(shirtColor, 0x2a2a33);
  const label = makeLabel(name, labelColor);
  label.position.set(0, 2.5, 0);
  ped.group.add(label);
  return { ...ped, name };
}
