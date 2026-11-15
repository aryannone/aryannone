// =====================================================================
//  The player: your student avatar, plus the rideable bicycle.
// =====================================================================
import * as THREE from 'three';
import { createCharacter } from './Character.js';
import { mat, mesh } from './materials.js';
import { WALK_R } from './Campus.js';

const WALK = 5, RUN = 8.5, BIKE = 14;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angleLerp = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

// Push a circle (x, z, r) out of all colliders
export function collide(p, r, boxes, circles) {
  for (const b of boxes) {
    const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
    const dx = p.x - cx, dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        p.x += (dx / d) * (r - d);
        p.z += (dz / d) * (r - d);
      } else {
        // centre is inside the box: push out the shortest way
        const opts = [[b.minX - r - p.x, 0], [b.maxX + r - p.x, 0], [0, b.minZ - r - p.z], [0, b.maxZ + r - p.z]];
        opts.sort((a, c) => Math.abs(a[0] + a[1]) - Math.abs(c[0] + c[1]));
        p.x += opts[0][0];
        p.z += opts[0][1];
      }
    }
  }
  for (const c of circles) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const min = r + c.r;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      p.x += (dx / d) * (min - d);
      p.z += (dz / d) * (min - d);
    }
  }
  const d = Math.hypot(p.x, p.z);
  if (d > WALK_R) {
    p.x *= WALK_R / d;
    p.z *= WALK_R / d;
  }
}

export function createBike() {
  const g = new THREE.Group();
  const frame = mat('#ff5a5f');
  const dark = mat('#2b2d42');
  const wheels = [];
  for (const z of [-0.78, 0.78]) {
    const w = new THREE.Group();
    const tyre = mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 18), dark);
    w.add(tyre);
    for (let i = 0; i < 3; i++) {
      const sp = mesh(new THREE.BoxGeometry(0.03, 0.8, 0.03), mat('#cfd3dc'), { cast: false });
      sp.rotation.z = (i / 3) * Math.PI;
      w.add(sp);
    }
    w.rotation.y = Math.PI / 2;
    w.position.set(0, 0.49, z);
    g.add(w);
    wheels.push(w);
  }
  const bar = (len, x, y, z, rx) => {
    const m = mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), frame);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
  };
  bar(1.1, 0, 0.82, 0.05, Math.PI / 2 - 0.15); // top tube
  bar(0.85, 0, 0.62, -0.38, 0.75); // seat stay
  bar(0.8, 0, 0.62, 0.42, -0.5); // down tube
  bar(0.75, 0, 0.88, 0.7, -0.3); // fork
  const seat = mesh(new THREE.BoxGeometry(0.22, 0.08, 0.38), dark);
  seat.position.set(0, 1.08, -0.28);
  g.add(seat);
  const hb = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), dark);
  hb.rotation.z = Math.PI / 2;
  hb.position.set(0, 1.25, 0.62);
  g.add(hb);
  const basket = mesh(new THREE.BoxGeometry(0.45, 0.3, 0.35), mat('#c98b55'));
  basket.position.set(0, 1.05, 0.95);
  g.add(basket);
  return { group: g, wheels };
}

