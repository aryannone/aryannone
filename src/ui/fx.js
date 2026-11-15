// =====================================================================
//  Motion toolkit for the classic page (no libraries).
//   - reveal-on-scroll with stagger         [data-reveal]
//   - scroll "scenes" that expose progress   addScene(el, fn)
//   - magnetic buttons                       [data-magnetic]
//   - cursor-following spotlight on cards    [data-spot]
//   - count-up numbers                       [data-count]
//   - a soft cursor follower (mouse only)
// Everything respects prefers-reduced-motion.
// =====================================================================
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function createFX(root) {
  const cleanups = [];
  const on = (t, ev, fn, opt) => {
    t.addEventListener(ev, fn, opt);
    cleanups.push(() => t.removeEventListener(ev, fn, opt));
  };
  const still = reduced();

  // ---------- reveal on scroll ----------
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        if (e.target.dataset.count != null) countUp(e.target);
        io.unobserve(e.target);
      }),
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );
  root.querySelectorAll('[data-reveal], [data-count]').forEach((el) => io.observe(el));
  cleanups.push(() => io.disconnect());

  function countUp(el) {
    const to = +el.dataset.count;
    if (still) return (el.textContent = to);
    const t0 = performance.now(), dur = 1400;
    const step = (now) => {
      const p = clamp((now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- scroll scenes ----------
  // fn(progress 0..1, rect) is called while the element is near the viewport
  const scenes = [];
  let velocity = 0, lastY = scrollY, ticking = false;
  const addScene = (el, fn) => scenes.push({ el, fn });
  const run = () => {
    ticking = false;
    const vh = innerHeight;
    for (const s of scenes) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
      const total = Math.max(1, r.height - vh);
      s.fn(clamp(-r.top / total), r);
    }
  };
  const request = () => {
    if (!ticking) (ticking = true), requestAnimationFrame(run);
  };
  on(window, 'scroll', request, { passive: true });
  on(window, 'resize', request);

  // scroll velocity -> CSS var (used to skew the marquee)
  let raf = 0;
  if (!still) {
    const loop = () => {
      const y = scrollY;
      velocity += ((y - lastY) - velocity) * 0.15;
      lastY = y;
      root.style.setProperty('--vel', clamp(velocity / 40, -1, 1).toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    cleanups.push(() => cancelAnimationFrame(raf));
  }

  if (fine() && !still) {
    // ---------- magnetic buttons ----------
    root.querySelectorAll('[data-magnetic]').forEach((el) => {
      const s = +(el.dataset.magnetic || 0.35);
      on(el, 'pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * s}px, ${y * s}px)`;
      });
      on(el, 'pointerleave', () => (el.style.transform = ''));
    });

    // ---------- spotlight + tilt cards ----------
    root.querySelectorAll('[data-spot]').forEach((el) => {
      const tilt = el.hasAttribute('data-tilt');
      on(el, 'pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--mx', `${x}px`);
        el.style.setProperty('--my', `${y}px`);
        if (tilt) el.style.transform = `perspective(900px) rotateX(${(0.5 - y / r.height) * 7}deg) rotateY(${(x / r.width - 0.5) * 7}deg) translateY(-4px)`;
      });
      on(el, 'pointerleave', () => tilt && (el.style.transform = ''));
    });

    // ---------- cursor follower ----------
    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.innerHTML = '<span class="cursor-ring"></span><span class="cursor-dot"></span>';
    root.appendChild(cur);
    const ring = cur.firstChild, dot = cur.lastChild;
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, craf = 0;
    on(window, 'pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      cur.classList.add('on');
      const t = e.target.closest?.('a, button, [data-spot], [data-cursor]');
      cur.classList.toggle('hover', !!t);
      cur.dataset.label = t?.dataset.cursor || '';
    });
    on(document, 'pointerleave', () => cur.classList.remove('on'));
    const follow = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      craf = requestAnimationFrame(follow);
    };
    craf = requestAnimationFrame(follow);
    cleanups.push(() => cancelAnimationFrame(craf), () => cur.remove());

    // ---------- hero spotlight ----------
    root.querySelectorAll('[data-spotlight]').forEach((el) =>
      on(el, 'pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--sx', `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty('--sy', `${((e.clientY - r.top) / r.height) * 100}%`);
      })
    );
  }

  return {
    addScene,
    refresh: request,
    on,
    dispose: () => cleanups.forEach((f) => f()),
  };
}
