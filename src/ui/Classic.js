// =====================================================================
//  The classic one-page portfolio (fast, no 3D needed).
//  Scroll-driven, cinematic motion: a hero that recedes as you scroll,
//  an "about" statement that lights up word by word, a pinned
//  horizontal gallery for projects, marquees, magnetic buttons, a
//  timeline that draws itself and more. All content comes from
//  content.js, same as the 3D campus.
// =====================================================================
import { esc } from './sections.js';
import * as C from '../content.js';
import { createFX, reduced } from './fx.js';

const p = C.profile;
const NAV = [
  ['about', 'About'], ['projects', 'Work'], ['skills', 'Skills'], ['education', 'Education'],
  ['achievements', 'Wins'], ['contact', 'Contact'],
];
const ICON = {
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
};

const level = (n) => (n >= 85 ? 'Expert' : n >= 70 ? 'Advanced' : n >= 55 ? 'Proficient' : 'Learning');
const initials = (name) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// "Your Name" -> words of letter spans that rise in one after another
function splitChars(text, start = 0) {
  let i = start;
  return text
    .split(' ')
    .map((w) => `<span class="word">${[...w].map((c) => `<span class="ch" style="--i:${i++}">${esc(c)}</span>`).join('')}</span>`)
    .join(' ');
}
const splitWords = (text) => text.split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`);
const title = (kicker, text, num) => `
  <header class="sec-head" data-reveal>
    <p class="sec-kicker"><span>${num}</span>${esc(kicker)}</p>
    <h2 class="sec-title"><span class="line"><span>${text}</span></span></h2>
  </header>`;
const linkBtn = (url, label) =>
  url ? `<a class="pill-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ${ICON.arrow}</a>` : '';

function projectArt(pr, i) {
  if (pr.image) return `<img class="art-img" src="${esc(pr.image)}" alt="Screenshot of ${esc(pr.title)}" loading="lazy">`;
  return `
    <div class="art" style="--h:${(i * 67 + 210) % 360}">
      <div class="art-window">
        <div class="art-bar"><i></i><i></i><i></i></div>
        <div class="art-body">
          <span class="art-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="art-blob b1"></span><span class="art-blob b2"></span>
          <div class="art-lines"><i></i><i></i><i></i></div>
        </div>
      </div>
    </div>`;
}

