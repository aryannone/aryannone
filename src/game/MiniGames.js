// =====================================================================
//  Mini-games around campus
//   ⭐ Star Rush  - collect 12 stars hidden around campus in 60 seconds
//   🏁 Ring Race  - fly through the rings around the plaza (bike helps!)
//   ⚽ Football   - the ball on the sports ground is always live: walk
//                  or ride into it to kick it past the goalkeepers
// =====================================================================
import * as THREE from 'three';
import { makeLabel } from './Campus.js';
import { createCharacter, toon } from './Character.js';
import { audio } from './Audio.js';

export const PADS = [
  { key: 'stars', x: 0, z: -15, color: '#ffb400', icon: '⭐', title: 'Star Rush' },
  { key: 'race', x: 0, z: 31, color: '#14b8c4', icon: '🏁', title: 'Ring Race' },
];
const PAD_R = 2.2;

// spots on paths and open lawns where stars can appear
const STAR_SPOTS = [
  [0, -25], [-27, 0], [27, 0], [-20, 22], [18, 22], [-10, 38.5], [8, 36], [0, 47], [-14, -14], [14, -14],
  [-14, 12], [14, 12], [37, 19], [37, 33], [-22, -20], [22, -20], [-30, 34], [28, 40], [-40, 12], [46, 4],
  [-16, -34], [16, -34], [0, 8], [-42, -12], [44, -14], [-24, 46],
];
// ring race checkpoints: a loop around the fountain plaza and back
const RING_PATH = [[0, 18], [7, 7], [17, 0], [7, -7], [0, -17], [-7, -7], [-17, 0], [-7, 7], [0, 31]];

// football pitch (matches the field drawn in Campus.js)
const F = { minX: 30.6, maxX: 43.4, minZ: 15.6, maxZ: 36.4, goalMin: 35.3, goalMax: 38.7, cx: 37, cz: 26 };
const BALL_R = 0.38;

const loadBest = () => {
  try {
    return JSON.parse(localStorage.getItem('campus-best') || '{}');
  } catch {
    return {};
  }
};
const fmt = (s) => `${s.toFixed(1)}s`;

function starGeometry() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.32 : 0.75, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 4 });
  g.center();
  return g;
}

function ballTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#2b2d42';
  const spots = [[32, 30], [96, 30], [160, 30], [224, 30], [0, 96], [64, 96], [128, 96], [192, 96], [256, 96], [64, 2], [192, 2], [128, 126]];
  for (const [x, y] of spots) {
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15 * 0.8);
    }
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class MiniGames {
  constructor(scene, { hud, toast, trees, confetti }) {
    this.scene = scene;
    this.toast = toast;
    this.confetti = confetti;
    this.trees = trees;
    this.best = loadBest();
    this.active = null;
    this.group = new THREE.Group();
    scene.add(this.group);

    // ---------- start pads ----------
    this.pads = PADS.map((p) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.7, 2.2, 48),
        new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.9, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x, 0.1, p.z);
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(1.7, 48),
        new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.22, depthWrite: false })
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(p.x, 0.09, p.z);
      const label = makeLabel(`${p.icon} ${p.title}`, p.color);
      label.position.set(p.x, 3.4, p.z);
      label.scale.multiplyScalar(0.7);
      this.group.add(ring, disc, label);
      return { ...p, ring, label };
    });

    // ---------- shared meshes ----------
    this.starGeo = starGeometry();
    this.starMat = toon('#ffc83d', { emissive: '#ff9d00', emissiveIntensity: 0.45 });
    this.beamMat = new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending });
    this.beamGeo = new THREE.CylinderGeometry(0.18, 0.5, 26, 12, 1, true);
    this.beamGeo.translate(0, 13, 0);

    // arrow that points to the next ring
    this.arrow = new THREE.Group();
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 16), toon('#14b8c4', { emissive: '#0aa', emissiveIntensity: 0.4 }));
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.5;
    this.arrow.add(head);
    this.arrow.visible = false;
    this.group.add(this.arrow);

    this.buildFootball();
    this.buildHUD(hud);
  }

  // ---------------------------------------------------------------
  buildHUD(hud) {
    const el = (this.hudEl = document.createElement('div'));
    el.className = 'mg-hud';
    el.hidden = true;
    el.innerHTML = `
      <span class="mg-icon"></span>
      <div class="mg-text"><b class="mg-title"></b><span class="mg-info"></span></div>
      <span class="mg-time"></span>
      <button class="mg-quit" aria-label="Quit mini-game" title="Quit (Esc)">✕</button>`;
    hud.appendChild(el);
    el.querySelector('.mg-quit').addEventListener('click', () => this.quit());
  }

  setHUD(icon, title, info, time, quittable = true) {
    const el = this.hudEl;
    el.hidden = false;
    const s = `${icon}|${title}|${info}|${time}|${quittable}`;
    if (s === this.lastHUD) return;
    this.lastHUD = s;
    el.querySelector('.mg-icon').textContent = icon;
    el.querySelector('.mg-title').textContent = title;
    el.querySelector('.mg-info').textContent = info;
    el.querySelector('.mg-time').textContent = time;
    el.querySelector('.mg-quit').hidden = !quittable;
  }

  hideHUD() {
    this.hudEl.hidden = true;
    this.lastHUD = '';
  }

  saveBest(key, value, lowerIsBetter = true) {
    const old = this.best[key];
    const better = old == null || (lowerIsBetter ? value < old : value > old);
    if (better) {
      this.best[key] = value;
      try {
        localStorage.setItem('campus-best', JSON.stringify(this.best));
      } catch {}
    }
    return better;
  }

  // the pad the player is standing on (only when no game is running)
  padAt(pos) {
    if (this.active) return null;
    return this.pads.find((p) => Math.hypot(pos.x - p.x, pos.z - p.z) < PAD_R) || null;
  }

  padPrompt(p) {
    const b = this.best[p.key];
    const extra = b == null ? '' : ` · best ${fmt(b)}`;
    return `Play <b>${p.icon} ${p.title}</b>${extra}`;
  }

  start(key, player) {
    if (this.active) return;
    if (key === 'stars') this.startStars();
    if (key === 'race') this.startRace(player);
    audio.sfx('start');
  }

  quit() {
    if (!this.active) return;
    this.toast(`${this.active.key === 'stars' ? '⭐' : '🏁'} Mini-game cancelled`, 1600);
    this.end();
  }

  end() {
    const a = this.active;
    if (!a) return;
    for (const o of a.objects) this.group.remove(o);
    this.arrow.visible = false;
    this.active = null;
    this.hideHUD();
  }

  // ---------------- Star Rush ----------------
  startStars() {
    const spots = STAR_SPOTS.filter(([x, z]) => !this.trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.2));
    for (let i = spots.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    const stars = spots.slice(0, 12).map(([x, z]) => {
      const g = new THREE.Group();
      g.position.set(x, 1.3, z);
      const m = new THREE.Mesh(this.starGeo, this.starMat);
      m.castShadow = true;
      g.add(m, new THREE.Mesh(this.beamGeo, this.beamMat));
      g.children[1].position.y = -1.3;
      this.group.add(g);
      return { g, star: m, x, z, got: false, pop: 0 };
    });
    this.active = { key: 'stars', t: 0, limit: 60, stars, got: 0, objects: stars.map((s) => s.g) };
    this.toast('⭐ <b>Star Rush!</b> Grab all 12 stars in 60 seconds. Follow the light beams!', 3200);
  }

  updateStars(dt, t, player) {
    const a = this.active;
    a.t += dt;
    for (const s of a.stars) {
      if (s.got) {
        s.pop += dt * 3;
        s.g.scale.setScalar(Math.max(0.001, 1 + s.pop * 1.5) * Math.max(0, 1 - s.pop));
        s.g.position.y += dt * 4;
        if (s.pop >= 1) s.g.visible = false;
        continue;
      }
      s.star.rotation.y = t * 2.5 + s.x;
      s.star.position.y = Math.sin(t * 3 + s.z) * 0.2;
      if (Math.hypot(player.pos.x - s.x, player.pos.z - s.z) < 1.7 && player.pos.y < 2.5) {
        s.got = true;
        a.got++;
        audio.sfx('coin');
      }
    }
    const left = Math.max(0, a.limit - a.t);
    this.setHUD('⭐', 'Star Rush', `${a.got} / ${a.stars.length} stars`, `${Math.ceil(left)}s`);
    if (a.got === a.stars.length) {
      const record = this.saveBest('stars', a.t);
      audio.sfx('complete');
      this.confetti();
      this.toast(`⭐ <b>All stars in ${fmt(a.t)}!</b>${record ? ' 🎉 New best!' : ` Best: ${fmt(this.best.stars)}`}`, 4200);
      this.end();
    } else if (left <= 0) {
      audio.sfx('fail');
      this.toast(`⏰ Time's up! You grabbed <b>${a.got}</b> of ${a.stars.length} stars. Try the 🚲!`, 3800);
      this.end();
    }
  }

  // ---------------- Ring Race ----------------
  startRace(player) {
    const rings = RING_PATH.map(([x, z], i) => {
      const [px, pz] = i ? RING_PATH[i - 1] : [player.pos.x, player.pos.z];
      const last = i === RING_PATH.length - 1;
      const g = new THREE.Group();
      g.position.set(x, 1.9, z);
      g.rotation.y = Math.atan2(x - px, z - pz);
      const color = last ? '#ff6f61' : '#14b8c4';
      const torus = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.2, 14, 40), toon(color, { emissive: color, emissiveIntensity: 0.35 }));
      torus.castShadow = true;
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(1.6, 40),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
      );
      g.add(torus, glow);
      if (last) {
        const flag = makeLabel('🏁 Finish', '#ff6f61');
        flag.scale.multiplyScalar(0.5);
        flag.position.y = 2.6;
        g.add(flag);
      }
      this.group.add(g);
      return { g, x, z };
    });
    this.active = { key: 'race', t: 0, rings, next: 0, objects: rings.map((r) => r.g) };
    this.arrow.visible = true;
    this.toast('🏁 <b>Ring Race!</b> Go through every ring. Hop on the 🚲 to go faster!', 3000);
  }

  updateRace(dt, t, player) {
    const a = this.active;
    a.t += dt;
    a.rings.forEach((r, i) => {
      r.g.visible = i >= a.next && i <= a.next + 1;
      const s = i === a.next ? 1 + Math.sin(t * 6) * 0.05 : 0.8;
      r.g.scale.setScalar(s);
    });
    const r = a.rings[a.next];
    if (Math.hypot(player.pos.x - r.x, player.pos.z - r.z) < 2.3) {
      a.next++;
      audio.sfx('ring');
      if (a.next === a.rings.length) {
        const record = this.saveBest('race', a.t);
        audio.sfx('complete');
        this.confetti();
        this.toast(`🏁 <b>Finished in ${fmt(a.t)}!</b>${record ? ' 🎉 New best!' : ` Best: ${fmt(this.best.race)}`}`, 4200);
        this.end();
        return;
      }
    }
    const nr = a.rings[a.next];
    this.arrow.position.set(player.pos.x, player.pos.y + 3.1, player.pos.z);
    this.arrow.rotation.y = Math.atan2(nr.x - player.pos.x, nr.z - player.pos.z);
    this.setHUD('🏁', 'Ring Race', `Ring ${a.next + 1} / ${a.rings.length}`, fmt(a.t));
  }

  // ---------------- Football ----------------
  buildFootball() {
    const ball = (this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R, 24, 16),
      new THREE.MeshToonMaterial({ map: ballTexture(), gradientMap: toon('#fff').gradientMap })
    ));
    ball.castShadow = true;
    this.group.add(ball);
    this.ballVel = new THREE.Vector3();
    this.ballPos = ball.position;
    this.goals = 0;
    this.kickCooldown = 0;
    this.resetBall();

    const sign = makeLabel('⚽ Kick the ball into a goal!', '#22a35a');
    sign.scale.multiplyScalar(0.55);
    sign.position.set(F.cx, 4.6, F.minZ - 3);
    this.group.add(sign);

    // two goalkeepers
    this.keepers = [F.minZ + 0.8, F.maxZ - 0.8].map((z, i) => {
      const ch = createCharacter({
        skin: i ? '#f1c7a3' : '#a86b4a', hair: i ? '#d9a441' : '#1b1b1b', hairStyle: i ? 'long' : 'spiky',
        shirt: i ? '#22c55e' : '#f97316', pants: '#222', shoes: '#fff', height: 1.05,
      });
      ch.root.position.set(F.cx, 0, z);
      ch.root.rotation.y = i ? Math.PI : 0;
      this.scene.add(ch.root);
      return { ch, x: F.cx, z, phase: 0 };
    });
    this.circles = this.keepers.map((k) => ({ x: k.x, z: k.z, r: 0.55 }));
  }

  resetBall() {
    this.ballPos.set(F.cx, BALL_R + 2, F.cz);
    this.ballVel.set(0, 0, 0);
    this.goalTimer = 0;
  }

  onPitch(p) {
    return p.x > F.minX - 2 && p.x < F.maxX + 2 && p.z > F.minZ - 2 && p.z < F.maxZ + 2;
  }

  updateFootball(dt, t, player) {
    const b = this.ballPos, v = this.ballVel;
    this.kickCooldown -= dt;

    // kick: bump into the ball
    const pr = player.riding ? 0.8 : 0.55;
    const dx = b.x - player.pos.x, dz = b.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < pr + BALL_R && b.y < 1.6 + player.pos.y) {
      const nx = dx / (d || 1), nz = dz / (d || 1);
      b.x = player.pos.x + nx * (pr + BALL_R);
      b.z = player.pos.z + nz * (pr + BALL_R);
      if (this.kickCooldown <= 0) {
        const power = Math.max(5, player.speed * 1.7);
        v.set(nx * power + player.vel.x * 0.3, player.speed > 6 ? 3.2 : 1.2, nz * power + player.vel.z * 0.3);
        this.kickCooldown = 0.2;
        audio.sfx('kick');
      }
    }

    // goalkeepers track the ball
    this.keepers.forEach((k, i) => {
      const wantX = THREE.MathUtils.clamp(b.x, F.goalMin + 0.3, F.goalMax - 0.3);
      const step = THREE.MathUtils.clamp(wantX - k.x, -2.4 * dt, 2.4 * dt);
      k.x += step;
      k.phase += dt * 8;
      k.ch.root.position.x = k.x;
      k.ch.animate(dt, k.phase, Math.abs(step) > 0.01 ? 'walk' : 'idle', 0.7);
      this.circles[i].x = k.x;
      // save!
      const kx = b.x - k.x, kz = b.z - k.z, kd = Math.hypot(kx, kz);
      if (kd < 0.75 + BALL_R && b.y < 2) {
        const nx = kx / (kd || 1), nz = kz / (kd || 1);
        b.x = k.x + nx * (0.75 + BALL_R);
        b.z = k.z + nz * (0.75 + BALL_R);
        const vn = v.x * nx + v.z * nz;
        if (vn < 0) {
          v.x -= 1.8 * vn * nx;
          v.z -= 1.8 * vn * nz;
          k.ch.wave(0.5);
          audio.sfx('kick');
        }
      }
    });

    // physics
    v.y -= 20 * dt;
    b.addScaledVector(v, dt);
    if (b.y < BALL_R) {
      b.y = BALL_R;
      v.y = Math.abs(v.y) > 1.5 ? -v.y * 0.5 : 0;
    }
    if (b.y <= BALL_R + 0.001) {
      const f = Math.exp(-1.1 * dt);
      v.x *= f;
      v.z *= f;
    }

    // walls (the goal mouths are open)
    const inMouth = b.x > F.goalMin && b.x < F.goalMax;
    if (b.x < F.minX - 0.3) (b.x = F.minX - 0.3), (v.x = Math.abs(v.x) * 0.6);
    if (b.x > F.maxX + 0.3) (b.x = F.maxX + 0.3), (v.x = -Math.abs(v.x) * 0.6);
    if (!inMouth) {
      if (b.z < F.minZ - 0.3) (b.z = F.minZ - 0.3), (v.z = Math.abs(v.z) * 0.6);
      if (b.z > F.maxZ + 0.3) (b.z = F.maxZ + 0.3), (v.z = -Math.abs(v.z) * 0.6);
    } else if (!this.goalTimer && (b.z < F.minZ - 0.4 || b.z > F.maxZ + 0.4) && b.y < 2.2) {
      this.goals++;
      this.goalTimer = 1.4;
      audio.sfx('goal');
      this.confetti(40);
      const best = this.saveBest('goals', this.goals, false);
      this.toast(`⚽ <b>GOAL!</b> That's ${this.goals}${best && this.goals > 1 ? ' · new record!' : ''}`, 2200);
    }
    // inside the net: stop it
    if (b.z < F.minZ - 1.4) (b.z = F.minZ - 1.4), (v.z = 0), (v.x *= 0.5);
    if (b.z > F.maxZ + 1.4) (b.z = F.maxZ + 1.4), (v.z = 0), (v.x *= 0.5);
    if (this.goalTimer) {
      this.goalTimer -= dt;
      if (this.goalTimer <= 0) this.resetBall();
    }

    // roll
    const sp = Math.hypot(v.x, v.z);
    if (sp > 0.01) {
      const axis = new THREE.Vector3(v.z, 0, -v.x).normalize();
      this.ball.rotateOnWorldAxis(axis, (sp * dt) / BALL_R);
    }

    if (!this.active && this.onPitch(player.pos)) {
      const best = this.best.goals ? ` · best ${this.best.goals}` : '';
      this.setHUD('⚽', 'Football', `Goals: ${this.goals}${best}`, '', false);
    } else if (!this.active) this.hideHUD();
  }

  // ---------------------------------------------------------------
  update(dt, t, player) {
    for (const p of this.pads) {
      p.ring.visible = p.label.visible = !this.active;
      const s = 1 + Math.sin(t * 3 + p.z) * 0.05;
      p.ring.scale.set(s, s, s);
      p.label.position.y = 3.4 + Math.sin(t * 2 + p.x) * 0.15;
    }
    if (this.active?.key === 'stars') this.updateStars(dt, t, player);
    else if (this.active?.key === 'race') this.updateRace(dt, t, player);
    this.updateFootball(dt, t, player);
  }

  // dots for the minimap
  mapPoints() {
    const pts = [{ x: this.ballPos.x, z: this.ballPos.z, kind: 'ball' }];
    const a = this.active;
    if (!a) for (const p of this.pads) pts.push({ x: p.x, z: p.z, kind: 'pad', icon: p.icon });
    else if (a.key === 'stars') for (const s of a.stars) !s.got && pts.push({ x: s.x, z: s.z, kind: 'star' });
    else if (a.key === 'race') pts.push({ x: a.rings[a.next].x, z: a.rings[a.next].z, kind: 'ring' });
    return pts;
  }

  dispose() {
    this.hudEl.remove();
  }
}
