// =====================================================================
//  A cartoon student built from simple shapes. Used for the player
//  (configured in content.js -> avatar) and for the NPC students.
// =====================================================================
import * as THREE from 'three';
import { mat, mesh } from './materials.js';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// Create a limb whose pivot is at the top (shoulder / hip)
function limb(w, h, d, material) {
  const pivot = new THREE.Group();
  const g = box(w, h, d);
  g.translate(0, -h / 2, 0);
  pivot.add(mesh(g, material));
  return pivot;
}

export function createCharacter(look) {
  const L = {
    skin: '#c68863', hair: '#222', hairStyle: 'short', beard: false, glasses: false,
    shirt: '#3d7be0', pants: '#2b3044', shoes: '#eee', backpack: null, height: 1, build: 1,
    ...look,
  };
  const root = new THREE.Group(); // stays upright; rotated to face movement
  const body = new THREE.Group(); // bobs up and down
  root.add(body);

  // ---- legs (with shoes) ----
  const legL = limb(0.22, 0.72, 0.24, mat(L.pants));
  const legR = limb(0.22, 0.72, 0.24, mat(L.pants));
  for (const [leg, x] of [[legL, -0.15], [legR, 0.15]]) {
    leg.position.set(x * L.build, 0.78, 0);
    const shoe = mesh(box(0.26, 0.14, 0.36), mat(L.shoes));
    shoe.position.set(0, -0.7, 0.05);
    leg.add(shoe);
    body.add(leg);
  }

  // ---- torso (hoodie) ----
  const torso = new THREE.Group();
  torso.position.y = 0.78;
  const chest = mesh(box(0.66 * L.build, 0.72, 0.38), mat(L.shirt));
  chest.position.y = 0.36;
  torso.add(chest);
  // hoodie pocket stripe for a bit of detail
  const pocket = mesh(box(0.4 * L.build, 0.14, 0.02), mat(new THREE.Color(L.shirt).multiplyScalar(0.8).getStyle()));
  pocket.position.set(0, 0.16, 0.2);
  torso.add(pocket);
  body.add(torso);

  if (L.backpack) {
    const pack = mesh(box(0.5, 0.56, 0.24), mat(L.backpack));
    pack.position.set(0, 0.42, -0.3);
    torso.add(pack);
    const flap = mesh(box(0.52, 0.16, 0.26), mat(new THREE.Color(L.backpack).multiplyScalar(0.78).getStyle()));
    flap.position.set(0, 0.66, -0.3);
    torso.add(flap);
  }

  // ---- arms (pivot at the shoulder) ----
  const armL = limb(0.17, 0.62, 0.2, mat(L.shirt));
  const armR = limb(0.17, 0.62, 0.2, mat(L.shirt));
  for (const [arm, s] of [[armL, -1], [armR, 1]]) {
    arm.position.set(s * (0.33 * L.build + 0.1), 0.68, 0);
    const hand = mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(L.skin));
    hand.position.y = -0.66;
    arm.add(hand);
    torso.add(arm);
  }

  // ---- head ----
  const head = new THREE.Group();
  head.position.y = 0.72 + 0.36;
  torso.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.34, 14, 10), mat(L.skin));
  skull.scale.set(1, 1.02, 0.95);
  head.add(skull);

  const eyeGeo = new THREE.SphereGeometry(0.045, 8, 6);
  for (const x of [-0.12, 0.12]) {
    const eye = mesh(eyeGeo, mat('#1a1a1a'), { cast: false });
    eye.position.set(x, 0.03, 0.31);
    eye.scale.y = 1.4;
    head.add(eye);
  }
  const smile = mesh(new THREE.TorusGeometry(0.07, 0.016, 4, 10, Math.PI), mat('#5a2e22'), { cast: false });
  smile.position.set(0, -0.12, 0.31);
  smile.rotation.z = Math.PI;
  head.add(smile);

  // hair styles
  const hairMat = mat(L.hair);
  if (L.hairStyle !== 'bald') {
    const cap = mesh(new THREE.SphereGeometry(0.36, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
    cap.position.y = 0.04;
    cap.rotation.x = -0.25;
    head.add(cap);
    const fringe = mesh(box(0.56, 0.1, 0.12), hairMat);
    fringe.position.set(0, 0.24, 0.24);
    fringe.rotation.x = 0.3;
    head.add(fringe);
    if (L.hairStyle === 'spiky') {
      for (let i = 0; i < 6; i++) {
        const sp = mesh(new THREE.ConeGeometry(0.08, 0.22, 5), hairMat);
        const a = (i / 6) * Math.PI * 2;
        sp.position.set(Math.cos(a) * 0.16, 0.36, Math.sin(a) * 0.16 - 0.03);
        sp.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        head.add(sp);
      }
    }
    if (L.hairStyle === 'long') {
      const back = mesh(box(0.64, 0.6, 0.18), hairMat);
      back.position.set(0, -0.12, -0.24);
      head.add(back);
    }
  }
  if (L.beard) {
    const beard = mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI, Math.PI * 0.5, Math.PI * 0.4), hairMat);
    beard.position.set(0, -0.02, 0.02);
    beard.rotation.y = -Math.PI / 2;
    beard.scale.set(1, 1, 1.12);
    head.add(beard);
  }
  if (L.glasses) {
    const gm = mat('#111');
    for (const x of [-0.12, 0.12]) {
      const lens = mesh(new THREE.TorusGeometry(0.075, 0.015, 4, 12), gm, { cast: false });
      lens.position.set(x, 0.03, 0.33);
      head.add(lens);
    }
    const bridge = mesh(box(0.09, 0.02, 0.02), gm, { cast: false });
    bridge.position.set(0, 0.04, 0.34);
    head.add(bridge);
  }

  root.scale.setScalar(L.height);

  // ---- animation ----
  let wave = 0;
  function animate(dt, phase, mode, amount = 1) {
    let legA = 0, armA = 0, bob = 0, lean = 0;
    if (mode === 'walk') {
      legA = Math.sin(phase) * 0.75 * amount;
      armA = -legA * 0.9;
      bob = Math.abs(Math.cos(phase)) * 0.07 * amount;
      lean = 0.08 * amount;
    } else if (mode === 'idle') {
      bob = Math.sin(phase * 0.5) * 0.012;
    }
    if (mode === 'ride') {
      // seated + pedalling
      legL.rotation.x = -1.15 + Math.sin(phase) * 0.45;
      legR.rotation.x = -1.15 - Math.sin(phase) * 0.45;
      armL.rotation.x = armR.rotation.x = -1.05;
      armL.rotation.z = 0.12;
      armR.rotation.z = -0.12;
      torso.rotation.x = 0.28;
      body.position.y = 0.35;
    } else if (mode === 'air') {
      legL.rotation.x = -0.5;
      legR.rotation.x = 0.3;
      armL.rotation.x = armR.rotation.x = -2.6;
      armL.rotation.z = 0.25;
      armR.rotation.z = -0.25;
      torso.rotation.x = 0;
      body.position.y = 0;
    } else {
      legL.rotation.x = legA;
      legR.rotation.x = -legA;
      armL.rotation.x = armA;
      armR.rotation.x = -armA;
      armL.rotation.z = 0.06;
      armR.rotation.z = -0.06;
      torso.rotation.x = lean;
      body.position.y = bob;
    }
    // waving overrides the right arm
    if (wave > 0) {
      wave -= dt;
      armR.rotation.x = -0.3;
      armR.rotation.z = -2.6 + Math.sin(wave * 18) * 0.35;
    }
    head.rotation.z = mode === 'idle' ? Math.sin(phase * 0.3) * 0.04 : 0;
  }

  return { root, animate, wave: (t = 1.4) => (wave = t), headY: 2.1 * L.height };
}
