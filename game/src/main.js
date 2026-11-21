// SUNCOAST: HEATLINE — main loop and game wiring.
// Boots the Three.js scene, runs the arcade driving / on-foot play, the
// 8-job campaign, police pursuit with collision avoidance, the SKY-1 heli,
// deterministic screenshot scenes (?shot=) and the scripted mission-1
// autotest (?autotest=1). No network use: everything loads from game/.
import * as THREE from 'three';
import { buildCity, applyTimeOfDay, updateCity } from './city.js';
import { buildHeatlineGT, buildTrafficCar, buildPoliceCar, updatePoliceLights, buildHeli, updateHeli as spinHeli } from './vehicles.js';
import { buildPedestrian, updatePedestrian, buildPlayerOnFoot, fireFlash, updateFlash, buildEnemy, updateEnemyBar, buildNamedNPC } from './people.js';
import { MISSIONS, createMissionState, currentMission, completeJob, bankDrift, objectiveText } from './missions.js';
import { HUD } from './hud.js';
import { GameAudio } from './audio.js';
import { SHOT_NAMES, applyShot } from './shots.js';
import { clamp, angleDelta, money } from './util.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const SEED = Number(params.get('seed') || 1);
const AUTOTEST = params.get('autotest') === '1';
const SHOT_MODE = SHOT_NAMES.includes(SHOT);

const HEATLINE = { ready: false, shot: SHOT || null, autotest: AUTOTEST, errors: [], mission1Done: false };
window.__HEATLINE__ = HEATLINE;
window.addEventListener('error', (e) => HEATLINE.errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => HEATLINE.errors.push(String(e.reason)));

// ---------------------------------------------------------------- boot
const canvas = document.getElementById('game');
// Autotest runs headless under software rendering: drop the expensive
// effects there so the logic test runs at a usable frame rate. The shipped
// game (play and shot modes) keeps antialiasing, shadows and device pixels.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !AUTOTEST, preserveDrawingBuffer: true });
renderer.setPixelRatio(AUTOTEST ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = !AUTOTEST;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xff9a56);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const city = buildCity(scene, SEED);
if (AUTOTEST) city.sunLight.castShadow = false;
const hud = new HUD();
const audio = new GameAudio();
const state = createMissionState();

// Building footprints (inflated) for car/police collision avoidance.
const obstacles = city.buildings.map((b) => {
  const p = b.geometry.parameters;
  return {
    minX: b.position.x - p.width / 2 - 2, maxX: b.position.x + p.width / 2 + 2,
    minZ: b.position.z - p.depth / 2 - 2, maxZ: b.position.z + p.depth / 2 + 2,
  };
});
function insideObstacle(x, z) {
  for (const o of obstacles) if (x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ) return true;
  return false;
}
function aheadBlocked(x, z, heading, dist) {
  return insideObstacle(x + Math.sin(heading) * dist, z + Math.cos(heading) * dist);
}

// ---------------------------------------------------------------- actors
const car = buildHeatlineGT();
scene.add(car.group);
const carState = { x: -44, z: 40, heading: Math.PI, speed: 0, steer: 0, drifting: false, driftTime: 0 };

const player = buildPlayerOnFoot();
player.group.visible = false;
scene.add(player.group);
const playerState = { x: 20, z: 34, heading: Math.PI, speed: 0 };
let mode = 'car'; // 'car' | 'foot'

const heli = buildHeli();
scene.add(heli.group);
scene.add(heli.pool);
const heliState = { angle: 0, visible: false };