export function renderClassic(root, { onPlay, canPlay }) {
  const allSkills = C.skills.flatMap((g) => g.items);
  const statementWords = splitWords(C.about.paragraphs[0] || p.tagline);
  const status = p.status || C.about.facts.find((f) => /open/i.test(f.label))?.value;
  let theme = 'light';
  try {
    theme = localStorage.getItem('classic-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch {}

  const marquee = (items, cls = '') => {
    const row = items.map((x) => `<span>${esc(x)}</span><i aria-hidden="true">✦</i>`).join('');
    return `<div class="marquee ${cls}" aria-hidden="true"><div class="marquee-track">${row}${row}${row}</div></div>`;
  };

  root.innerHTML = `
    <div class="classic" data-theme="${theme}">
      <div class="scroll-progress" aria-hidden="true"></div>
      <a class="skip" href="#about">Skip to content</a>

      <header class="nav">
        <a class="brand" href="#top" aria-label="${esc(p.name)}, back to top"><span class="brand-mark">${esc(initials(p.name))}</span><span class="brand-name">${esc(p.name)}</span></a>
        <nav class="nav-links" aria-label="Sections">
          ${NAV.map(([k, t]) => `<a href="#${k}" data-nav="${k}">${t}</a>`).join('')}
        </nav>
        <div class="nav-actions">
          <button class="icon-toggle theme-toggle" aria-label="Toggle dark mode">${ICON.sun}${ICON.moon}</button>
          ${canPlay ? '<button class="cta-small play-btn" data-magnetic="0.25">🎮 <span>3D Campus</span></button>' : ''}
          <button class="menu-btn" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
        </div>
      </header>
      <div class="menu" hidden>
        <nav aria-label="Menu">
          ${NAV.map(([k, t], i) => `<a href="#${k}" style="--i:${i}"><small>0${i + 1}</small>${t}</a>`).join('')}
        </nav>
        ${canPlay ? '<button class="cta-big play-btn">🎮 Explore the 3D campus</button>' : ''}
      </div>

      <!-- ============ HERO ============ -->
      <section class="hero" id="top">
        <div class="hero-sticky" data-spotlight>
          <div class="hero-bg" aria-hidden="true">
            <span class="aurora a1"></span><span class="aurora a2"></span><span class="aurora a3"></span>
            <span class="grid"></span><span class="spot"></span><span class="grain"></span>
          </div>
          <div class="hero-content">
            ${status ? `<p class="status"><span class="dot"></span>${esc(status)}</p>` : ''}
            <p class="hero-hi">Hi, I'm</p>
            <h1 class="hero-name" aria-label="${esc(p.name)}">${splitChars(p.name)}</h1>
            <p class="hero-role">
              <span class="hero-role-pre">a</span>
              <span class="rotator" aria-live="polite">${p.roles.map((r, i) => `<span class="${i ? '' : 'on'}">${esc(r)}</span>`).join('')}</span>
            </p>
            <p class="hero-tag">${esc(p.tagline)}</p>
            <div class="hero-cta">
              <a class="cta-big primary" href="#projects" data-magnetic>See my work ${ICON.arrow}</a>
              <a class="cta-big" href="#contact" data-magnetic>Get in touch</a>
              ${canPlay ? '<button class="cta-big ghost play-btn" data-magnetic>🎮 Walk my 3D campus</button>' : ''}
            </div>
          </div>
          <a class="scroll-cue" href="#about" aria-label="Scroll down"><span>Scroll</span>${ICON.down}</a>
        </div>
      </section>

      ${marquee(p.roles.concat(C.skills[0]?.items.map((s) => s.name) || []), 'band')}

      <main>
        <!-- ============ ABOUT ============ -->
        <section class="statement" id="about">
          <div class="statement-sticky">
            <p class="sec-kicker"><span>01</span>About me</p>
            <p class="statement-text" style="--n:${statementWords.length}">${statementWords.join(' ')}</p>
          </div>
        </section>
        <section class="section about">
          <div class="container about-wrap">
            <div class="portrait" data-reveal data-spot>
              ${p.photoUrl ? `<img src="${esc(p.photoUrl)}" alt="Photo of ${esc(p.name)}">` : `<span class="portrait-ph" aria-hidden="true">${esc(initials(p.name))}</span>`}
              <span class="portrait-badge">📍 ${esc(p.location)}</span>
            </div>
            <div class="about-copy">
              ${C.about.paragraphs.slice(1).map((t, i) => `<p class="lead" data-reveal style="--i:${i}">${esc(t)}</p>`).join('')}
              <dl class="facts">
                ${C.about.facts.map((f, i) => `<div data-reveal style="--i:${i + 1}"><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}
              </dl>
              <div class="stats">
                ${[[C.projects.length, 'Projects'], [allSkills.length, 'Skills'], [C.certificates.length, 'Certificates'], [C.achievements.length, 'Achievements']]
                  .map(([n, l], i) => `<div class="stat" data-reveal style="--i:${i}"><b data-count="${n}">0</b><span>${l}</span></div>`)
                  .join('')}
              </div>
            </div>
          </div>
        </section>

        <!-- ============ PROJECTS (pinned horizontal gallery) ============ -->
        <section class="work" id="projects">
          <div class="work-sticky">
            <div class="container work-head">
              ${title('Selected work', 'Things I’ve <em>built</em>', '02')}
              <p class="work-count" aria-hidden="true"><b>01</b> / ${String(C.projects.length).padStart(2, '0')}</p>
            </div>
            <div class="work-track">
              ${C.projects
                .map(
                  (pr, i) => `
                <article class="work-card" data-reveal data-spot data-tilt style="--i:${i}">
                  ${projectArt(pr, i)}
                  <div class="work-info">
                    <div class="tags">${pr.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
                    <h3>${esc(pr.title)}</h3>
                    <p>${esc(pr.description)}</p>
                    <div class="links">${linkBtn(pr.link, 'Live demo')}${linkBtn(pr.repo, 'Code')}</div>
                  </div>
                </article>`
                )
                .join('')}
              <a class="work-card more" href="${esc(p.socials.find((s) => /github/i.test(s.label))?.url || '#contact')}" target="_blank" rel="noopener" data-reveal data-spot data-cursor="Open">
                <span class="more-arrow">${ICON.arrow}</span>
                <h3>More on GitHub</h3>
                <p>Experiments, coursework and side projects.</p>
              </a>
            </div>
            <div class="container"><div class="work-progress" aria-hidden="true"><span></span></div></div>
          </div>
        </section>

        <!-- ============ SKILLS ============ -->
        <section class="section skills" id="skills">
          <div class="container">${title('Toolbox', 'Skills & <em>tools</em>', '03')}</div>
          ${marquee(allSkills.map((s) => s.name), 'skills-marquee')}
          ${marquee(allSkills.map((s) => s.name).reverse(), 'skills-marquee reverse')}
          <div class="container skill-grid">
            ${C.skills
              .map(
                (g, gi) => `
              <div class="skill-card" data-reveal data-spot style="--i:${gi}">
                <h3>${esc(g.group)}</h3>
                <ul>${g.items
                  .map((s) => `<li><span>${esc(s.name)}</span><em class="lvl lvl-${level(s.level).toLowerCase()}">${level(s.level)}</em></li>`)
                  .join('')}</ul>
              </div>`
              )
              .join('')}
          </div>
        </section>

        <!-- ============ EDUCATION ============ -->
        <section class="section education" id="education">
          <div class="container">
            ${title('Journey', 'Education & <em>learning</em>', '04')}
            <div class="edu-grid">
              <ol class="timeline">
                <span class="tl-line" aria-hidden="true"><span></span></span>
                ${C.education
                  .map(
                    (e, i) => `
                  <li data-reveal style="--i:${i}">
                    <span class="when">${esc(e.years)}</span>
                    <h3>${esc(e.school)}</h3>
                    <p class="muted">${esc(e.degree)}</p>
                    <p>${esc(e.detail)}</p>
                  </li>`
                  )
                  .join('')}
              </ol>
              <div class="certs">
                <h3 data-reveal>Certificates</h3>
                ${C.certificates
                  .map(
                    (c, i) => `
                  <${c.link ? `a href="${esc(c.link)}" target="_blank" rel="noopener"` : 'div'} class="cert" data-reveal data-spot style="--i:${i}">
                    <span class="cert-icon" aria-hidden="true">🎓</span>
                    <span><b>${esc(c.name)}</b><small>${esc(c.issuer)} · ${esc(c.year)}</small></span>
                    ${c.link ? ICON.arrow : ''}
                  </${c.link ? 'a' : 'div'}>`
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </section>

        <!-- ============ ACHIEVEMENTS ============ -->
        <section class="section wins" id="achievements">
          <div class="container">
            ${title('Highlights', 'Wins & <em>milestones</em>', '05')}
            <div class="wins-grid">
              ${C.achievements
                .map(
                  (a, i) => `
                <article class="win" data-reveal data-spot data-tilt style="--i:${i}">
                  <span class="win-icon" aria-hidden="true">${a.icon}</span>
                  <h3>${esc(a.title)}</h3>
                  <p>${esc(a.detail)}</p>
                </article>`
                )
                .join('')}
            </div>
          </div>
        </section>

        <!-- ============ HOBBIES ============ -->
        <section class="section hobbies-sec" id="hobbies">
          <div class="container">
            ${title('Off the clock', 'Hobbies & <em>fun facts</em>', '06')}
            <p class="lead" data-reveal>${esc(C.hobbies.intro)}</p>
            <div class="hobby-cloud">
              ${C.hobbies.items.map((h, i) => `<span class="hobby-chip" data-reveal style="--i:${i}"><span aria-hidden="true">${h.icon}</span>${esc(h.name)}</span>`).join('')}
            </div>
            <ul class="fun-facts">
              ${C.hobbies.funFacts.map((f, i) => `<li data-reveal style="--i:${i}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(f)}</li>`).join('')}
            </ul>
          </div>
        </section>

        <!-- ============ CONTACT ============ -->
        <section class="contact" id="contact">
          ${marquee(["Let's work together", 'Say hello', "Let's build something"], 'big')}
          <div class="container contact-inner">
            <p class="sec-kicker" data-reveal><span>07</span>Contact</p>
            <h2 class="contact-title" data-reveal>Got an idea? <em>Let’s talk.</em></h2>
            <p class="lead" data-reveal>${esc(C.contact.intro)}</p>
            <div class="contact-actions" data-reveal>
              <a class="cta-big primary xl" href="mailto:${esc(p.email)}" data-magnetic="0.3">✉️ ${esc(p.email)}</a>
              <button class="icon-toggle copy-btn" aria-label="Copy email address" data-cursor="Copy">${ICON.copy}</button>
              ${p.resumeUrl ? `<a class="cta-big" href="${esc(p.resumeUrl)}" download data-magnetic>📄 Résumé</a>` : ''}
            </div>
            <div class="socials" data-reveal>${p.socials.map((s) => linkBtn(s.url, s.label)).join('')}</div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <div class="container footer-inner">
          <span>© ${new Date().getFullYear()} ${esc(p.name)}</span>
          <span class="muted">Built with Three.js & lots of ☕</span>
          <a href="#top" class="to-top">Back to top ↑</a>
        </div>
      </footer>
      <div class="copied" role="status" aria-live="polite"></div>
    </div>`;

  const page = root.querySelector('.classic');
  const fx = createFX(page);
  const still = reduced();
  page.querySelectorAll('.play-btn').forEach((b) => b.addEventListener('click', onPlay));

  // ---------- intro: name letters rise in ----------
  requestAnimationFrame(() => page.classList.add('ready'));

  // ---------- theme toggle ----------
  page.querySelector('.theme-toggle').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    page.dataset.theme = theme;
    try {
      localStorage.setItem('classic-theme', theme);
    } catch {}
  });

  // ---------- mobile menu ----------
  const menu = page.querySelector('.menu'), menuBtn = page.querySelector('.menu-btn');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    page.classList.toggle('menu-open', open);
    if (open) menu.hidden = false;
    else setTimeout(() => !page.classList.contains('menu-open') && (menu.hidden = true), 400);
  };
  menuBtn.addEventListener('click', () => setMenu(!page.classList.contains('menu-open')));
  menu.addEventListener('click', (e) => e.target.closest('a, button') && setMenu(false));

  // ---------- copy email ----------
  const copied = page.querySelector('.copied');
  page.querySelector('.copy-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(p.email);
      copied.textContent = '✓ Email copied';
    } catch {
      copied.textContent = p.email;
    }
    copied.classList.add('show');
    setTimeout(() => copied.classList.remove('show'), 1800);
  });

  // ---------- rotating roles ----------
  const roles = [...page.querySelectorAll('.rotator span')];
  let ri = 0;
  const roleTimer = still ? 0 : setInterval(() => {
    roles[ri].classList.replace('on', 'out');
    const prev = roles[ri];
    setTimeout(() => prev.classList.remove('out'), 600);
    ri = (ri + 1) % roles.length;
    roles[ri].classList.add('on');
  }, 2400);

  // ---------- scroll scenes ----------
  const nav = page.querySelector('.nav');
  const bar = page.querySelector('.scroll-progress');
  fx.on(window, 'scroll', () => {
    const h = document.documentElement;
    bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
    nav.classList.toggle('scrolled', h.scrollTop > 20);
  }, { passive: true });

  // hero recedes as you scroll past it
  const hero = page.querySelector('.hero');
  fx.addScene(hero, (t) => hero.style.setProperty('--hp', t.toFixed(4)));

  // about statement lights up word by word
  const statement = page.querySelector('.statement');
  fx.addScene(statement, (t) => statement.style.setProperty('--p', Math.min(1, t * 1.15).toFixed(4)));

  // projects: vertical scroll -> horizontal movement (wide screens only)
  const work = page.querySelector('.work');
  const track = work.querySelector('.work-track');
  const count = work.querySelector('.work-count b');
  const cards = [...track.querySelectorAll('.work-card')];
  const prog = work.querySelector('.work-progress span');
  let horizontal = false;
  const layoutWork = () => {
    horizontal = !still && innerWidth >= 900;
    work.classList.toggle('horizontal', horizontal);
    if (horizontal) {
      const dist = Math.max(0, track.scrollWidth - innerWidth);
      work.style.height = `${innerHeight + dist}px`;
      work.dataset.dist = dist;
    } else {
      work.style.height = '';
      track.style.transform = '';
    }
    fx.refresh();
  };
  fx.addScene(work, (t) => {
    if (!horizontal) return;
    track.style.transform = `translate3d(${-t * +work.dataset.dist}px,0,0)`;
    prog.style.transform = `scaleX(${t})`;
    const idx = Math.min(C.projects.length, Math.round(t * (cards.length - 1)) + 1);
    count.textContent = String(Math.min(idx, C.projects.length)).padStart(2, '0');
  });
  layoutWork();
  fx.on(window, 'resize', layoutWork);
  document.fonts?.ready.then(layoutWork);

  // timeline line draws itself
  const tl = page.querySelector('.timeline');
  fx.addScene(tl, (t, r) => {
    const v = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / r.height));
    tl.style.setProperty('--tp', v.toFixed(4));
  });

  // highlight the current section in the nav
  const links = page.querySelectorAll('[data-nav]');
  const navIO = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.id === 'hobbies' ? 'achievements' : e.target.id;
        links.forEach((l) => l.classList.toggle('active', l.dataset.nav === id));
      }),
    { rootMargin: '-45% 0px -50% 0px' }
  );
  page.querySelectorAll('main section[id]').forEach((s) => navIO.observe(s));
  fx.refresh();

  return () => {
    clearInterval(roleTimer);
    navIO.disconnect();
    fx.dispose();
  };
}
