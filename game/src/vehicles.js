// Vehicles for SUNCOAST: HEATLINE — all built from primitives, no imported models.
// The HEATLINE GT is the player's car; traffic, police cruisers and the SKY-1
// heli share the same box-and-cylinder construction language.
import * as THREE from 'three';

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function wheel(x, z) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 14), new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.9 }));
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0.42, z);
  w.castShadow = true;
  return w;
}

/** The player's HEATLINE GT: low sunset-orange coupe with a spoiler and stripes. */
export function buildHeatlineGT() {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xff5a2a, roughness: 0.3, metalness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.1, metalness: 0.8 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.5, metalness: 0.3 });
  g.add(box(2.1, 0.55, 4.6, paint, 0, 0.62, 0)); // body
  g.add(box(1.9, 0.5, 2.2, glass, 0, 1.08, -0.2)); // cabin
  g.add(box(2.12, 0.12, 4.62, new THREE.MeshStandardMaterial({ color: 0xffd75e, roughness: 0.3, metalness: 0.5 }), 0, 0.92, 0)); // stripe
  g.add(box(1.9, 0.1, 0.5, trim, 0, 1.28, -1.3)); // spoiler
  g.add(box(0.08, 0.28, 0.08, trim, -0.8, 1.12, -1.3));
  g.add(box(0.08, 0.28, 0.08, trim, 0.8, 1.12, -1.3));
  const head = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffe9a8, emissiveIntensity: 1.6 });
  g.add(box(0.5, 0.18, 0.1, head, -0.65, 0.66, 2.31));
  g.add(box(0.5, 0.18, 0.1, head, 0.65, 0.66, 2.31));
  const tail = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000, emissiveIntensity: 1.2 });
  g.add(box(1.8, 0.16, 0.08, tail, 0, 0.7, -2.31));
  const wheels = [wheel(-1.0, 1.45), wheel(1.0, 1.45), wheel(-1.0, -1.45), wheel(1.0, -1.45)];
  for (const w of wheels) g.add(w);
  return { group: g, wheels };
}

/** A plain traffic car in the given colour. */
export function buildTrafficCar(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x141c28, roughness: 0.15, metalness: 0.7 });
  g.add(box(1.9, 0.55, 4.1, paint, 0, 0.6, 0));
  g.add(box(1.7, 0.5, 2.0, glass, 0, 1.05, -0.1));
  g.add(wheel(-0.92, 1.3));
  g.add(wheel(0.92, 1.3));
  g.add(wheel(-0.92, -1.3));
  g.add(wheel(0.92, -1.3));
  return { group: g };
}

/** A Suncoast PD cruiser: white body, black hood, flashing red/blue light bar. */
export function buildPoliceCar() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.1, metalness: 0.8 });
  g.add(box(2.0, 0.55, 4.4, white, 0, 0.62, 0));
  g.add(box(1.9, 0.18, 1.2, black, 0, 0.92, 1.5));
  g.add(box(1.8, 0.5, 2.0, glass, 0, 1.06, -0.15));
  const red = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 2 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x0022ff, emissiveIntensity: 2 });
  const barR = box(0.5, 0.16, 0.3, red, -0.35, 1.38, -0.15);
  const barB = box(0.5, 0.16, 0.3, blue, 0.35, 1.38, -0.15);
  g.add(barR);
  g.add(barB);
  g.add(wheel(-0.95, 1.4));
  g.add(wheel(0.95, 1.4));
  g.add(wheel(-0.95, -1.4));
  g.add(wheel(0.95, -1.4));
  return { group: g, barR, barB };
}

/** Flash the light bar: red and blue alternate with time. */
export function updatePoliceLights(car, time) {
  const on = Math.sin(time * 10) > 0;
  car.barR.material.emissiveIntensity = on ? 2.5 : 0.15;
  car.barB.material.emissiveIntensity = on ? 0.15 : 2.5;
}

/** The SKY-1 police heli: body, tail boom, spinning main rotor, spotlight cone and pool. */
export function buildHeli() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.4, metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.1, metalness: 0.7 });
  g.add(box(2.2, 1.6, 3.4, body, 0, 0, 0));
  g.add(box(1.8, 1.0, 1.2, glass, 0, 0.25, 1.8));
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 5, 8), body);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.25, -3.8);
  boom.castShadow = true;
  g.add(boom);
  const fin = box(0.15, 1.4, 1.0, body, 0, 0.9, -6.0);
  g.add(fin);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.5, 0.9, -6.0);
  const tr1 = box(0.08, 1.6, 0.12, new THREE.MeshStandardMaterial({ color: 0xcccccc }), 0, 0, 0);
  tailRotor.add(tr1);
  g.add(tailRotor);
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.05, 0);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
  const b1 = box(0.28, 0.06, 9.5, bladeMat, 0, 0, 0);
  const b2 = box(9.5, 0.06, 0.28, bladeMat, 0, 0, 0);
  rotor.add(b1);
  rotor.add(b2);
  g.add(rotor);
  // Skids.
  g.add(box(0.12, 0.12, 3.0, new THREE.MeshStandardMaterial({ color: 0x111111 }), -0.9, -1.05, 0));
  g.add(box(0.12, 0.12, 3.0, new THREE.MeshStandardMaterial({ color: 0x111111 }), 0.9, -1.05, 0));
  // Spotlight cone (transparent, additive) and the pool of light on the ground.
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 26, 20, 1, true), coneMat);
  cone.position.set(0, -13, 0);
  cone.rotation.x = Math.PI;
  g.add(cone);
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.35, depthWrite: false });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 24), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.3, 0);
  return { group: g, rotor, tailRotor, cone, pool };
}

/** Spin the rotors; the cone and pool are positioned by the caller under the heli. */
export function updateHeli(heli, dt) {
  heli.rotor.rotation.y += dt * 22;
  heli.tailRotor.rotation.x += dt * 30;
}