const traffic = [];
const trafficColors = [0x6ad7ff, 0xffe066, 0xd8d8d8, 0x9a6bff, 0x7dff9a, 0xff8fb0, 0xcccccc, 0x2a2a33];
for (let i = 0; i < 8; i++) {
  const t = buildTrafficCar(trafficColors[i]);
  scene.add(t.group);
  const lane = i % 4;
  traffic.push({
    ...t,
    x: lane < 2 ? (lane === 0 ? -48 : -40) : -20 + i * 18,
    z: lane < 2 ? -150 + i * 45 : (lane === 2 ? -30 : 30),
    heading: lane === 0 ? Math.PI : lane === 1 ? 0 : lane === 2 ? Math.PI / 2 : -Math.PI / 2,
    speed: 9 + (i % 3) * 2,
  });
}

const police = [];
for (let i = 0; i < 5; i++) {
  const p = buildPoliceCar();
  p.group.visible = false;
  scene.add(p.group);
  police.push({ ...p, x: -44, z: 60 + i * 12, heading: Math.PI, speed: 0, active: false, name: `UNIT-${i + 1}` });
}

const pedestrians = [];
for (let i = 0; i < 12; i++) {
  const ped = buildPedestrian([0xff6b6b, 0x6ad7ff, 0xffe066, 0x9a6bff, 0x7dff9a, 0xffffff][i % 6]);
  const side = i % 2 === 0 ? -56.5 : -31.5;
  ped.group.position.set(side, 0, -160 + i * 28);
  ped.group.rotation.y = i % 2 === 0 ? 0 : Math.PI;
  scene.add(ped.group);
  pedestrians.push({ ...ped, x: side, z: -160 + i * 28, dir: i % 2 === 0 ? 1 : -1, speed: 1.1 + (i % 3) * 0.3 });
}
// Boardwalk strollers.
for (let i = 0; i < 4; i++) {
  const ped = buildPedestrian([0xff8fb0, 0x7dff9a, 0x6ad7ff, 0xffe066][i]);
  ped.group.position.set(-64, 0, -100 + i * 60);
  scene.add(ped.group);
  pedestrians.push({ ...ped, x: -64, z: -100 + i * 60, dir: 1, speed: 0.9 });
}

const rae = buildNamedNPC('RAE', 0xffd75e, '#ffd75e');
rae.group.position.set(24, 0, -56);
scene.add(rae.group);
const sable = buildNamedNPC('SABLE', 0x9a6bff, '#c9a8ff');
sable.group.position.set(90, 0, 86);
scene.add(sable.group);
const marlo = buildNamedNPC('MARLO', 0x303030, '#ff8f8f');
marlo.group.position.set(20, 0, 10);
marlo.group.visible = false;
scene.add(marlo.group);

const enemies = [];
for (let i = 0; i < 3; i++) {
  const e = buildEnemy(['DECK', 'VEX', 'MARLO'][i]);
  e.group.visible = false;
  scene.add(e.group);
  enemies.push(e);
}

// Mission marker: glowing cylinder + ring at the current objective.
const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.55 });
const marker = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.3, 24), markerMat);
const markerRing = new THREE.Mesh(
  new THREE.TorusGeometry(3.2, 0.18, 8, 32),
  new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
);
markerRing.rotation.x = Math.PI / 2;
scene.add(marker);
scene.add(markerRing);
// Cargo crate shown on the car while carrying.
const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.8 }));
crate.position.set(0, 1.45, -1.4);
crate.visible = false;
car.group.add(crate);

