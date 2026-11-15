// =====================================================================
//  The cartoon college campus: a floating island with buildings,
//  paths, trees, a fountain, a sports ground and more.
//
//  Layout (top-down, north = up = -z):
//
//                 [Admin Block]           <- About
//                       |
//   [Comp Lab] ----- (fountain) ----- [Library]
//                       |
//   [Workshop] -------- + -------- (Sports Ground)
//                       |
//        [Canteen] -----+   [Notice Board]
//                     (Gate)
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh } from './materials.js';

export const ISLAND_R = 62;
export const WALK_R = 56.5;

// Colours (cartoon palette)
const COL = {
  grass: '#86d35b', grassDark: '#6cbf47', dirt: '#b97a45', rock: '#8a5a38', rockDark: '#6f4630',
  path: '#f4dcab', plaza: '#f7e6c1', stone: '#d9cbb0', white: '#fffaf0', roofRed: '#e2574c',
  cream: '#fde8c4', glass: '#9fd8ff', water: '#58c4f2', gold: '#ffc83d', wood: '#a0673d',
};

// Section zones: where you press E. `face` is the direction the door faces.
export const ZONES = [
  { key: 'about', x: 0, z: -22.6, color: '#e2574c' },
  { key: 'projects', x: -25.8, z: 0, color: '#3d7be0' },
  { key: 'education', x: 25.6, z: 0, color: '#2bb3a0' },
  { key: 'skills', x: -25.5, z: 22, color: '#f0a020' },
  { key: 'achievements', x: 23.5, z: 22, color: '#ffc83d' },
  { key: 'hobbies', x: -8.6, z: 38, color: '#ff6f91' },
  { key: 'contact', x: 5.2, z: 40.5, color: '#8b5cf6' },
];

// Walkable path graph for NPC students
export const NAV = {
  nodes: {
    gate: [0, 46], g2: [0, 38], canteen: [-8, 38], s22: [0, 22], w22: [-22, 22], e22: [20, 22],
    S: [0, 9.5], E: [9.5, 0], W: [-9.5, 0], N: [0, -9.5], lab: [-24, 0], lib: [24, 0], admin: [0, -24],
  },
  edges: [
    ['gate', 'g2'], ['g2', 'canteen'], ['g2', 's22'], ['s22', 'w22'], ['s22', 'e22'], ['s22', 'S'],
    ['S', 'E'], ['S', 'W'], ['E', 'N'], ['W', 'N'], ['E', 'lib'], ['W', 'lab'], ['N', 'admin'],
  ],
};

export const SPAWN = { x: 0, z: 41 };
export const BIKE_SPAWN = { x: -3.4, z: 42.6, rot: Math.PI / 2 };

// Seeded random so the campus looks the same on every visit
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

export function makeLabel(text, color) {
  const W = 1024, H = 160;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.font = '600 64px Fredoka, Inter, sans-serif';
  const w = Math.min(W - 20, g.measureText(text).width + 90);
  const x0 = (W - w) / 2;
  g.fillStyle = 'rgba(30,30,50,.25)';
  roundRect(g, x0 + 4, 26, w, 110, 55);
  g.fill();
  g.fillStyle = '#fffaf0';
  roundRect(g, x0, 18, w, 110, 55);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = color;
  g.stroke();
  g.fillStyle = '#2b2d42';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, W / 2, 76);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: false }));
  s.scale.set(W / 80, H / 80, 1);
  s.renderOrder = 10;
  return s;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Add a box whose BOTTOM sits at y
function B(group, w, h, d, x, y, z, color, rotY = 0) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = rotY;
  group.add(m);
  return m;
}

function Cyl(group, rt, rb, h, x, y, z, color, seg = 12) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y + h / 2, z);
  group.add(m);
  return m;
}

const glassMat = () => mat(COL.glass, { emissive: '#5fb8ff', emissiveIntensity: 0.25, roughness: 0.3 });

