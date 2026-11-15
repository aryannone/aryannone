// Students who wander along the campus paths and wave when you walk by.
import * as THREE from 'three';
import { createCharacter } from './Character.js';
import { NAV } from './Campus.js';

const SKIN = ['#f1c7a3', '#d9a07a', '#c68863', '#a86b4a', '#7d4f36'];
const HAIR = ['#1b1b1b', '#3b2416', '#7a4a24', '#d9a441', '#b5462f'];
const SHIRT = ['#ff6f61', '#6c8cff', '#2bb3a0', '#ffd166', '#b28dff', '#ff8fb8', '#53c26b', '#f08a24'];
const STYLES = ['short', 'spiky', 'long', 'short', 'long'];
const pick = (a) => a[(Math.random() * a.length) | 0];

const neighbours = {};
for (const [a, b] of NAV.edges) {
  (neighbours[a] ||= []).push(b);
  (neighbours[b] ||= []).push(a);
}

function makeBubble() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(64, 56, 46, 0, Math.PI * 2);
  g.moveTo(50, 96);
  g.lineTo(64, 122);
  g.lineTo(78, 96);
  g.fill();
  g.font = '56px serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('👋', 64, 60);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true });
}

export class NPCs {
  constructor(scene, count = 10) {
    this.list = [];
    const bubbleMat = makeBubble();
    const keys = Object.keys(NAV.nodes);
    for (let i = 0; i < count; i++) {
      const ch = createCharacter({
        skin: pick(SKIN), hair: pick(HAIR), hairStyle: pick(STYLES), shirt: pick(SHIRT),
        pants: pick(['#2b3044', '#4a5a7a', '#6b4f3a', '#3a3a3a']), shoes: pick(['#fff', '#222', '#e2574c']),
        backpack: Math.random() < 0.6 ? pick(SHIRT) : null, glasses: Math.random() < 0.25,
        height: 0.9 + Math.random() * 0.15, outline: !matchMedia('(pointer: coarse)').matches,
      });
      const from = keys[(Math.random() * keys.length) | 0];
      const [x, z] = NAV.nodes[from];
      const bubble = new THREE.Sprite(bubbleMat);
      bubble.scale.set(0.9, 0.9, 1);
      bubble.visible = false;
      ch.root.add(bubble);
      bubble.position.y = 2.95;
      scene.add(ch.root);
      // small random offset so they don't walk in single file
      const npc = {
        ch, bubble, node: from, target: from, wait: Math.random() * 3,
        pos: new THREE.Vector3(x, 0, z), heading: Math.random() * 6, phase: Math.random() * 6,
        speed: 1.5 + Math.random() * 0.8, lane: (Math.random() - 0.5) * 2.2, greeted: 0,
      };
      this.list.push(npc);
    }
    // colliders that the player bumps into (updated every frame)
    this.circles = this.list.map((n) => ({ x: n.pos.x, z: n.pos.z, r: 0.45 }));
  }

  update(dt, player, onGreet) {
    this.list.forEach((n, i) => {
      const dp = Math.hypot(player.pos.x - n.pos.x, player.pos.z - n.pos.z);
      n.greeted = Math.max(0, n.greeted - dt);

      if (dp < 3.2) {
        // stop, look at the player and wave
        const want = Math.atan2(player.pos.x - n.pos.x, player.pos.z - n.pos.z);
        n.heading += (((want - n.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 6);
        if (n.greeted <= 0) {
          n.ch.wave(1.4);
          n.greeted = 8;
          onGreet && onGreet();
        }
        n.bubble.visible = n.greeted > 6;
        n.phase += dt * 2;
        n.ch.animate(dt, n.phase, 'idle');
      } else if (n.wait > 0) {
        n.wait -= dt;
        n.bubble.visible = n.greeted > 6;
        n.phase += dt * 2;
        n.ch.animate(dt, n.phase, 'idle');
        if (n.wait <= 0) {
          const opts = neighbours[n.node];
          n.target = opts[(Math.random() * opts.length) | 0];
        }
      } else {
        n.bubble.visible = n.greeted > 6;
        const [tx0, tz0] = NAV.nodes[n.target];
        const [fx, fz] = NAV.nodes[n.node];
        // offset sideways from the path centre-line
        const len = Math.hypot(tx0 - fx, tz0 - fz) || 1;
        const tx = tx0 + (-(tz0 - fz) / len) * n.lane;
        const tz = tz0 + ((tx0 - fx) / len) * n.lane;
        const dx = tx - n.pos.x, dz = tz - n.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.3 || n.node === n.target) {
          n.node = n.target;
          n.wait = 0.5 + Math.random() * 3;
        } else {
          const want = Math.atan2(dx, dz);
          n.heading += (((want - n.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 5);
          n.pos.x += (dx / d) * n.speed * dt;
          n.pos.z += (dz / d) * n.speed * dt;
          n.phase += dt * (3 + n.speed * 1.4);
          n.ch.animate(dt, n.phase, 'walk', 0.6);
        }
      }
      n.ch.root.position.copy(n.pos);
      n.ch.root.rotation.y = n.heading;
      this.circles[i].x = n.pos.x;
      this.circles[i].z = n.pos.z;
    });
  }
}
