// Keyboard + on-screen joystick input, merged into one simple interface.
export class Input {
  constructor(root) {
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.handlers = {}; // action name -> callback
    this.enabled = true;

    this.onKeyDown = (e) => {
      if (e.target.closest && e.target.closest('input, textarea')) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      const map = { e: 'interact', enter: 'interact', f: 'bike', ' ': 'jump', q: 'wave', m: 'music', escape: 'escape', h: 'help', '?': 'help', v: 'cam', r: 'camreset' };
      if (map[k]) this.fire(map[k]);
    };
    this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this.onBlur = () => this.keys.clear();
    addEventListener('keydown', this.onKeyDown);
    addEventListener('keyup', this.onKeyUp);
    addEventListener('blur', this.onBlur);

    this.buildJoystick(root);
  }

  on(action, fn) {
    this.handlers[action] = fn;
  }

  fire(action) {
    const fn = this.handlers[action];
    const always = ['escape', 'music', 'sfx', 'help', 'exit'];
    if (fn && (this.enabled || always.includes(action))) fn();
  }

  // Returns {x, z, run}: x = right, z = down (screen space)
  get move() {
    if (!this.enabled) return { x: 0, z: 0, run: false };
    const k = this.keys;
    let x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    let z = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    let run = k.has('shift');
    if (this.stick.x || this.stick.y) {
      x = this.stick.x;
      z = this.stick.y;
      run = Math.hypot(x, z) > 0.92;
    }
    const len = Math.hypot(x, z);
    if (len > 1) (x /= len), (z /= len);
    return { x, z, run };
  }

  buildJoystick(root) {
    const base = document.createElement('div');
    base.className = 'joystick';
    base.innerHTML = '<div class="knob"></div>';
    root.appendChild(base);
    const knob = base.firstChild;
    let id = null, cx = 0, cy = 0;
    const R = 50;
    const move = (e) => {
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) (dx *= R / d), (dy *= R / d);
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.stick.x = dx / R;
      this.stick.y = dy / R;
    };
    base.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      base.setPointerCapture(id);
      const r = base.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      move(e);
    });
    base.addEventListener('pointermove', (e) => e.pointerId === id && move(e));
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = '';
      this.stick.x = this.stick.y = 0;
    };
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
  }

  dispose() {
    removeEventListener('keydown', this.onKeyDown);
    removeEventListener('keyup', this.onKeyUp);
    removeEventListener('blur', this.onBlur);
  }
}