// A row of windows along the front (+z) face of a building
function windows(g, w, d, rows, y0, rowH, color = null, cols = null) {
  const n = cols || Math.max(2, Math.floor(w / 2.6));
  const m = color ? mat(color, { emissive: color, emissiveIntensity: 0.35 }) : glassMat();
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w / n) * (i + 0.5);
      if (Math.abs(x) < 1.6 && r === 0) continue; // leave room for the door
      B(g, 1.3, 1.2, 0.15, x, y0 + r * rowH, d / 2, m);
    }
  }
}

// ---------------------------------------------------------------------
//  Buildings: each built in local space with its front facing +z
// ---------------------------------------------------------------------
function adminBlock() {
  const g = new THREE.Group();
  const w = 24, d = 10;
  B(g, w, 7, d, 0, 0, 0, COL.cream);
  B(g, w + 0.8, 0.6, d + 0.8, 0, 7, 0, COL.roofRed);
  windows(g, w, d, 2, 1.6, 3);
  // portico + columns
  B(g, 9, 0.5, 4, 0, 0, d / 2 + 2, COL.stone);
  B(g, 10, 0.6, 4.4, 0, 5.6, d / 2 + 2, COL.white);
  for (let i = 0; i < 4; i++) Cyl(g, 0.35, 0.4, 5.1, -3.6 + i * 2.4, 0.5, d / 2 + 3.5, COL.white);
  const ped = mesh(new THREE.CylinderGeometry(3.3, 3.3, 4.4, 3), mat(COL.roofRed));
  ped.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  ped.scale.set(1, 1, 0.45);
  ped.position.set(0, 6.9, d / 2 + 2);
  g.add(ped);
  B(g, 2.4, 3.4, 0.3, 0, 0.5, d / 2 + 0.05, COL.wood); // door
  // clock tower
  B(g, 5, 15, 5, 0, 0, -1, COL.cream);
  B(g, 5.6, 0.5, 5.6, 0, 15, -1, COL.white);
  const roof = mesh(new THREE.ConeGeometry(4.2, 4.5, 4), mat(COL.roofRed));
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, 17.75, -1);
  g.add(roof);
  const face = mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 24), mat(COL.white));
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 12, 1.6);
  g.add(face);
  return { g, w: w + 1, d: d + 9, cz: 2.2 };
}

function computerLab() {
  const g = new THREE.Group();
  const w = 16, d = 12;
  B(g, w, 7, d, 0, 0, 0, '#a9c8f5');
  B(g, w + 0.6, 0.5, d + 0.6, 0, 7, 0, '#33415c');
  // glowing "screen" window band
  B(g, w - 2, 1.6, 0.2, 0, 4.4, d / 2, mat('#7ff0ff', { emissive: '#36d6ff', emissiveIntensity: 0.6 }));
  windows(g, w, d, 1, 1.4, 3);
  B(g, 2.6, 3.2, 0.25, 0, 0, d / 2 + 0.05, glassMat());
  B(g, 3.6, 0.3, 1.6, 0, 3.4, d / 2 + 0.8, '#33415c'); // canopy
  // rooftop dish + antenna
  const dish = mesh(new THREE.SphereGeometry(1.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), mat(COL.white));
  dish.rotation.x = -2.2;
  dish.position.set(-4, 8.4, -2);
  g.add(dish);
  Cyl(g, 0.15, 0.15, 1.2, -4, 7.5, -2, '#666');
  Cyl(g, 0.08, 0.12, 4, 5, 7.5, 2, '#444');
  const tip = mesh(new THREE.SphereGeometry(0.25, 8, 6), mat('#ff4d4d', { emissive: '#ff2020', emissiveIntensity: 1 }));
  tip.position.set(5, 11.6, 2);
  g.add(tip);
  return { g, w, d: d + 2 };
}

