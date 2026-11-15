// =====================================================================
//  A cartoon student: smooth rounded shapes, toon (cel) shading and a
//  thin ink outline, like an animated movie character rather than blocks.
//  Used for the player (configured in content.js -> avatar) and for the
//  NPC students.
// =====================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const INK = '#2b2d42';

// ---------- shared toon materials ----------
let gradient = null;
function gradientMap() {
  if (!gradient) {
    // three tones: shadow, mid, lit -> the classic "cel shaded" look
    gradient = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

const toonCache = new Map();
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!toonCache.has(key)) toonCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...opts }));
  return toonCache.get(key);
}
const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const basicCache = new Map();
const basic = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!basicCache.has(key)) basicCache.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  return basicCache.get(key);
};

// ---------- shared geometry (NPCs reuse the same shapes) ----------
const geoCache = new Map();
const G = (key, make) => (geoCache.has(key) ? geoCache.get(key) : (geoCache.set(key, make()), geoCache.get(key)));
const sphere = (r, w = 24, h = 16) => G(`s${r}|${w}`, () => new THREE.SphereGeometry(r, w, h));
const capsule = (r, len) => G(`c${r}|${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 16));
const rbox = (w, h, d, r) => G(`b${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));

const darker = (c, k = 0.78) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();

// A mesh with an optional ink outline (inverted hull of a fixed thickness)
function part(geo, material, { outline = 0.022, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (outline) {
    geo.computeBoundingBox();
    const s = new THREE.Vector3();
    geo.boundingBox.getSize(s);
    const o = new THREE.Mesh(geo, outlineMat);
    o.scale.set(1 + (2 * outline) / s.x, 1 + (2 * outline) / s.y, 1 + (2 * outline) / s.z);
    m.add(o);
  }
  return m;
}

export function createCharacter(look) {
  const L = {
    skin: '#c68863', hair: '#222', hairStyle: 'short', beard: false, glasses: false,
    shirt: '#3d7be0', pants: '#2b3044', shoes: '#eee', backpack: null, height: 1, build: 1,
    outline: true,
    ...look,
  };
  const ol = L.outline ? 0.022 : 0;
  const skin = toon(L.skin), shirt = toon(L.shirt), pants = toon(L.pants), hairM = toon(L.hair, { side: THREE.DoubleSide });

  const root = new THREE.Group(); // stays upright; rotated to face movement
  const body = new THREE.Group(); // bobs, squashes and stretches
  root.add(body);

  // ---- legs: rounded capsules with chunky sneakers ----
  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.13 * L.build, 0.6, 0);
    const leg = part(capsule(0.105, 0.32), pants, { outline: ol });
    leg.position.y = -0.265;
    pivot.add(leg);
    const shoe = part(sphere(0.14, 18, 12), toon(L.shoes), { outline: ol });
    shoe.scale.set(1, 0.62, 1.45);
    shoe.position.set(0, -0.53, 0.05);
    pivot.add(shoe);
    const sole = part(sphere(0.14, 18, 8), toon(darker(L.shoes, 0.55)), { outline: 0, shadow: false });
    sole.scale.set(1.02, 0.25, 1.47);
    sole.position.set(0, -0.58, 0.05);
    pivot.add(sole);
    body.add(pivot);
    legs.push(pivot);
  }
  const [legL, legR] = legs;
  const hips = part(sphere(0.25), pants, { outline: ol });
  hips.scale.set(1.12 * L.build, 0.62, 0.85);
  hips.position.y = 0.62;
  body.add(hips);

  // ---- torso: a soft hoodie ----
  const torso = new THREE.Group();
  torso.position.y = 0.6;
  body.add(torso);
  const hoodie = part(capsule(0.27, 0.28), shirt, { outline: ol });
  hoodie.scale.set(1.12 * L.build, 1, 0.82);
  hoodie.position.y = 0.33;
  torso.add(hoodie);
  const collar = part(G('collar', () => new THREE.TorusGeometry(0.17, 0.075, 10, 24)), toon(darker(L.shirt, 0.82)), { outline: 0 });
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.7, -0.02);
  torso.add(collar);
  const pocket = part(rbox(0.34, 0.13, 0.06, 0.03), toon(darker(L.shirt)), { outline: 0, shadow: false });
  pocket.position.set(0, 0.17, 0.21);
  torso.add(pocket);
  for (const s of [-1, 1]) {
    const string = part(G('string', () => new THREE.CylinderGeometry(0.012, 0.012, 0.17, 6)), basic('#ffffff'), { outline: 0, shadow: false });
    string.position.set(s * 0.06, 0.56, 0.215);
    torso.add(string);
  }
  if (L.backpack) {
    const pack = part(rbox(0.44, 0.5, 0.22, 0.08), toon(L.backpack), { outline: ol });
    pack.position.set(0, 0.38, -0.27);
    torso.add(pack);
    const front = part(rbox(0.3, 0.18, 0.06, 0.03), toon(darker(L.backpack)), { outline: 0, shadow: false });
    front.position.set(0, 0.28, -0.39);
    torso.add(front);
    for (const s of [-1, 1]) {
      const strap = part(rbox(0.06, 0.5, 0.04, 0.015), toon(darker(L.backpack, 0.6)), { outline: 0, shadow: false });
      strap.position.set(s * 0.17 * L.build, 0.42, 0.2);
      strap.rotation.x = -0.1;
      torso.add(strap);
    }
  }

  // ---- arms: noodle arms with round mitten hands ----
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * (0.3 * L.build + 0.06), 0.62, 0);
    const arm = part(capsule(0.085, 0.26), shirt, { outline: ol });
    arm.position.y = -0.215;
    pivot.add(arm);
    const cuff = part(G('cuff', () => new THREE.TorusGeometry(0.075, 0.03, 8, 16)), toon(darker(L.shirt, 0.82)), { outline: 0, shadow: false });
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.38;
    pivot.add(cuff);
    const hand = part(sphere(0.1, 16, 12), skin, { outline: ol });
    hand.position.y = -0.45;
    pivot.add(hand);
    torso.add(pivot);
    arms.push(pivot);
  }
  const [armL, armR] = arms;

  // ---- head: big and round, with a friendly face ----
  const head = new THREE.Group();
  head.position.y = 0.98;
  torso.add(head);
  const skull = part(sphere(0.44, 32, 24), skin, { outline: ol });
  skull.scale.set(1.05, 0.95, 0.98);
  skull.position.y = 0.36;
  head.add(skull);
  for (const s of [-1, 1]) {
    const ear = part(sphere(0.09, 12, 10), skin, { outline: ol });
    ear.scale.set(0.6, 1, 0.8);
    ear.position.set(s * 0.45, 0.34, 0);
    head.add(ear);
  }

  // eyes (grouped so they can blink)
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.15, 0.4, 0.395);
    const white = part(sphere(0.1, 18, 14), basic('#ffffff'), { outline: 0.012, shadow: false });
    white.scale.set(0.85, 1.15, 0.5);
    const pupil = part(sphere(0.064, 16, 12), basic('#1d1b2c'), { outline: 0, shadow: false });
    pupil.scale.set(1, 1.2, 0.5);
    pupil.position.set(s * -0.008, -0.018, 0.04);
    const shine = part(sphere(0.022, 8, 6), basic('#ffffff'), { outline: 0, shadow: false });
    shine.position.set(0.02, 0.025, 0.07);
    eye.add(white, pupil, shine);
    head.add(eye);
    eyes.push(eye);
    const brow = part(capsule(0.018, 0.08), toon(L.hair), { outline: 0, shadow: false });
    brow.rotation.z = Math.PI / 2 + s * 0.15;
    brow.position.set(s * 0.15, 0.56, 0.385);
    head.add(brow);
    const cheek = part(sphere(0.06, 12, 8), basic('#ff8fa3', { transparent: true, opacity: 0.55, depthWrite: false }), { outline: 0, shadow: false });
    cheek.scale.set(1, 0.6, 0.3);
    cheek.position.set(s * 0.26, 0.27, 0.345);
    head.add(cheek);
  }
  const nose = part(sphere(0.042, 12, 8), toon(darker(L.skin, 0.9)), { outline: 0, shadow: false });
  nose.position.set(0, 0.31, 0.445);
  head.add(nose);
  const mouth = part(G('smile', () => new THREE.TorusGeometry(0.06, 0.016, 8, 16, Math.PI)), basic('#6b2430'), { outline: 0, shadow: false });
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, 0.215, 0.41);
  head.add(mouth);

  // hair styles
  if (L.hairStyle !== 'bald') {
    const cap = part(G('cap', () => new THREE.SphereGeometry(0.465, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52)), hairM, { outline: ol });
    cap.position.y = 0.4;
    cap.rotation.x = -0.38;
    head.add(cap);
    if (L.hairStyle === 'spiky') {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const sp = part(G('spike', () => new THREE.ConeGeometry(0.11, 0.3, 12)), hairM, { outline: ol });
        sp.position.set(Math.cos(a) * 0.2, 0.78, Math.sin(a) * 0.2 - 0.05);
        sp.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
        head.add(sp);
      }
    } else {
      // soft fringe tufts
      for (const [x, y, z, r] of [[-0.18, 0.66, 0.27, 0.4], [0, 0.71, 0.3, 0], [0.18, 0.66, 0.27, -0.4]]) {
        const tuft = part(sphere(0.13, 16, 12), hairM, { outline: 0 });
        tuft.scale.set(1.15, 0.6, 0.8);
        tuft.position.set(x, y, z);
        tuft.rotation.z = r;
        head.add(tuft);
      }
    }
    if (L.hairStyle === 'long') {
      const back = part(capsule(0.3, 0.3), hairM, { outline: ol });
      back.scale.set(1.4, 1, 0.6);
      back.position.set(0, 0.18, -0.24);
      head.add(back);
      for (const s of [-1, 1]) {
        const lock = part(capsule(0.08, 0.3), hairM, { outline: ol });
        lock.position.set(s * 0.4, 0.17, 0.08);
        head.add(lock);
      }
    }
  }
  if (L.beard) {
    const beard = part(G('beard', () => new THREE.SphereGeometry(0.47, 24, 12, 0, Math.PI, Math.PI * 0.62, Math.PI * 0.32)), hairM, { outline: 0 });
    beard.position.y = 0.36;
    head.add(beard);
  }
  if (L.glasses) {
    const gm = basic('#1d1b2c');
    for (const s of [-1, 1]) {
      const lens = part(G('lens', () => new THREE.TorusGeometry(0.115, 0.018, 8, 28)), gm, { outline: 0, shadow: false });
      lens.position.set(s * 0.15, 0.4, 0.47);
      head.add(lens);
    }
    const bridge = part(capsule(0.012, 0.06), gm, { outline: 0, shadow: false });
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.42, 0.48);
    head.add(bridge);
  }

  root.scale.setScalar(L.height);

  // ---- animation ----
  let wave = 0;
  let blink = 1 + Math.random() * 3;
  let squash = 0; // >0 right after landing
  let lastMode = 'idle';
  function animate(dt, phase, mode, amount = 1) {
    if (lastMode === 'air' && mode !== 'air' && mode !== 'ride') squash = 1;
    lastMode = mode;

    let legA = 0, armA = 0, bob = 0, lean = 0, sway = 0;
    if (mode === 'walk') {
      legA = Math.sin(phase) * 0.8 * amount;
      armA = -legA * 0.95;
      bob = Math.abs(Math.cos(phase)) * 0.08 * amount;
      lean = 0.1 * amount;
      sway = Math.sin(phase) * 0.05 * amount;
    } else if (mode === 'idle') {
      bob = Math.sin(phase * 0.5) * 0.015;
    }
    if (mode === 'ride') {
      // seated + pedalling
      legL.rotation.x = -1.2 + Math.sin(phase) * 0.5;
      legR.rotation.x = -1.2 - Math.sin(phase) * 0.5;
      armL.rotation.x = armR.rotation.x = -1.15;
      armL.rotation.z = -0.12;
      armR.rotation.z = 0.12;
      torso.rotation.set(0.3, 0, 0);
      body.position.y = 0.5;
    } else if (mode === 'air') {
      legL.rotation.x = -0.6;
      legR.rotation.x = 0.35;
      armL.rotation.x = armR.rotation.x = -2.7;
      armL.rotation.z = -0.35;
      armR.rotation.z = 0.35;
      torso.rotation.set(0, 0, 0);
      body.position.y = 0;
    } else {
      legL.rotation.x = legA;
      legR.rotation.x = -legA;
      armL.rotation.x = armA;
      armR.rotation.x = -armA;
      armL.rotation.z = -0.1 - (mode === 'idle' ? Math.sin(phase * 0.5) * 0.03 : 0);
      armR.rotation.z = 0.1 + (mode === 'idle' ? Math.sin(phase * 0.5) * 0.03 : 0);
      torso.rotation.set(lean, sway, -sway * 0.5);
      body.position.y = bob;
    }
    // squash & stretch: squish on landing, stretch while in the air
    squash = Math.max(0, squash - dt * 5);
    const sq = mode === 'air' ? -0.08 : Math.sin(squash * Math.PI) * 0.22;
    body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);

    // waving overrides the right arm
    if (wave > 0) {
      wave -= dt;
      armR.rotation.x = -0.2;
      armR.rotation.z = 2.7 + Math.sin(wave * 16) * 0.35;
      head.rotation.z = -0.12;
    } else {
      head.rotation.z = mode === 'idle' ? Math.sin(phase * 0.3) * 0.05 : sway * -0.6;
    }
    head.rotation.x = mode === 'walk' ? -0.05 : 0;

    // blink every few seconds
    blink -= dt;
    const closed = blink < 0.12;
    for (const e of eyes) e.scale.y = closed ? 0.12 : 1;
    if (blink < 0) blink = 2 + Math.random() * 3.5;
  }

  return { root, animate, wave: (t = 1.4) => (wave = t), headY: 2.4 * L.height };
}