export class Player {
  constructor(scene, look, spawn, bikeSpawn) {
    this.char = createCharacter(look);
    scene.add(this.char.root);
    this.pos = new THREE.Vector3(spawn.x, 0, spawn.z);
    this.vel = new THREE.Vector3();
    this.heading = Math.PI; // facing north (-z)
    this.vy = 0;
    this.phase = 0;
    this.lastStep = 0;
    this.riding = false;
    this.speed = 0;
    this.radius = 0.55;

    this.bike = createBike();
    this.bike.pos = new THREE.Vector3(bikeSpawn.x, 0, bikeSpawn.z);
    this.bike.heading = bikeSpawn.rot;
    this.bike.group.position.copy(this.bike.pos);
    this.bike.group.rotation.y = this.bike.heading;
    scene.add(this.bike.group);

    // soft blob shadow under the player (helps read depth when jumping)
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 16),
      new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.06;
    scene.add(blob);
    this.blob = blob;
  }

  get grounded() {
    return this.pos.y <= 0.0001;
  }

  nearBike() {
    return !this.riding && this.pos.distanceTo(this.bike.pos) < 2.6;
  }

  toggleBike() {
    if (this.riding) {
      this.riding = false;
      // step off to the side of the bike
      const side = this.bike.heading + Math.PI / 2;
      this.pos.x += Math.sin(side) * 1.1;
      this.pos.z += Math.cos(side) * 1.1;
      this.vel.set(0, 0, 0);
      return true;
    }
    if (this.nearBike()) {
      this.riding = true;
      this.heading = this.bike.heading;
      this.pos.copy(this.bike.pos);
      this.vel.set(0, 0, 0);
      this.speed = 0;
      return true;
    }
    return false;
  }

  jump() {
    if (this.grounded && !this.riding) {
      this.vy = 7.5;
      return true;
    }
    return false;
  }

  update(dt, move, world, onStep) {
    const { boxes, circles } = world;
    const has = Math.hypot(move.x, move.z) > 0.08;

    if (this.riding) {
      // bikes turn gradually and keep momentum
      if (has) {
        const target = Math.atan2(move.x, move.z);
        this.heading = angleLerp(this.heading, target, 1 - Math.exp(-4 * dt));
      }
      const targetSpeed = has ? BIKE * Math.min(1, Math.hypot(move.x, move.z)) : 0;
      this.speed = damp(this.speed, targetSpeed, has ? 2 : 3, dt);
      this.vel.set(Math.sin(this.heading) * this.speed, 0, Math.cos(this.heading) * this.speed);
    } else {
      const sp = move.run ? RUN : WALK;
      this.vel.x = damp(this.vel.x, move.x * sp, 12, dt);
      this.vel.z = damp(this.vel.z, move.z * sp, 12, dt);
      if (has) this.heading = angleLerp(this.heading, Math.atan2(move.x, move.z), 1 - Math.exp(-14 * dt));
      this.speed = Math.hypot(this.vel.x, this.vel.z);
    }

    const before = this.pos.clone();
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    collide(this.pos, this.riding ? 0.75 : this.radius, boxes, circles);
    // if we hit something on the bike, lose speed
    if (this.riding && dt > 0) {
      const actual = Math.hypot(this.pos.x - before.x, this.pos.z - before.z) / dt;
      if (actual < this.speed * 0.6) this.speed = actual;
    }

    // jumping / gravity
    this.vy -= 22 * dt;
    this.pos.y = Math.max(0, this.pos.y + this.vy * dt);
    if (this.grounded) this.vy = 0;

    // animation
    const c = this.char;
    c.root.position.copy(this.pos);
    c.root.rotation.y = this.heading;
    if (this.riding) {
      this.phase += dt * this.speed * 1.6;
      c.animate(dt, this.phase, 'ride');
      this.bike.pos.copy(this.pos);
      this.bike.heading = this.heading;
      this.bike.group.position.copy(this.pos);
      this.bike.group.rotation.y = this.heading;
      // lean into turns a little
      this.bike.group.rotation.z = 0;
      for (const w of this.bike.wheels) w.rotation.x -= (this.speed * dt) / 0.42;
      c.root.position.add(new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)).multiplyScalar(-0.22));
    } else if (!this.grounded) {
      c.animate(dt, this.phase, 'air');
    } else if (this.speed > 0.4) {
      this.phase += dt * (3 + this.speed * 1.35);
      c.animate(dt, this.phase, 'walk', Math.min(1, this.speed / WALK));
      const stepIdx = Math.floor(this.phase / Math.PI);
      if (stepIdx !== this.lastStep) {
        this.lastStep = stepIdx;
        onStep && onStep();
      }
    } else {
      this.phase += dt * 2;
      c.animate(dt, this.phase, 'idle');
    }
    this.blob.position.set(this.pos.x, 0.06, this.pos.z);
    const s = 1 - Math.min(0.5, this.pos.y * 0.2);
    this.blob.scale.set(s, s, s);
  }
}