function library() {
  const g = new THREE.Group();
  const w = 16, d = 12;
  B(g, w, 7.5, d, 0, 0, 0, '#e48a63');
  B(g, w + 0.6, 0.5, d + 0.6, 0, 7.5, 0, COL.white);
  windows(g, w, d, 2, 1.4, 3);
  B(g, 2.6, 3.6, 0.25, 0, 0, d / 2 + 0.05, COL.wood);
  for (let i = 0; i < 4; i++) Cyl(g, 0.3, 0.35, 5.5, -4.2 + i * 2.8 + (i > 1 ? 0 : 0), 0, d / 2 + 1.6, COL.white);
  B(g, 11, 0.5, 2.4, 0, 5.5, d / 2 + 1.3, COL.white);
  const dome = mesh(new THREE.SphereGeometry(4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#4fc1b0'));
  dome.position.set(0, 8, -0.5);
  g.add(dome);
  // a giant stack of books on the roof
  const books = ['#ff6f61', '#ffd166', '#6c8cff', '#8bd17c'];
  books.forEach((c, i) => B(g, 3.4 - i * 0.15, 0.55, 2.2, 5 + (i % 2) * 0.25, 8 + i * 0.55, 3, c, i * 0.15));
  return { g, w, d: d + 3 };
}

function workshop() {
  const g = new THREE.Group();
  const w = 14, d = 12;
  B(g, w, 6, d, 0, 0, 0, '#ffc94a');
  // sawtooth roof
  for (let i = 0; i < 3; i++) {
    const r = B(g, w + 0.4, 0.4, 4.4, 0, 6.6, -4 + i * 4, '#8a5a3c');
    r.rotation.x = -0.32;
  }
  windows(g, w, d, 1, 3.6, 3, null, 4);
  // garage door with stripes
  B(g, 5, 3.6, 0.2, 0, 0, d / 2 + 0.05, '#5b6475');
  for (let i = 0; i < 4; i++) B(g, 5, 0.12, 0.25, 0, 0.6 + i * 0.85, d / 2 + 0.06, '#3f4656');
  return { g, w, d };
}

function canteen() {
  const g = new THREE.Group();
  const w = 12, d = 9;
  B(g, w, 5, d, 0, 0, 0, '#ff9fb0');
  B(g, w + 0.6, 0.45, d + 0.6, 0, 5, 0, '#ffffff');
  windows(g, w, d, 1, 1.3, 3, null, 4);
  B(g, 2.4, 3, 0.25, 0, 0, d / 2 + 0.05, glassMat());
  // striped awning
  for (let i = 0; i < 8; i++) {
    const a = B(g, w / 8, 0.2, 2.4, -w / 2 + (w / 8) * (i + 0.5), 3.6, d / 2 + 1.1, i % 2 ? COL.white : '#ff5f73');
    a.rotation.x = 0.3;
  }
  // giant coffee cup on the roof
  Cyl(g, 1.3, 1, 2.2, 0, 5.45, 0, COL.white, 16);
  Cyl(g, 1.25, 1.25, 0.1, 0, 7.6, 0, '#6b3e26', 16);
  const handle = mesh(new THREE.TorusGeometry(0.6, 0.2, 6, 12), mat(COL.white));
  handle.position.set(1.3, 6.6, 0);
  g.add(handle);
  return { g, w, d: d + 2 };
}

function noticeBoard() {
  const g = new THREE.Group();
  Cyl(g, 0.12, 0.12, 3.4, -2, 0, 0, COL.wood, 6);
  Cyl(g, 0.12, 0.12, 3.4, 2, 0, 0, COL.wood, 6);
  B(g, 4.8, 2.4, 0.25, 0, 1, 0, '#c98b55');
  B(g, 5.2, 0.3, 0.6, 0, 3.4, 0, '#8a5a3c');
  const papers = ['#fff', '#ffe28a', '#a8e0ff', '#ffc2d1', '#c9f2c7'];
  papers.forEach((c, i) => B(g, 0.8, 0.9, 0.05, -1.7 + i * 0.85, 1.6 + (i % 2) * 0.5, 0.14, c, 0));
  // post box
  Cyl(g, 0.55, 0.55, 1.4, 3.4, 0, 0.6, '#e2382f', 14);
  const top = mesh(new THREE.SphereGeometry(0.55, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e2382f'));
  top.position.set(3.4, 1.4, 0.6);
  g.add(top);
  return { g, w: 8.2, d: 1.6 };
}

// ---------------------------------------------------------------------
export function buildCampus(scene) {
  const rand = rng(42);
  const statics = new THREE.Group(); // merged at the end for speed
  const dynamic = new THREE.Group(); // animated things
  scene.add(dynamic);

  const boxes = []; // AABB colliders {minX,maxX,minZ,maxZ}
  const circles = []; // circle colliders {x,z,r}
  const map = { rects: [], circles: [], paths: [], trees: [] }; // minimap shapes

  // ---------------- floating island ----------------
  const grass = mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R, 1, 48), mat(COL.grass), { cast: false });
  grass.position.y = -0.5;
  scene.add(grass);
  const dirt = mesh(new THREE.CylinderGeometry(ISLAND_R + 0.3, ISLAND_R - 2, 4, 48), mat(COL.dirt), { cast: false });
  dirt.position.y = -3;
  scene.add(dirt);
  const under = mesh(new THREE.ConeGeometry(ISLAND_R - 2, 38, 14), mat(COL.rock), { cast: false });
  under.rotation.x = Math.PI;
  under.position.y = -24;
  scene.add(under);
  const under2 = mesh(new THREE.ConeGeometry(ISLAND_R * 0.55, 30, 9), mat(COL.rockDark), { cast: false });
  under2.rotation.set(Math.PI, 0.4, 0);
  under2.position.set(-14, -30, 10);
  scene.add(under2);

  // ---------------- paths ----------------
  const pathMat = mat(COL.path);
  const path = (x1, z1, x2, z2, w = 5) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = mesh(new THREE.BoxGeometry(w, 0.06, len), pathMat, { cast: false });
    m.position.set((x1 + x2) / 2, 0.03, (z1 + z2) / 2);
    m.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    statics.add(m);
    map.paths.push({ x1, z1, x2, z2, w });
  };
  path(0, 50, 0, -28);
  path(-28, 0, 28, 0);
  path(-26, 22, 24, 22, 4.2);
  path(-11, 38, 0, 38, 3.6);
  path(0, 40.5, 8, 40.5, 3.2);
  const plaza = mesh(new THREE.CylinderGeometry(11, 11, 0.08, 40), mat(COL.plaza), { cast: false });
  plaza.position.y = 0.04;
  statics.add(plaza);
  const ring = mesh(new THREE.TorusGeometry(11, 0.25, 4, 48), mat(COL.stone), { cast: false });
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  statics.add(ring);
  map.circles.push({ x: 0, z: 0, r: 11, color: COL.plaza });

  // ---------------- buildings ----------------
  const place = ({ g, w, d, cz = 0 }, x, z, rot, color, label, labelY) => {
    // cz shifts the collider centre in local z (for buildings with porches)
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    statics.add(g);
    const swap = Math.abs(Math.sin(rot)) > 0.5;
    const hw = (swap ? d : w) / 2, hd = (swap ? w : d) / 2;
    const ox = Math.sin(rot) * cz, oz = Math.cos(rot) * cz;
    const r = { minX: x + ox - hw, maxX: x + ox + hw, minZ: z + oz - hd, maxZ: z + oz + hd };
    boxes.push(r);
    map.rects.push({ ...r, color });
    if (label) {
      const s = makeLabel(label, color);
      s.position.set(x, labelY, z);
      dynamic.add(s);
    }
  };

  const admin = adminBlock();
  place({ ...admin, d: 10, cz: 0 }, 0, -34, 0, '#f2c27b', '🏛️ Admin Block', 23);
  boxes.push({ minX: -4.6, maxX: 4.6, minZ: -29, maxZ: -25.2 }); // portico
  place(computerLab(), -36, 0, Math.PI / 2, '#a9c8f5', '💻 Computer Lab', 13);
  place(library(), 36, 0, -Math.PI / 2, '#e48a63', '📚 Library', 14.5);
  place(workshop(), -34, 22, Math.PI / 2, '#ffc94a', '🔧 Tech Workshop', 10.5);
  place(canteen(), -17, 38, Math.PI / 2, '#ff9fb0', '☕ Canteen', 10.5);
  place(noticeBoard(), 9, 40.5, -Math.PI / 2, '#a78bfa', '📮 Contact', 5.6);

  // admin clock hands (animated with real time!)
  const clock = new THREE.Group();
  clock.position.set(0, 12, -32.85);
  const hourHand = mesh(new THREE.BoxGeometry(0.16, 0.9, 0.08), mat('#222'), { cast: false });
  hourHand.geometry.translate(0, 0.4, 0);
  const minHand = mesh(new THREE.BoxGeometry(0.1, 1.3, 0.08), mat('#222'), { cast: false });
  minHand.geometry.translate(0, 0.6, 0);
  clock.add(hourHand, minHand);
  dynamic.add(clock);

  // ---------------- gate ----------------
  for (const x of [-4.5, 4.5]) {
    B(statics, 1.8, 6, 1.8, x, 0, 50, '#c8614a');
    B(statics, 2.2, 0.5, 2.2, x, 6, 50, COL.white);
    circles.push({ x, z: 50, r: 1.3 });
  }
  B(statics, 11, 1.2, 0.9, 0, 5.2, 50, '#2f4b7c');
  const gateSign = makeLabel('🎓 Welcome to Campus', '#2f4b7c');
  gateSign.position.set(0, 7.4, 50);
  dynamic.add(gateSign);

  // ---------------- fountain ----------------
  Cyl(statics, 3.3, 3.5, 0.7, 0, 0, 0, COL.stone, 20);
  const water = mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.1, 20), mat(COL.water, { emissive: '#2a9fd6', emissiveIntensity: 0.25, roughness: 0.2 }), { cast: false });
  water.position.y = 0.62;
  statics.add(water);
  Cyl(statics, 0.4, 0.55, 2.2, 0, 0.6, 0, COL.stone, 10);
  Cyl(statics, 1.3, 0.5, 0.4, 0, 2.6, 0, COL.stone, 14);
  const jet = mesh(
    new THREE.ConeGeometry(0.9, 1.6, 12, 1, true),
    new THREE.MeshStandardMaterial({ color: '#bdeaff', transparent: true, opacity: 0.7, emissive: '#7fd4ff', emissiveIntensity: 0.4 }),
    { cast: false }
  );
  jet.position.y = 3.6;
  jet.rotation.x = Math.PI;
  dynamic.add(jet);
  circles.push({ x: 0, z: 0, r: 3.7 });
  map.circles.push({ x: 0, z: 0, r: 3.5, color: COL.water });

  // ---------------- sports ground ----------------
  const field = mesh(new THREE.BoxGeometry(14, 0.06, 22), mat(COL.grassDark), { cast: false });
  field.position.set(37, 0.03, 26);
  statics.add(field);
  map.rects.push({ minX: 30, maxX: 44, minZ: 15, maxZ: 37, color: COL.grassDark, flat: true });
  const line = mat('#ffffff');
  const L = (w, d, x, z) => {
    const m = mesh(new THREE.BoxGeometry(w, 0.08, d), line, { cast: false });
    m.position.set(x, 0.04, z);
    statics.add(m);
  };
  L(13, 0.15, 37, 15.6); L(13, 0.15, 37, 36.4); L(0.15, 21, 30.6, 26); L(0.15, 21, 43.4, 26); L(13, 0.15, 37, 26);
  const cc = mesh(new THREE.TorusGeometry(2.2, 0.08, 3, 32), line, { cast: false });
  cc.rotation.x = Math.PI / 2;
  cc.position.set(37, 0.05, 26);
  statics.add(cc);
  for (const z of [15.4, 36.6]) {
    B(statics, 0.18, 2.2, 0.18, 35, 0, z, COL.white);
    B(statics, 0.18, 2.2, 0.18, 39, 0, z, COL.white);
    B(statics, 4.2, 0.18, 0.18, 37, 2.2, z, COL.white);
  }
  // bleachers
  for (let i = 0; i < 3; i++) B(statics, 1.2, 0.6 + i * 0.6, 14, 46 + i * 1.2, 0, 26, i % 2 ? '#5b8def' : '#7aa5ff');
  boxes.push({ minX: 45.4, maxX: 49.6, minZ: 19, maxZ: 33 });
  // trophy on a pedestal (achievements)
  B(statics, 2.4, 1.6, 2.4, 27, 0, 22, COL.white);
  const goldMat = mat(COL.gold, { metalness: 0.55, roughness: 0.3, emissive: '#b07a00', emissiveIntensity: 0.25, flatShading: false });
  const pts = [[0, 0], [0.7, 0], [0.7, 0.25], [0.25, 0.4], [0.2, 1.1], [0.9, 1.5], [1.15, 2.8], [0, 2.8]].map(
    ([x, y]) => new THREE.Vector2(x, y)
  );
  const trophy = new THREE.Group();
  trophy.add(mesh(new THREE.LatheGeometry(pts, 20), goldMat));
  for (const s of [-1, 1]) {
    const h = mesh(new THREE.TorusGeometry(0.45, 0.1, 6, 14), goldMat);
    h.position.set(s * 1.15, 2.1, 0);
    trophy.add(h);
  }
  trophy.position.set(27, 1.6, 22);
  dynamic.add(trophy);
  circles.push({ x: 27, z: 22, r: 1.8 });
  const trophySign = makeLabel('🏆 Sports Ground', '#e6a700');
  trophySign.position.set(27, 6.4, 22);
  dynamic.add(trophySign);

  // ---------------- canteen tables ----------------
  for (const [x, z] of [[-9, 33], [-9, 43.5], [-5.6, 33.5]]) {
    Cyl(statics, 0.9, 0.9, 0.12, x, 0.85, z, COL.white, 12);
    Cyl(statics, 0.1, 0.1, 0.85, x, 0, z, '#666', 6);
    Cyl(statics, 0.06, 0.06, 2.4, x, 0.9, z, '#666', 6);
    const umb = mesh(new THREE.ConeGeometry(1.6, 0.7, 8), mat('#ff5f73'));
    umb.position.set(x, 3.4, z);
    statics.add(umb);
    circles.push({ x, z, r: 1.1 });
  }

  // ---------------- benches & lamps ----------------
  const benchAt = (x, z, rot) => {
    const b = new THREE.Group();
    B(b, 2.4, 0.15, 0.7, 0, 0.5, 0, COL.wood);
    B(b, 2.4, 0.6, 0.12, 0, 0.65, -0.3, COL.wood);
    B(b, 0.12, 0.5, 0.6, -1, 0, 0, '#555');
    B(b, 0.12, 0.5, 0.6, 1, 0, 0, '#555');
    b.position.set(x, 0, z);
    b.rotation.y = rot;
    statics.add(b);
    circles.push({ x, z, r: 1.2 });
  };
  [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(([x, z]) => benchAt(x * 1.0, z * 1.0, Math.atan2(-x, -z)));
  benchAt(-5, 30, Math.PI / 2);
  benchAt(5, 30, -Math.PI / 2);

  const lampGlow = mat('#fff1c4', { emissive: '#ffd27a', emissiveIntensity: 1.2 });
  const lamp = (x, z) => {
    Cyl(statics, 0.09, 0.12, 3.6, x, 0, z, '#3b3f52', 6);
    const head = mesh(new THREE.SphereGeometry(0.32, 10, 8), lampGlow, { cast: false });
    head.position.set(x, 3.8, z);
    statics.add(head);
    circles.push({ x, z, r: 0.35 });
  };
  for (let z = 46; z >= -22; z -= 9) if (Math.abs(z) > 12) { lamp(-3.3, z); lamp(3.3, z); }
  for (let x = -24; x <= 24; x += 8) if (Math.abs(x) > 12) { lamp(x, -3.3); lamp(x, 3.3); }

  // ---------------- trees, bushes, flowers ----------------
  const blocked = (x, z, pad) => {
    if (Math.hypot(x, z) > WALK_R - 1) return true;
    if (Math.hypot(x, z) < 14) return true;
    if (Math.abs(x) < 6 && z > -30 && z < 52) return true;
    if (Math.abs(z) < 6 && Math.abs(x) < 30) return true;
    if (Math.abs(z - 22) < 5 && x > -28 && x < 26) return true;
    if (Math.abs(z - 38) < 7 && x > -26 && x < 12) return true;
    if (x > 22 && x < 51 && z > 12 && z < 40) return true;
    for (const b of boxes) if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad) return true;
    for (const zn of ZONES) if (Math.hypot(x - zn.x, z - zn.z) < 5) return true;
    return false;
  };

  const trees = [];
  let tries = 0;
  while (trees.length < 120 && tries++ < 6000) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (WALK_R + 4);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const outer = Math.hypot(x, z) > WALK_R - 1 && Math.hypot(x, z) < ISLAND_R - 2;
    if (!outer && blocked(x, z, 3)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
    trees.push({ x, z, s: 0.8 + rand() * 0.6, pine: rand() < 0.35, hue: rand() });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 1.8, 6);
  trunkGeo.translate(0, 0.9, 0);
  const leafGeo = new THREE.IcosahedronGeometry(1.5, 0);
  const pineGeo = new THREE.ConeGeometry(1.5, 3.4, 7);
  const white = new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true, roughness: 0.9 });
  const trunks = new THREE.InstancedMesh(trunkGeo, mat('#8a5a3c'), trees.length);
  const leaves = new THREE.InstancedMesh(leafGeo, white, trees.length * 2);
  const pines = new THREE.InstancedMesh(pineGeo, white, trees.length * 2);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  const C = new THREE.Color();
  let li = 0, pi = 0;
  trees.forEach((t, i) => {
    M.compose(P.set(t.x, 0, t.z), Q.identity(), S.setScalar(t.s));
    trunks.setMatrixAt(i, M);
    if (t.pine) {
      for (let k = 0; k < 2; k++) {
        M.compose(P.set(t.x, (2.4 + k * 1.4) * t.s, t.z), Q.identity(), S.setScalar(t.s * (1 - k * 0.3)));
        pines.setMatrixAt(pi, M);
        pines.setColorAt(pi++, C.setHSL(0.36 + t.hue * 0.05, 0.5, 0.36 + k * 0.05));
      }
    } else {
      for (let k = 0; k < 2; k++) {
        Q.setFromEuler(new THREE.Euler(t.hue * 3, t.hue * 5 + k, 0));
        M.compose(P.set(t.x + (k ? 0.5 : 0), (2.6 + k * 0.9) * t.s, t.z), Q, S.setScalar(t.s * (1.1 - k * 0.3)));
        leaves.setMatrixAt(li, M);
        // mostly greens, with the odd pink blossom tree
        if (t.hue > 0.85) C.setHSL(0.93, 0.7, 0.75 - k * 0.05);
        else C.setHSL(0.24 + t.hue * 0.12, 0.6, 0.45 + k * 0.06);
        leaves.setColorAt(li++, C);
      }
    }
    circles.push({ x: t.x, z: t.z, r: 0.6 * t.s });
    map.trees.push({ x: t.x, z: t.z });
  });
  leaves.count = li;
  pines.count = pi;
  for (const im of [trunks, leaves, pines]) {
    im.castShadow = im.receiveShadow = true;
    scene.add(im);
  }

  // bushes + flowers
  const bushes = [];
  tries = 0;
  while (bushes.length < 90 && tries++ < 4000) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * (WALK_R - 1);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z, 1.2)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 1.8)) continue;
    bushes.push({ x, z, flower: rand() < 0.55, c: rand() });
  }
  const bushGeo = new THREE.IcosahedronGeometry(0.6, 0);
  const flowerGeo = new THREE.SphereGeometry(0.14, 6, 4);
  const bushIM = new THREE.InstancedMesh(bushGeo, white, bushes.length);
  const flowerIM = new THREE.InstancedMesh(flowerGeo, white, bushes.length * 5);
  let bi = 0, fi = 0;
  const flowerCols = ['#ff6f91', '#ffd166', '#ffffff', '#b28dff', '#ff9f43'];
  for (const b of bushes) {
    if (b.flower) {
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2 + b.c;
        M.compose(P.set(b.x + Math.cos(ang) * 0.6, 0.25, b.z + Math.sin(ang) * 0.6), Q.identity(), S.setScalar(1));
        flowerIM.setMatrixAt(fi, M);
        flowerIM.setColorAt(fi++, C.set(flowerCols[(b.c * 5) | 0]));
      }
    } else {
      M.compose(P.set(b.x, 0.3, b.z), Q.identity(), S.set(1.2, 0.8, 1.1));
      bushIM.setMatrixAt(bi, M);
      bushIM.setColorAt(bi++, C.setHSL(0.27 + b.c * 0.06, 0.55, 0.4));
    }
  }
  bushIM.count = bi;
  flowerIM.count = fi;
  bushIM.castShadow = true;
  bushIM.receiveShadow = flowerIM.receiveShadow = true;
  scene.add(bushIM, flowerIM);

  // ---------------- zone markers ----------------
  const markers = ZONES.map((z) => {
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.9, 2.3, 40),
      new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 0.85, depthWrite: false })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(z.x, 0.1, z.z);
    const gem = mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({ color: z.color, emissive: z.color, emissiveIntensity: 0.6, flatShading: true }),
      { receive: false }
    );
    gem.position.set(z.x, 3, z.z);
    dynamic.add(ringMesh, gem);
    return { ...z, ring: ringMesh, gem };
  });

  // ---------------- clouds ----------------
  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, emissive: '#ffe9d6', emissiveIntensity: 0.25 });
  for (let i = 0; i < 16; i++) {
    const cg = new THREE.Group();
    const n = 3 + ((rand() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + rand() * 2, 0), cloudMat);
      s.position.set(k * 2.6 - n * 1.3, rand() * 1.2, rand() * 2 - 1);
      cg.add(s);
    }
    const a = rand() * Math.PI * 2, r = 70 + rand() * 60;
    cg.position.set(Math.cos(a) * r, -25 + rand() * 50, Math.sin(a) * r);
    cg.scale.setScalar(1 + rand() * 1.4);
    cg.userData.speed = 0.4 + rand() * 0.6;
    scene.add(cg);
    clouds.push(cg);
  }

  // ---------------- merge static geometry ----------------
  scene.add(bake(statics));

  // ---------------- per-frame updates ----------------
  function update(t, dt) {
    const now = new Date();
    const h = (now.getHours() % 12) + now.getMinutes() / 60;
    hourHand.rotation.z = -(h / 12) * Math.PI * 2;
    minHand.rotation.z = -(now.getMinutes() / 60) * Math.PI * 2;
    jet.scale.set(1, 1 + Math.sin(t * 6) * 0.08, 1);
    trophy.rotation.y = t * 0.6;
    for (const m of markers) {
      m.gem.position.y = 3 + Math.sin(t * 2 + m.x) * 0.3;
      m.gem.rotation.y = t * 1.5;
      const s = 1 + Math.sin(t * 3 + m.z) * 0.06;
      m.ring.scale.set(s, s, s);
    }
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 140) c.position.x = -140;
    }
  }

  function markVisited(key) {
    const m = markers.find((x) => x.key === key);
    if (!m) return;
    m.gem.material.color.set('#4ade80');
    m.gem.material.emissive.set('#22c55e');
    m.ring.material.color.set('#4ade80');
  }

  return { boxes, circles, map, update, markVisited };
}

// Merge every mesh in the group into one mesh per material (way fewer draw calls)
function bake(group) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    g.applyMatrix4(o.matrixWorld);
    const key = o.material.uuid + (o.castShadow ? 'c' : '');
    if (!byMat.has(key)) byMat.set(key, { material: o.material, cast: o.castShadow, geos: [] });
    byMat.get(key).geos.push(g);
  });
  const out = new THREE.Group();
  for (const { material, cast, geos } of byMat.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos), material);
    m.castShadow = cast;
    m.receiveShadow = true;
    out.add(m);
  }
  return out;
}
