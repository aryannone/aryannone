import * as THREE from 'three';

// One shared material per colour keeps draw-state changes (and memory) low.
const cache = new Map();

export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) {
    cache.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts })
    );
  }
  return cache.get(key);
}

// Helper: create a mesh that casts and receives shadows
export function mesh(geo, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
