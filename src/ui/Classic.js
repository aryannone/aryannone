// The classic, professional one-page portfolio (fast, no 3D needed).
import { SECTIONS, esc } from './sections.js';
import { profile } from '../content.js';

export function renderClassic(root, { onPlay, canPlay }) {
  const p = profile;
  root.innerHTML = `
    <div class="classic">
      <div class="scroll-progress" aria-hidden="true"></div>
      <header class="nav">
        <a class="brand" href="#top">${esc(p.name)}</a>
        <nav aria-label="Sections">
          ${SECTIONS.map((s) => `<a href="#${s.key}" data-nav="${s.key}">${esc(s.title)}</a>`).join('')}
        </nav>
        ${canPlay ? '<button class="btn btn-accent btn-small play-btn">🎮 3D Campus</button>' : ''}
      </header>

      <section class="hero" id="top">
        <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
        <div class="hero-inner">
          <p class="hero-hi reveal">👋 Hi, I'm</p>
          <h1 class="reveal" style="--i:1">${esc(p.name)}</h1>
          <p class="hero-role reveal" style="--i:2"><span class="typed"></span><span class="caret">|</span></p>
          <p class="hero-tag reveal" style="--i:3">${esc(p.tagline)}</p>
          <div class="row reveal" style="--i:4">
            <a class="btn btn-primary" href="#projects">See my work</a>
            <a class="btn" href="#contact">Get in touch</a>
            ${canPlay ? '<button class="btn btn-accent play-btn">🎮 Explore my 3D campus</button>' : ''}
          </div>
        </div>
        <a class="scroll-hint" href="#about" aria-label="Scroll down"><span></span></a>
      </section>

      <main>
        ${SECTIONS.map(
          (s, i) => `
          <section class="section ${i % 2 ? 'alt' : ''}" id="${s.key}">
            <div class="container">
              <h2 class="section-title reveal"><span aria-hidden="true">${s.icon}</span> ${esc(s.title)}</h2>
              ${s.render()}
            </div>
          </section>`
        ).join('')}
      </main>

      <footer class="footer">
        <p>© ${new Date().getFullYear()} ${esc(p.name)} · Built with Three.js & lots of ☕</p>
      </footer>
    </div>`;

  const page = root.querySelector('.classic');
  root.querySelectorAll('.play-btn').forEach((b) => b.addEventListener('click', onPlay));

  // reveal-on-scroll animations
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        e.target.querySelectorAll?.('.bar span').forEach((b) => b.classList.add('in'));
        io.unobserve(e.target);
      }),
    { threshold: 0.12 }
  );
  page.querySelectorAll('.reveal, .skill-group').forEach((el) => io.observe(el));

  // highlight the current section in the nav
  const links = page.querySelectorAll('[data-nav]');
  const navIO = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.dataset.nav === e.target.id));
      }),
    { rootMargin: '-45% 0px -50% 0px' }
  );
  page.querySelectorAll('main section').forEach((s) => navIO.observe(s));

  // scroll progress bar + nav shadow
  const bar = page.querySelector('.scroll-progress');
  const nav = page.querySelector('.nav');
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
    nav.classList.toggle('scrolled', h.scrollTop > 10);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // subtle 3D tilt on cards (desktop only)
  if (matchMedia('(hover: hover)').matches) {
    page.querySelectorAll('.card').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(700px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateY(-4px)`;
      });
      c.addEventListener('pointerleave', () => (c.style.transform = ''));
    });
  }

  // typewriter for the roles
  const typed = page.querySelector('.typed');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ri = 0, ci = 0, del = false, timer;
  const type = () => {
    const word = p.roles[ri % p.roles.length];
    if (reduce) return (typed.textContent = p.roles.join(' · '));
    ci += del ? -1 : 1;
    typed.textContent = word.slice(0, ci);
    let wait = del ? 45 : 90;
    if (!del && ci === word.length) (del = true), (wait = 1600);
    else if (del && ci === 0) (del = false), ri++, (wait = 300);
    timer = setTimeout(type, wait);
  };
  type();

  return () => {
    clearTimeout(timer);
    io.disconnect();
    navIO.disconnect();
    removeEventListener('scroll', onScroll);
  };
}