// ---------------------------------------------------------------- input
const keys = {};
let mouseDown = false;
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyH') hud.toggle();
  if (e.code === 'KeyF' && !SHOT_MODE) toggleMode();
  if (e.code === 'KeyE' && !SHOT_MODE) tryInteract();
  if (e.code === 'Space') { if (mode === 'foot' && !SHOT_MODE) shoot(); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('mousedown', () => { mouseDown = true; if (mode === 'foot' && !SHOT_MODE) shoot(); });
window.addEventListener('mouseup', () => { mouseDown = false; });
document.getElementById('startScreen').addEventListener('click', () => {
  hud.hideStart();
  hud.show();
  audio.unlock();
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function toggleMode() {
  if (mode === 'car') {
    mode = 'foot';
    playerState.x = carState.x + 3;
    playerState.z = carState.z + 3;
    playerState.heading = carState.heading;
    player.group.visible = true;
  } else {
    const d = Math.hypot(playerState.x - carState.x, playerState.z - carState.z);
    if (d < 6) {
      mode = 'car';
      player.group.visible = false;
    }
  }
}

// ---------------------------------------------------------------- missions
function missionTarget() {
  const m = currentMission(state);
  if (!m) return null;
  return state.phase === 'pickup' ? m.pickup : m.dropoff;
}

function setupMission() {
  const m = currentMission(state);
  if (!m) { marker.visible = false; markerRing.visible = false; return; }
  state.wanted = m.wanted;
  state.targetsDown = 0;
  state.targetsTotal = m.onFoot ? 3 : 0;
  const spots = [{ x: 13, z: 20 }, { x: 27, z: 18 }, { x: 20, z: 12 }];
  enemies.forEach((e, i) => {
    const show = m.onFoot;
    e.group.visible = show;
    e.alive = true;
    e.hp = e.maxHp;
    if (show) {
      e.group.position.set(spots[i].x, 0, spots[i].z);
      e.group.rotation.set(0, Math.PI, 0);
      e.group.position.y = 0;
    }
  });
  marlo.group.visible = m.id >= 4;
}

function tryInteract() {
  const target = missionTarget();
  if (!target) return;
  const px = mode === 'car' ? carState.x : playerState.x;
  const pz = mode === 'car' ? carState.z : playerState.z;
  const d = Math.hypot(px - target.x, pz - target.z);
  if (d > 6) return;
  const m = currentMission(state);
  if (state.phase === 'pickup') {
    if (m.onFoot && mode !== 'foot') return;
    state.phase = 'dropoff';
    state.carrying = true;
    crate.visible = mode === 'car';
    audio.chime(false);
    hud.showBanner('PICKED UP', m.title.toUpperCase(), 2, nowSec());
  } else {
    if (m.onFoot && state.targetsDown < 3) {
      hud.showBanner('NOT YET', `TARGETS ${state.targetsDown}/3 — CLEAR THE YARD`, 2.5, nowSec());
      return;
    }
    const payout = completeJob(state);
    crate.visible = false;
    audio.chime(true);
    hud.showBanner('JOB COMPLETE', `+${money(payout)}  ·  JOB ${state.jobIndex + 1}/8`, 3, nowSec());
    if (state.jobIndex === 1 && !HEATLINE.mission1Done) {
      HEATLINE.mission1Done = true;
      console.log(`AUTOTEST mission1 complete cash=${state.cash} job=${state.jobIndex + 1} rep=${state.rep}`);
    }
    saveGame();
    setupMission();
  }
}

function shoot() {
  if (mode !== 'foot') return;
  fireFlash(player, nowSec());
  audio.gunshot();
  // Hitscan: the nearest living enemy within 30 m and a narrow cone ahead.
  let best = null;
  let bestD = 31;
  for (const e of enemies) {
    if (!e.alive || !e.group.visible) continue;
    const dx = e.group.position.x - playerState.x;
    const dz = e.group.position.z - playerState.z;
    const d = Math.hypot(dx, dz);
    if (d > 30) continue;
    const ang = Math.abs(angleDelta(playerState.heading, Math.atan2(dx, dz)));
    if (ang < 0.25 && d < bestD) { best = e; bestD = d; }
  }
  if (best) {
    best.hp -= 34;
    if (best.hp <= 0) {
      best.alive = false;
      best.hp = 0;
      best.group.rotation.z = Math.PI / 2;
      best.group.position.y = 0.3;
      state.targetsDown += 1;
      if (state.targetsDown >= 3) audio.chime(true);
    }
  }
}

function saveGame() {
  try {
    localStorage.setItem('heatline-save-v17', JSON.stringify({ cash: state.cash, jobIndex: state.jobIndex, rep: state.rep }));
  } catch (err) { /* storage may be unavailable; the game plays on */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('heatline-save-v17');
    if (!raw) return;
    const s = JSON.parse(raw);
    if (Number.isFinite(s.cash) && Number.isFinite(s.jobIndex) && Number.isFinite(s.rep)) {
      state.cash = s.cash;
      state.jobIndex = Math.min(s.jobIndex, MISSIONS.length - 1);
      state.rep = s.rep;
    }
  } catch (err) { /* start fresh */ }
}

// ---------------------------------------------------------------- shot mode wiring
const shotCam = { pos: new THREE.Vector3(0, 40, 80), look: new THREE.Vector3(0, 0, 0), fixed: false };
let shotMuzzle = false;
let muzzleTimer = 0;

function setModeShot(m) {
  mode = m;
  player.group.visible = m === 'foot';
}

const shotCtx = {
  state,
  setTimeOfDay: (t) => applyTimeOfDay(city, t, scene),
  setMode: setModeShot,
  setCar: (x, z, heading, speedKmh) => {
    carState.x = x; carState.z = z; carState.heading = heading;
    carState.speed = speedKmh / 3.6;
  },
  setPlayer: (x, z, heading) => { playerState.x = x; playerState.z = z; playerState.heading = heading; },
  setHeli: (h) => { heliState.visible = !!h; if (h) { heli.group.position.set(h.x, h.y, h.z); } },
  setPolice: (list) => {
    police.forEach((p, i) => {
      const def = list[i];
      p.active = !!def;
      p.group.visible = !!def;
      if (def) { p.x = def.x; p.z = def.z; p.heading = def.heading; p.speed = 0; }
    });
  },
  setNPC: (name, def) => {
    const npc = name === 'rae' ? rae : sable;
    npc.group.visible = !!def;
    if (def) { npc.group.position.set(def.x, 0, def.z); npc.group.rotation.y = def.heading; }
  },
  setEnemies: (list) => {
    enemies.forEach((e, i) => {
      const def = list[i];
      e.group.visible = !!def;
      if (!def) return;
      e.hp = def.hp;
      e.maxHp = 100;
      e.alive = !def.down;
      e.group.position.set(def.x, 0, def.z);
      if (def.down) { e.group.rotation.z = Math.PI / 2; e.group.position.y = 0.3; }
      else { e.group.rotation.set(0, Math.PI, 0); e.group.position.y = 0; }
    });
    marlo.group.visible = list.length > 0;
  },
  setCamera: (pos, look) => {
    shotCam.pos.set(pos[0], pos[1], pos[2]);
    shotCam.look.set(look[0], look[1], look[2]);
    shotCam.fixed = true;
  },
  showDrift: (chains, bonus) => hud.showDrift(chains, bonus, nowSec()),
  setMuzzle: (hold) => { shotMuzzle = hold; },
};

// ---------------------------------------------------------------- autopilot (autotest only)
const autopilot = { waypoints: [], stuckTimer: 0, lastDist: 1e9, done: false };
function autopilotRoute(target) {
  // Go to Ocean Ave, ride it to the target's street, then straight to the target.
  const wps = [];
  const aveX = -44;
  if (Math.abs(carState.x - aveX) > 2) wps.push({ x: aveX, z: carState.z });
  wps.push({ x: aveX, z: target.z });
  wps.push({ x: target.x, z: target.z });
  return wps;
}
function autopilotStep(dt) {
  if (autopilot.done) return;
  const target = missionTarget();
  if (!target) { autopilot.done = true; return; }
  // Steer at the next waypoint, or straight at the target once the route is done.
  const wp = autopilot.waypoints.length ? autopilot.waypoints[0] : target;
  const dx = wp.x - carState.x;
  const dz = wp.z - carState.z;
  const dist = Math.hypot(dx, dz);
  if (autopilot.waypoints.length && dist < 10) { autopilot.waypoints.shift(); return; }
  // Stuck detection (not during the final approach: sitting still to aim is not stuck).
  const toTargetEarly = Math.hypot(carState.x - target.x, carState.z - target.z);
  if (toTargetEarly > 15) {
    if (Math.abs(dist - autopilot.lastDist) < 0.05) autopilot.stuckTimer += dt;
    else autopilot.stuckTimer = 0;
    autopilot.lastDist = dist;
    if (autopilot.stuckTimer > 2.5) {
      autopilot.stuckTimer = 0;
      autopilot.waypoints.unshift({ x: carState.x + 24, z: carState.z + 8 });
    }
  }
  const desired = Math.atan2(dx, dz);
  const angErr = angleDelta(carState.heading, desired);
  const turn = clamp(angErr * 1.6, -1, 1);
  carState.steer = turn;
  carState.heading += turn * dt * 1.9 * clamp(carState.speed / 8, 0.25, 1);
  // Slow right down for the final approach so the turn stays tight; if the
  // nose is off the target up close, stop and turn in place instead of
  // orbiting it (a pure pursuit at speed never closes the last metres).
  const toTarget = Math.hypot(carState.x - target.x, carState.z - target.z);
  let targetSpeed;
  if (toTarget < 10 && Math.abs(angErr) > 0.6) {
    targetSpeed = 0;
    carState.heading += Math.sign(angErr) * dt * 2.4;
  } else {
    targetSpeed = toTarget < 12 ? 5 : dist < 30 ? 12 : (Math.abs(angErr) > 1.0 ? 6 : 28);
  }
  carState.speed += clamp(targetSpeed - carState.speed, -30 * dt, 12 * dt);
  moveCar(dt);
  if (toTarget < 5.5) {
    tryInteract();
    const next = missionTarget();
    if (next) autopilot.waypoints = autopilotRoute(next);
    else autopilot.done = true;
  }
}

// ---------------------------------------------------------------- driving
function moveCar(dt) {
  const nx = carState.x + Math.sin(carState.heading) * carState.speed * dt;
  const nz = carState.z + Math.cos(carState.heading) * carState.speed * dt;
  if (insideObstacle(nx, nz)) {
    carState.speed *= 0.4;
    return;
  }
  carState.x = clamp(nx, -165, 175);
  carState.z = clamp(nz, -175, 175);
}

function updateCar(dt) {
  if (AUTOTEST) { autopilotStep(dt); return; }
  if (SHOT_MODE) return; // shot scenes hold their pose
  const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const steerInput = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
  const boost = keys.ShiftLeft || keys.ShiftRight ? 1.35 : 1;
  const maxSpeed = 42 * boost;
  if (fwd > 0) carState.speed += 16 * dt;
  else if (fwd < 0) carState.speed -= (carState.speed > 0.5 ? 26 : 10) * dt;
  else carState.speed -= Math.sign(carState.speed) * Math.min(Math.abs(carState.speed), 6 * dt);
  carState.speed = clamp(carState.speed, -12, maxSpeed);
  const spd = Math.abs(carState.speed);
  carState.steer = steerInput;
  carState.heading += steerInput * dt * 1.9 * clamp(spd / 9, 0, 1) * Math.sign(carState.speed || 1);
  // Drift: hard steering at speed banks $50 a chain when the slide ends.
  const sliding = Math.abs(steerInput) > 0.6 && spd > 16;
  if (sliding) {
    carState.driftTime += dt;
    carState.drifting = true;
  } else if (carState.drifting) {
    carState.drifting = false;
    if (carState.driftTime > 0.6) {
      const bonus = bankDrift(state, 1);
      hud.showDrift(state.driftChains, bonus, nowSec());
      audio.chime(false);
    }
    carState.driftTime = 0;
  }
  moveCar(dt);
}

function updatePlayer(dt) {
  if (SHOT_MODE) return;
  const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const sp = 6;
  const mx = Math.sin(playerState.heading) * fwd + Math.cos(playerState.heading) * strafe;
  const mz = Math.cos(playerState.heading) * fwd - Math.sin(playerState.heading) * strafe;
  const len = Math.hypot(mx, mz) || 1;
  playerState.x = clamp(playerState.x + (mx / len) * sp * dt * (fwd || strafe ? 1 : 0), -165, 175);
  playerState.z = clamp(playerState.z + (mz / len) * sp * dt * (fwd || strafe ? 1 : 0), -175, 175);
  if (fwd || strafe) playerState.heading = Math.atan2(mx, mz);
  updatePedestrian(player, dt, !!(fwd || strafe));
  updateFlash(player, nowSec());
}

// ---------------------------------------------------------------- police + heli + traffic
function updatePolice(dt, time) {
  const wanted = state.wanted;
  const activeCount = wanted === 0 ? 0 : wanted === 1 ? 2 : wanted === 2 ? 3 : 5;
  const px = mode === 'car' ? carState.x : playerState.x;
  const pz = mode === 'car' ? carState.z : playerState.z;
  police.forEach((p, i) => {
    if (SHOT_MODE) {
      if (p.active) updatePoliceLights(p, time);
      return;
    }
    p.active = i < activeCount;
    p.group.visible = p.active;
    if (!p.active) return;
    updatePoliceLights(p, time);
    const dx = px - p.x;
    const dz = pz - p.z;
    const dist = Math.hypot(dx, dz);
    let desired = Math.atan2(dx, dz);
    // Collision avoidance: if a building is ahead, veer off to the side.
    if (aheadBlocked(p.x, p.z, p.heading, 12)) desired += 0.7;
    // Separation: keep clear of the other cruisers.
    for (const q of police) {
      if (q === p || !q.active) continue;
      const sx = p.x - q.x;
      const sz = p.z - q.z;
      const sd = Math.hypot(sx, sz);
      if (sd < 7 && sd > 0.01) desired = Math.atan2(sx, sz);
    }
    const turn = clamp(angleDelta(p.heading, desired) * 2, -1, 1);
    p.heading += turn * dt * 2.2;
    const targetSpeed = dist > 60 ? 38 : dist > 12 ? 30 : 16;
    p.speed += clamp(targetSpeed - p.speed, -30 * dt, 14 * dt);
    const nx = p.x + Math.sin(p.heading) * p.speed * dt;
    const nz = p.z + Math.cos(p.heading) * p.speed * dt;
    if (!insideObstacle(nx, nz)) { p.x = clamp(nx, -165, 175); p.z = clamp(nz, -175, 175); }
    else p.speed *= 0.5;
  });
}

function updateHeli(dt, time) {
  if (SHOT_MODE) {
    if (heliState.visible) {
      spinHeli(heli, dt);
      heli.pool.position.set(heli.group.position.x, 0.3, heli.group.position.z);
    }
    return;
  }
  const show = state.wanted > 0;
  heli.group.visible = show;
  heli.pool.visible = show;
  heliState.visible = show;
  if (!show) return;
  spinHeli(heli, dt);
  const px = mode === 'car' ? carState.x : playerState.x;
  const pz = mode === 'car' ? carState.z : playerState.z;
  heliState.angle += dt * 0.22;
  heli.group.position.set(px + Math.cos(heliState.angle) * 26, 32, pz + Math.sin(heliState.angle) * 26);
  heli.group.lookAt(px, 0, pz);
  heli.pool.position.set(heli.group.position.x, 0.3, heli.group.position.z);
}

function updateTraffic(dt) {
  for (const t of traffic) {
    t.x += Math.sin(t.heading) * t.speed * dt;
    t.z += Math.cos(t.heading) * t.speed * dt;
    if (t.z > 175) t.z = -175;
    if (t.z < -175) t.z = 175;
    if (t.x > 175) t.x = -30;
    if (t.x < -30) t.x = 175;
    // Gentle stop for the player's car ahead.
    const px = mode === 'car' ? carState.x : playerState.x;
    const pz = mode === 'car' ? carState.z : playerState.z;
    const aheadX = t.x + Math.sin(t.heading) * 6;
    const aheadZ = t.z + Math.cos(t.heading) * 6;
    const near = Math.hypot(aheadX - px, aheadZ - pz) < 4;
    t.group.position.set(t.x, 0, t.z);
    t.group.rotation.y = t.heading;
    if (near) t.group.position.y = 0; // holds its lane; the player steers around
  }
}

function updatePedestrians(dt) {
  for (const ped of pedestrians) {
    ped.z += ped.dir * ped.speed * dt;
    if (ped.z > 165) { ped.z = 165; ped.dir = -1; ped.group.rotation.y = Math.PI; }
    if (ped.z < -165) { ped.z = -165; ped.dir = 1; ped.group.rotation.y = 0; }
    ped.group.position.set(ped.x, 0, ped.z);
    updatePedestrian(ped, dt, true);
  }
}

// ---------------------------------------------------------------- camera
const camPos = new THREE.Vector3(0, 40, 80);
function updateCamera(dt) {
  if (shotCam.fixed) {
    camera.position.copy(shotCam.pos);
    camera.lookAt(shotCam.look);
    return;
  }
  let target;
  let look;
  if (mode === 'car') {
    const f = new THREE.Vector3(Math.sin(carState.heading), 0, Math.cos(carState.heading));
    target = new THREE.Vector3(carState.x, 0, carState.z).addScaledVector(f, -10).add(new THREE.Vector3(0, 4.6, 0));
    look = new THREE.Vector3(carState.x, 1.4, carState.z).addScaledVector(f, 8);
  } else {
    const f = new THREE.Vector3(Math.sin(playerState.heading), 0, Math.cos(playerState.heading));
    target = new THREE.Vector3(playerState.x, 0, playerState.z).addScaledVector(f, -6).add(new THREE.Vector3(0, 3.2, 0));
    look = new THREE.Vector3(playerState.x, 1.4, playerState.z).addScaledVector(f, 6);
  }
  camPos.lerp(target, 1 - Math.pow(0.001, dt));
  camera.position.copy(camPos);
  camera.lookAt(look);
}

// ---------------------------------------------------------------- boot state
function nowSec() { return clock.elapsedTime; }
const clock = new THREE.Clock();

if (!SHOT_MODE && !AUTOTEST) loadGame();
setupMission();
if (SHOT_MODE) {
  applyShot(shotCtx, SHOT);
  hud.hideStart();
  hud.show();
  if (state.driftChains > 0) hud.showDrift(state.driftChains, state.driftBonus, 0);
  console.log(`HEATLINE shot=${SHOT} job=${state.jobIndex + 1} cash=${state.cash} rep=${state.rep} wanted=${state.wanted}`);
} else if (AUTOTEST) {
  hud.hideStart();
  hud.show();
  autopilot.waypoints = autopilotRoute(missionTarget());
  console.log('HEATLINE autotest started: mission 1 pickup then dropoff');
  setTimeout(() => {
    if (!HEATLINE.mission1Done) console.log(`AUTOTEST TIMEOUT job=${state.jobIndex + 1} cash=${state.cash} rep=${state.rep}`);
  }, 90000);
}

// Expose a live snapshot for the play test.
HEATLINE.snapshot = () => ({
  job: state.jobIndex + 1,
  cash: state.cash,
  rep: state.rep,
  wanted: state.wanted,
  phase: state.phase,
  speedKmh: Math.round(Math.abs(mode === 'car' ? carState.speed : playerState.speed) * 3.6),
  mode,
  targetsDown: state.targetsDown,
  targetsTotal: state.targetsTotal,
  mission1Done: HEATLINE.mission1Done,
  x: Math.round((mode === 'car' ? carState.x : playerState.x) * 10) / 10,
  z: Math.round((mode === 'car' ? carState.z : playerState.z) * 10) / 10,
  heading: Math.round((mode === 'car' ? carState.heading : playerState.heading) * 100) / 100,
  wps: autopilot.waypoints.length,
  wp: autopilot.waypoints.length ? { x: autopilot.waypoints[0].x, z: autopilot.waypoints[0].z } : null,
});

// ---------------------------------------------------------------- loop
let frames = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  updateCity(city, dt, time);
  if (mode === 'car') updateCar(dt);
  else updatePlayer(dt);
  // Sync meshes to state.
  car.group.position.set(carState.x, 0, carState.z);
  car.group.rotation.y = carState.heading;
  for (const w of car.wheels) w.rotation.x += carState.speed * dt * 2.4;
  player.group.position.set(playerState.x, 0, playerState.z);
  player.group.rotation.y = playerState.heading;
  updatePolice(dt, time);
  police.forEach((p) => { p.group.position.set(p.x, 0, p.z); p.group.rotation.y = p.heading; });
  updateHeli(dt, time);
  updateTraffic(dt);
  updatePedestrians(dt);
  for (const e of enemies) if (e.group.visible && e.alive) updateEnemyBar(e, camera);
  // Mission marker follows the current objective.
  const target = missionTarget();
  if (target) {
    marker.visible = true;
    markerRing.visible = true;
    marker.position.set(target.x, 0.6 + Math.sin(time * 2.5) * 0.2, target.z);
    markerRing.position.set(target.x, 0.4, target.z);
  } else {
    marker.visible = false;
    markerRing.visible = false;
  }
  // Shot-mode muzzle flash stays lit for the frame (deterministic for the shot).
  if (shotMuzzle) {
    player.flash.visible = true;
    player.flashLight.intensity = 60;
  }
  updateCamera(dt);
  // HUD.
  const m = currentMission(state);
  const speedKmh = Math.abs(mode === 'car' ? carState.speed : playerState.speed) * 3.6;
  const policeRows = [];
  if (state.wanted > 0) {
    police.filter((p) => p.active).forEach((p) => policeRows.push({ name: p.name, status: 'PURSUING', x: p.x, z: p.z }));
    if (state.wanted >= 3) policeRows.push({ name: 'UNIT-4', status: 'STAGING', x: -44, z: 80 });
    if (heliState.visible) policeRows.push({ name: 'SKY-1', status: 'OVERHEAD', x: heli.group.position.x, z: heli.group.position.z });
  }
  hud.setPolicePanel(policeRows);
  // In shot mode the drift popup is part of the scene: re-show it every frame
  // so it cannot expire before the screenshot is taken.
  if (SHOT_MODE && state.driftChains > 0) hud.showDrift(state.driftChains, state.driftBonus, time);
  hud.update(state, m, speedKmh, state.wanted, policeRows,
    target, { x: mode === 'car' ? carState.x : playerState.x, z: mode === 'car' ? carState.z : playerState.z, heading: mode === 'car' ? carState.heading : playerState.heading },
    heliState.visible ? { x: heli.group.position.x, z: heli.group.position.z } : null, time);
  if (state.targetsTotal > 0) hud.objective.textContent += `  ·  TARGETS ${state.targetsDown}/${state.targetsTotal}`;
  audio.update(speedKmh, state.wanted, time);
  renderer.render(scene, camera);
  frames += 1;
  if (frames === 3) {
    HEATLINE.ready = true;
    console.log(`HEATLINE ready frames=${frames} shot=${SHOT || 'play'} job=${state.jobIndex + 1} cash=${state.cash}`);
  }
}
animate();
