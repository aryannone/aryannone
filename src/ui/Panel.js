// The pop-up panel shown when you enter a building in 3D mode.
import { SECTIONS } from './sections.js';

export class Panel {
  constructor(root, { onClose }) {
    this.el = document.createElement('div');
    this.el.className = 'panel-wrap';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="panel-backdrop"></div>
      <section class="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title">
        <header class="panel-head">
          <div class="panel-icon" aria-hidden="true"></div>
          <div>
            <p class="panel-kicker"></p>
            <h2 id="panel-title"></h2>
          </div>
          <button class="icon-btn panel-close" aria-label="Close (Esc)">✕</button>
        </header>
        <div class="panel-body"></div>
        <footer class="panel-foot"><span class="muted small">Press <kbd>Esc</kbd> to keep exploring</span></footer>
      </section>`;
    root.appendChild(this.el);
    this.onClose = onClose;
    this.el.querySelector('.panel-close').addEventListener('click', () => this.close());
    this.el.querySelector('.panel-backdrop').addEventListener('click', () => this.close());
    this.el.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      // keep keyboard focus inside the dialog
      const f = [...this.el.querySelectorAll('a, button')].filter((x) => !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) (e.preventDefault(), f[f.length - 1].focus());
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) (e.preventDefault(), f[0].focus());
    });
  }

  get isOpen() {
    return !this.el.hidden;
  }

  open(key) {
    const s = SECTIONS.find((x) => x.key === key);
    if (!s) return;
    this.el.querySelector('.panel-icon').textContent = s.icon;
    this.el.querySelector('.panel-kicker').textContent = s.building;
    this.el.querySelector('#panel-title').textContent = s.title;
    const body = this.el.querySelector('.panel-body');
    body.innerHTML = s.render();
    body.scrollTop = 0;
    this.el.hidden = false;
    this.el.classList.remove('show');
    void this.el.offsetWidth; // restart the CSS animation
    this.el.classList.add('show');
    // stagger in the content
    body.querySelectorAll('.reveal').forEach((r, i) => setTimeout(() => r.classList.add('in'), 120 + i * 70));
    requestAnimationFrame(() => body.querySelectorAll('.bar span').forEach((b) => b.classList.add('in')));
    this.el.querySelector('.panel-close').focus();
  }

  close() {
    if (!this.isOpen) return;
    this.el.hidden = true;
    this.onClose && this.onClose();
  }
}
