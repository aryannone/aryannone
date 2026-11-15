// A small north-up map in the corner of the screen.
import { ISLAND_R, ZONES } from './Campus.js';
import { SECTIONS } from '../ui/sections.js';

export class Minimap {
  constructor(parent, mapData) {
    this.size = 168;
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap';
    this.canvas.width = this.canvas.height = this.size * dpr;
    this.canvas.setAttribute('aria-label', 'Campus minimap');
    this.canvas.setAttribute('role', 'img');
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);
    this.scale = (this.size / 2 - 6) / ISLAND_R;
    this.base = this.drawBase(mapData, dpr);
    this.frame = 0;
  }

  w2m(x, z) {
    return [this.size / 2 + x * this.scale, this.size / 2 + z * this.scale];
  }

  drawBase(m, dpr) {
    const c = document.createElement('canvas');
    c.width = c.height = this.size * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const s = this.scale;
    g.fillStyle = '#86d35b';
    g.beginPath();
    g.arc(this.size / 2, this.size / 2, ISLAND_R * s, 0, Math.PI * 2);
    g.fill();
    g.lineCap = 'round';
    g.strokeStyle = '#f4dcab';
    for (const p of m.paths) {
      g.lineWidth = p.w * s;
      g.beginPath();
      g.moveTo(...this.w2m(p.x1, p.z1));
      g.lineTo(...this.w2m(p.x2, p.z2));
      g.stroke();
    }
    for (const c2 of m.circles) {
      g.fillStyle = c2.color;
      g.beginPath();
      g.arc(...this.w2m(c2.x, c2.z), c2.r * s, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(40,110,40,.55)';
    for (const t of m.trees) {
      g.beginPath();
      g.arc(...this.w2m(t.x, t.z), 1.4, 0, Math.PI * 2);
      g.fill();
    }
    for (const r of m.rects) {
      const [x, y] = this.w2m(r.minX, r.minZ);
      g.fillStyle = r.color;
      g.fillRect(x, y, (r.maxX - r.minX) * s, (r.maxZ - r.minZ) * s);
      if (!r.flat) {
        g.strokeStyle = 'rgba(43,45,66,.5)';
        g.lineWidth = 1;
        g.strokeRect(x, y, (r.maxX - r.minX) * s, (r.maxZ - r.minZ) * s);
      }
    }
    return c;
  }

  draw(player, npcs, visited, extras = []) {
    // ~30fps is plenty for a minimap
    if (this.frame++ % 2) return;
    const g = this.ctx;
    g.clearRect(0, 0, this.size, this.size);
    g.drawImage(this.base, 0, 0, this.size, this.size);

    g.font = '13px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const z of ZONES) {
      const [x, y] = this.w2m(z.x, z.z);
      const done = visited.has(z.key);
      g.fillStyle = done ? '#22c55e' : '#fffaf0';
      g.beginPath();
      g.arc(x, y, 8, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = done ? '#15803d' : z.color;
      g.lineWidth = 2;
      g.stroke();
      g.fillText(done ? '✓' : SECTIONS.find((s) => s.key === z.key).icon, x, y + 1);
    }

    g.fillStyle = '#2b2d42';
    for (const n of npcs.list) {
      g.beginPath();
      g.arc(...this.w2m(n.pos.x, n.pos.z), 2, 0, Math.PI * 2);
      g.fill();
    }

    // mini-game markers: pads, stars, next ring, the football
    for (const e of extras) {
      const [x, y] = this.w2m(e.x, e.z);
      if (e.kind === 'pad') {
        g.font = '11px sans-serif';
        g.fillText(e.icon, x, y);
        continue;
      }
      const pulse = 1 + Math.sin(performance.now() / 160) * 0.25;
      g.fillStyle = { star: '#ffc83d', ring: '#14b8c4', ball: '#ffffff' }[e.kind];
      g.strokeStyle = '#2b2d42';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x, y, e.kind === 'ball' ? 3 : 4 * pulse, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.fillStyle = '#2b2d42';

    if (!player.riding) {
      const [bx, by] = this.w2m(player.bike.pos.x, player.bike.pos.z);
      g.font = '12px sans-serif';
      g.fillText('🚲', bx, by);
    }

    // player arrow
    const [px, py] = this.w2m(player.pos.x, player.pos.z);
    g.save();
    g.translate(px, py);
    g.rotate(-player.heading + Math.PI);
    g.fillStyle = '#ff3b30';
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(5.5, 6);
    g.lineTo(0, 3);
    g.lineTo(-5.5, 6);
    g.closePath();
    g.stroke();
    g.fill();
    g.restore();
  }
}
