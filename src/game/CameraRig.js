// =====================================================================
//  Third-person camera: sits low behind the player (no bird's-eye view)
//  and can be orbited and zoomed.
//   - mouse: drag to look around, wheel to zoom
//   - touch: drag with one finger to look around, pinch to zoom
//   - keys:  V cycles close / normal / far, R snaps back behind you
//  It gently swings back behind you while you move, and pulls in when a
//  building gets between you and the camera.
// =====================================================================
import * as THREE from 'three';

const PRESETS = [
  { dist: 4.6, pitch: 0.2 }, // close, over-the-shoulder
  { dist: 7.5, pitch: 0.3 }, // normal
  { dist: 13, pitch: 0.55 }, // far
];
const MIN_DIST = 2.8, MAX_DIST = 20, MIN_PITCH = -0.05, MAX_PITCH = 1.15;
const angDiff = (a, b) => ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;

export class CameraRig {
  constructor(camera, dom, { portrait = false } = {}) {
    this.camera = camera;
    this.dom = dom;
    this.preset = 1;
    this.distMul = portrait ? 1.25 : 1;
    this.yaw = 0; // 0 = camera south of the player, looking north
    this.pitch = PRESETS[1].pitch;
    this.dist = PRESETS[1].dist;
    this.cur = { yaw: 0, pitch: 1.0, dist: 30 }; // start high and far, then swoop in
    this.effDist = 30;
    this.target = new THREE.Vector3();
    this.lastManual = -10;
    this.time = 0;
    this.enabled = true;

    // ---------- pointer controls ----------
    const pts = new Map();
    let pinch = 0;
    this.onDown = (e) => {
      if (!this.enabled) return;
      dom.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) pinch = this.pinchDist(pts);
      dom.classList.add('dragging');
    };
    this.onMove = (e) => {
      const p = pts.get(e.pointerId);
      if (!p || !this.enabled) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pts.size === 1) {
        const k = e.pointerType === 'touch' ? 0.007 : 0.005;
        this.yaw -= dx * k;
        this.pitch = THREE.MathUtils.clamp(this.pitch + dy * k * 0.8, MIN_PITCH, MAX_PITCH);
      } else if (pts.size === 2) {
        const d = this.pinchDist(pts);
        if (pinch) this.zoomBy(pinch / d);
        pinch = d;
      }
      this.lastManual = this.time;
    };
    this.onUp = (e) => {
      pts.delete(e.pointerId);
      pinch = pts.size === 2 ? this.pinchDist(pts) : 0;
      if (!pts.size) dom.classList.remove('dragging');
    };
    this.onWheel = (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.zoomBy(Math.exp(e.deltaY * 0.0012));
    };
    this.onMenu = (e) => e.preventDefault();
    dom.addEventListener('pointerdown', this.onDown);
    dom.addEventListener('pointermove', this.onMove);
    dom.addEventListener('pointerup', this.onUp);
    dom.addEventListener('pointercancel', this.onUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('contextmenu', this.onMenu);
  }

  pinchDist(pts) {
    const [a, b] = [...pts.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  zoomBy(f) {
    this.dist = THREE.MathUtils.clamp(this.dist * f, MIN_DIST, MAX_DIST);
    this.lastManual = this.time;
  }

  cyclePreset() {
    this.preset = (this.preset + 1) % PRESETS.length;
    this.dist = PRESETS[this.preset].dist;
    this.pitch = PRESETS[this.preset].pitch;
    return ['Close', 'Normal', 'Far'][this.preset];
  }

  // snap behind the player
  reset(heading) {
    this.yaw = heading + Math.PI;
    this.pitch = PRESETS[this.preset].pitch;
    this.dist = PRESETS[this.preset].dist;
  }

  // Turn joystick/WASD input (screen space) into a world direction
  toWorld(move) {
    const c = Math.cos(this.cur.yaw), s = Math.sin(this.cur.yaw);
    return { x: c * move.x + s * move.z, z: -s * move.x + c * move.z, run: move.run };
  }

  update(dt, player, boxes) {
    this.time += dt;

    // swing back behind the player while they move forward-ish
    const idle = this.time - this.lastManual;
    if (idle > 1.2 && player.speed > 1) {
      const behind = player.heading + Math.PI;
      const diff = angDiff(this.yaw, behind);
      const forwardness = Math.max(0, Math.cos(diff * 0.5) * 2 - 1); // 1 when already behind, 0 when sideways
      const rate = (player.riding ? 1.6 : 0.6) * Math.min(1, (idle - 1.2) * 0.8) * forwardness;
      this.yaw += diff * Math.min(1, rate * dt);
    }

    // smooth everything
    const k = 1 - Math.exp(-10 * dt);
    const intro = this.time < 2.5 ? 1 - Math.exp(-2.2 * dt) : k;
    this.cur.yaw += angDiff(this.cur.yaw, this.yaw) * k;
    this.cur.pitch += (this.pitch - this.cur.pitch) * intro;
    this.cur.dist += (this.dist * this.distMul * (player.riding ? 1.15 : 1) - this.cur.dist) * intro;

    const tgt = this.target.set(player.pos.x, player.pos.y * 0.6 + 2.05, player.pos.z);
    const cp = Math.cos(this.cur.pitch);
    const dir = new THREE.Vector3(Math.sin(this.cur.yaw) * cp, Math.sin(this.cur.pitch), Math.cos(this.cur.yaw) * cp);

    // don't let buildings block the view: pull in to the first wall hit
    let want = this.cur.dist;
    const hit = rayBoxes(tgt.x, tgt.z, dir.x, dir.z, want * cp, boxes);
    if (hit < Infinity) want = Math.max(1.6, hit / Math.max(cp, 0.2) - 0.4);
    this.effDist = want < this.effDist ? want : this.effDist + (want - this.effDist) * (1 - Math.exp(-3 * dt));

    const pos = tgt.clone().addScaledVector(dir, this.effDist);
    pos.y = Math.max(0.5, pos.y);
    this.camera.position.copy(pos);
    this.camera.lookAt(tgt);
  }

  dispose() {
    const d = this.dom;
    d.removeEventListener('pointerdown', this.onDown);
    d.removeEventListener('pointermove', this.onMove);
    d.removeEventListener('pointerup', this.onUp);
    d.removeEventListener('pointercancel', this.onUp);
    d.removeEventListener('wheel', this.onWheel);
    d.removeEventListener('contextmenu', this.onMenu);
  }
}

// 2D ray (origin ox,oz; direction dx,dz) vs axis-aligned boxes. Returns the
// horizontal distance to the nearest hit within maxLen, or Infinity.
function rayBoxes(ox, oz, dx, dz, maxLen, boxes) {
  const len = Math.hypot(dx, dz);
  if (len < 1e-5) return Infinity;
  dx /= len;
  dz /= len;
  let best = Infinity;
  const pad = 0.35;
  for (const b of boxes) {
    let t0 = 0, t1 = maxLen;
    for (const [o, d, mn, mx] of [[ox, dx, b.minX - pad, b.maxX + pad], [oz, dz, b.minZ - pad, b.maxZ + pad]]) {
      if (Math.abs(d) < 1e-6) {
        if (o < mn || o > mx) t0 = Infinity;
      } else {
        let a = (mn - o) / d, c = (mx - o) / d;
        if (a > c) [a, c] = [c, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, c);
      }
    }
    if (t0 <= t1 && t0 > 0 && t0 < best) best = t0;
  }
  return best;
}
