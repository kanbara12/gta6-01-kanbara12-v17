// Deterministic screenshot scenes for SUNCOAST: HEATLINE.
// Each shot is a fixed, seeded slice of the live game: the same scene, camera
// and HUD state every run, so a screenshot is a genuine frame of gameplay.
// Five scenes are prepared; the entry submits the best four.
//   ?shot=start   Job 1/8 $1,250 — wide high: ferris wheel, ocean, sun, palms
//   ?shot=play    Job 2/8 $3,750 — low rear 3/4 at 141 km/h, SKY-1 heli, Rae
//   ?shot=chase   Job 5/8 $13,200 — Ocean Ave at dusk, wanted 3, DRIFT x3, Sable
//   ?shot=mission Job 4/8 $9,550 — on foot, muzzle flash, 3 enemies, Marlo
//   ?shot=dusk    Job 8/8 $20,200 — pier at dusk (extra prepared scene)
export const SHOT_NAMES = ['start', 'play', 'chase', 'mission', 'dusk'];

export const SHOT_DEFS = {
  start: {
    jobIndex: 0, cash: 1250, rep: 0, wanted: 0, mode: 'car', timeOfDay: 'sunset',
    speedKmh: 0, driftChains: 0, driftBonus: 0, targetsDown: 0, targetsTotal: 0,
    car: { x: -44, z: 40, heading: Math.PI },
    camera: { pos: [-8, 95, 130], look: [-88, 8, -55] },
    heli: null, police: [], rae: null, sable: null,
    enemies: [], muzzle: false,
  },
  play: {
    jobIndex: 1, cash: 3750, rep: 1, wanted: 1, mode: 'car', timeOfDay: 'sunset',
    speedKmh: 141, driftChains: 0, driftBonus: 0, targetsDown: 0, targetsTotal: 0,
    car: { x: -44, z: 0, heading: Math.PI },
    camera: { pos: [-52, 3.4, 13], look: [-42, 5, -14] },
    heli: { x: -34, z: -22, y: 24 },
    police: [], rae: { x: -36, z: -16, heading: 0.6 }, sable: null,
    enemies: [], muzzle: false,
  },
  chase: {
    jobIndex: 4, cash: 13200, rep: 4, wanted: 3, mode: 'car', timeOfDay: 'dusk',
    speedKmh: 118, driftChains: 3, driftBonus: 150, targetsDown: 0, targetsTotal: 0,
    car: { x: -44, z: 10, heading: Math.PI },
    camera: { pos: [-54, 8, 50], look: [-44, 2, -8] },
    heli: { x: -36, z: -18, y: 26 },
    police: [
      { x: -49, z: 26, heading: Math.PI },
      { x: -39, z: 32, heading: Math.PI },
      { x: -47, z: 18, heading: Math.PI },
    ],
    rae: null, sable: { x: -33, z: -4, heading: -0.8 },
    enemies: [], muzzle: false,
  },
  mission: {
    jobIndex: 3, cash: 9550, rep: 3, wanted: 2, mode: 'foot', timeOfDay: 'sunset',
    speedKmh: 0, driftChains: 0, driftBonus: 0, targetsDown: 2, targetsTotal: 3,
    car: { x: 8, z: 44, heading: Math.PI / 2 },
    player: { x: 20, z: 34, heading: Math.PI },
    camera: { pos: [11, 3.2, 42], look: [22, 1.3, 13] },
    heli: null, police: [], rae: null, sable: null,
    enemies: [
      { name: 'DECK', x: 13, z: 20, hp: 0, down: true },
      { name: 'VEX', x: 27, z: 18, hp: 0, down: true },
      { name: 'MARLO', x: 20, z: 12, hp: 62, down: false },
    ],
    muzzle: true,
  },
  dusk: {
    jobIndex: 7, cash: 20200, rep: 7, wanted: 0, mode: 'car', timeOfDay: 'dusk',
    speedKmh: 0, driftChains: 0, driftBonus: 0, targetsDown: 0, targetsTotal: 0,
    car: { x: -138, z: 30, heading: -Math.PI / 2 },
    camera: { pos: [-88, 26, 92], look: [-130, 2, 28] },
    heli: { x: -100, z: 10, y: 36 },
    police: [], rae: { x: -132, z: 36, heading: 1.2 }, sable: null,
    enemies: [], muzzle: false,
  },
};

/**
 * Apply a shot to the live game through `ctx` (callbacks the main loop owns):
 * sets the campaign state, time of day, mode, car/player/heli/police/NPC/enemy
 * placement and the camera, then returns the shot definition.
 */
export function applyShot(ctx, name) {
  const def = SHOT_DEFS[name] || SHOT_DEFS.start;
  ctx.state.jobIndex = def.jobIndex;
  ctx.state.cash = def.cash;
  ctx.state.rep = def.rep;
  ctx.state.wanted = def.wanted;
  ctx.state.phase = def.jobIndex === 3 ? 'dropoff' : 'pickup';
  ctx.state.driftChains = def.driftChains;
  ctx.state.driftBonus = def.driftBonus;
  ctx.state.targetsDown = def.targetsDown;
  ctx.state.targetsTotal = def.targetsTotal;
  ctx.setTimeOfDay(def.timeOfDay);
  ctx.setMode(def.mode);
  ctx.setCar(def.car.x, def.car.z, def.car.heading, def.speedKmh);
  if (def.player) ctx.setPlayer(def.player.x, def.player.z, def.player.heading);
  ctx.setHeli(def.heli);
  ctx.setPolice(def.police);
  ctx.setNPC('rae', def.rae);
  ctx.setNPC('sable', def.sable);
  ctx.setEnemies(def.enemies);
  ctx.setCamera(def.camera.pos, def.camera.look);
  if (def.driftChains > 0) ctx.showDrift(def.driftChains, def.driftBonus);
  ctx.setMuzzle(def.muzzle);
  return def;
}
