// The HUD: job/money/REP panel, wanted stars, speed, minimap, police pursuit
// panel, drift popup, banners and the start screen. All DOM, updated from the
// game state every frame; hidden with H.
import { money } from './util.js';

const WORLD = { minX: -170, maxX: 180, minZ: -180, maxZ: 180 };

export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.jobLabel = document.getElementById('jobLabel');
    this.cashLabel = document.getElementById('cashLabel');
    this.repLabel = document.getElementById('repLabel');
    this.objective = document.getElementById('objective');
    this.stars = document.getElementById('stars');
    this.speed = document.getElementById('speed');
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.policePanel = document.getElementById('policePanel');
    this.policeRows = document.getElementById('policeRows');
    this.drift = document.getElementById('drift');
    this.banner = document.getElementById('banner');
    this.bannerBig = document.getElementById('bannerBig');
    this.bannerSub = document.getElementById('bannerSub');
    this.startScreen = document.getElementById('startScreen');
    this.status = document.getElementById('status');
    this.bannerUntil = 0;
    this.driftUntil = 0;
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }
  toggle() { this.root.classList.toggle('hidden'); }
  hideStart() { this.startScreen.style.display = 'none'; }
  showStart() { this.startScreen.style.display = 'flex'; }

  /** Full per-frame update from the game state. */
  update(state, mission, speedKmh, wanted, policeUnits, marker, playerPos, heliPos, now) {
    const jobNo = Math.min(state.jobIndex + 1, 8);
    this.jobLabel.textContent = `JOB ${jobNo}/8`;
    this.cashLabel.textContent = money(state.cash);
    this.repLabel.textContent = `REP ${state.rep}  ·  FIXER: ${(mission ? mission.fixer : '—').toUpperCase()}`;
    this.objective.textContent = mission
      ? `${mission.title.toUpperCase()} — ${(state.phase === 'pickup' ? mission.pickup : mission.dropoff).label}`
      : 'Campaign complete — Suncoast is yours.';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += `<span class="${i < wanted ? '' : 'off'}">★</span>`;
    this.stars.innerHTML = stars;
    this.speed.innerHTML = `${Math.round(speedKmh)} <small>km/h</small>`;
    this.status.textContent = `Job ${jobNo} of 8, ${money(state.cash)}, REP ${state.rep}, wanted ${wanted}.`;
    if (now > this.bannerUntil) this.banner.style.display = 'none';
    if (now > this.driftUntil) this.drift.style.display = 'none';
    this.drawMinimap(marker, playerPos, policeUnits, heliPos);
  }

  showBanner(big, sub, seconds, now) {
    this.bannerBig.textContent = big;
    this.bannerSub.textContent = sub;
    this.banner.style.display = 'block';
    this.bannerUntil = now + seconds;
  }

  showDrift(chains, bonus, now) {
    this.drift.textContent = `DRIFT x${chains}  +$${bonus}`;
    this.drift.style.display = 'block';
    this.driftUntil = now + 2.5;
  }

  setPolicePanel(units) {
    if (!units || units.length === 0) {
      this.policePanel.style.display = 'none';
      return;
    }
    this.policePanel.style.display = 'block';
    this.policeRows.innerHTML = units.map((u) => `<div class="row"><span>${u.name}</span><b>${u.status}</b></div>`).join('');
  }

  drawMinimap(marker, playerPos, policeUnits, heliPos) {
    const g = this.mapCtx;
    const W = 180;
    const H = 180;
    const px = (x) => ((x - WORLD.minX) / (WORLD.maxX - WORLD.minX)) * W;
    const py = (z) => ((z - WORLD.minZ) / (WORLD.maxZ - WORLD.minZ)) * H;
    g.clearRect(0, 0, W, H);
    // Ocean west, land east.
    g.fillStyle = '#1e6f8e';
    g.fillRect(0, 0, px(-110), H);
    g.fillStyle = '#2c2c38';
    g.fillRect(px(-110), 0, W - px(-110), H);
    // Roads: Ocean Ave + cross streets.
    g.fillStyle = '#55555f';
    g.fillRect(px(-54), 0, px(-34) - px(-54), H);
    for (const z of [-90, -30, 30, 90]) g.fillRect(px(-34), py(z) - 3, W - px(-34), 6);
    // Marker.
    if (marker) {
      g.fillStyle = '#ffd75e';
      g.beginPath();
      g.arc(px(marker.x), py(marker.z), 6, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      g.stroke();
    }
    // Heli.
    if (heliPos) {
      g.fillStyle = '#ff6b6b';
      g.beginPath();
      g.arc(px(heliPos.x), py(heliPos.z), 4, 0, Math.PI * 2);
      g.fill();
    }
    // Police.
    g.fillStyle = '#6ad7ff';
    for (const u of policeUnits || []) {
      g.beginPath();
      g.arc(px(u.x), py(u.z), 3, 0, Math.PI * 2);
      g.fill();
    }
    // Player arrow.
    g.fillStyle = '#7dff9a';
    g.save();
    g.translate(px(playerPos.x), py(playerPos.z));
    g.rotate(playerPos.heading || 0);
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(5, 6);
    g.lineTo(-5, 6);
    g.closePath();
    g.fill();
    g.restore();
  }
}
