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
  ['about', 'About'], ['story', 'Story'], ['projects', 'Work'], ['skills', 'Skills'], ['education', 'Education'],
  ['achievements', 'Wins'], ['contact', 'Contact'],
];
const ICON = {
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.4-2h5.8l1.4 2h1.2A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.6"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5Z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
};

const emoji = (e) => `<span aria-hidden="true">${e}</span>`;
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
  if (pr.image) return `<img class="art-img" src="${esc(pr.image)}" alt="Screenshot of ${esc(pr.title)}" width="1600" height="1000" loading="lazy" decoding="async">`;
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

function storyHTML() {
  const ch = C.story || [];
  if (!ch.length) return '';
  const n = ch.length;
  return `
    <section class="story" id="story" style="--n:${n}">
      <div class="story-sticky">
        <div class="container story-head">
          <h2 class="sec-kicker"><span>02</span>My story</h2>
          <p class="story-count" aria-hidden="true"><b>01</b> / ${String(n).padStart(2, '0')}</p>
        </div>
        <div class="container story-grid">
          ${ch
            .map(
              (c, i) => `
            <div class="chapter${i ? '' : ' on'}" style="--i:${i}">
              <div class="chapter-text">
                <span class="chapter-year">${esc(c.year)}</span>
                <h3>${esc(c.title)}</h3>
                <p>${esc(c.text)}</p>
              </div>
              <figure class="photo" style="--r:${[-3, 2.5, -2, 3, -2.5][i % 5]}deg">
                <div class="photo-frame">
                  ${
                    c.photo
                      ? `<img src="${esc(c.photo)}" alt="${esc(c.title)}" width="800" height="1000" loading="lazy" decoding="async">`
                      : `<div class="photo-ph" aria-hidden="true">
                           <span class="ph-year">${esc(c.year)}</span>
                           <span class="ph-icon">${ICON.camera}</span>
                           <b>Photo ${i + 1}</b>
                           <small>Add it in content.js → story</small>
                         </div>`
                  }
                </div>
                <figcaption><span>${esc(c.year)}</span>${esc(c.title)}</figcaption>
              </figure>
            </div>`
            )
            .join('')}
        </div>
        <div class="container"><div class="story-steps" aria-hidden="true">${ch.map(() => '<span><i></i></span>').join('')}</div></div>
      </div>
    </section>`;
}

// keep the browser bar colour in step with the page theme
function setThemeColor(color) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((m, i) => (i ? m.remove() : (m.removeAttribute('media'), (m.content = color))));
}

export function renderClassic(root, { onPlay, canPlay }) {
  const allSkills = C.skills.flatMap((g) => g.items);
  const gh = p.socials.find((s) => /github/i.test(s.label))?.url;
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
      <a class="skip" href="#main">Skip to content</a>

      <header class="nav">
        <a class="brand" href="#top" aria-label="${esc(p.name)}, back to top"><span class="brand-mark">${esc(initials(p.name))}</span><span class="brand-name">${esc(p.name)}</span></a>
        <nav class="nav-links" aria-label="Sections">
          ${NAV.map(([k, t]) => `<a href="#${k}" data-nav="${k}">${t}</a>`).join('')}
        </nav>
        <div class="nav-actions">
          <button class="icon-toggle motion-toggle" aria-label="Pause animations" aria-pressed="false">${ICON.pause}${ICON.play}</button>
          <button class="icon-toggle theme-toggle" aria-label="Dark mode" aria-pressed="${theme === 'dark'}">${ICON.sun}${ICON.moon}</button>
          ${canPlay ? '<button class="cta-small play-btn" aria-label="Explore the 3D campus" data-magnetic="0.25"><span aria-hidden="true">🎮</span> <span class="cta-label">3D Campus</span></button>' : ''}
          <button class="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="site-menu"><span></span><span></span></button>
        </div>
      </header>
      <div class="menu" id="site-menu" hidden>
        <nav aria-label="Menu">
          ${NAV.map(([k, t], i) => `<a href="#${k}" style="--i:${i}"><small>0${i + 1}</small>${t}</a>`).join('')}
        </nav>
        ${canPlay ? `<button class="cta-big play-btn">${emoji('🎮')} Explore the 3D campus</button>` : ''}
      </div>

      <!-- ============ HERO ============ -->
      <section class="hero" id="top">
        <div class="hero-sticky" data-spotlight>
          <div class="hero-bg" aria-hidden="true">
            <span class="aurora a1"></span><span class="aurora a2"></span><span class="aurora a3"></span>
            <span class="grid"></span><span class="spot"></span><span class="grain"></span>
          </div>
          <div class="hero-content">
            ${status ? `<p class="status"><span class="dot" aria-hidden="true"></span>${esc(status)}</p>` : ''}
            <p class="hero-hi">Hi, I’m</p>
            <h1 class="hero-name" aria-label="${esc(p.name)}">${splitChars(p.name)}</h1>
            <p class="hero-role">
              <span class="hero-role-pre">a</span>
              <span class="rotator">${p.roles.map((r, i) => `<span class="${i ? '' : 'on'}">${esc(r)}</span>`).join('')}</span>
            </p>
            <p class="hero-tag">${esc(p.tagline)}</p>
            <div class="hero-cta">
              <a class="cta-big primary" href="#projects" data-magnetic>See my work ${ICON.arrow}</a>
              <a class="cta-big" href="#contact" data-magnetic>Get in touch</a>
              ${canPlay ? `<button class="cta-big ghost play-btn" data-magnetic>${emoji('🎮')} Walk my 3D campus</button>` : ''}
            </div>
          </div>
          <a class="scroll-cue" href="#about" aria-label="Scroll down"><span>Scroll</span>${ICON.down}</a>
        </div>
      </section>

      ${marquee(p.roles.concat(C.skills[0]?.items.map((s) => s.name) || []), 'band')}

      <main id="main" tabindex="-1">
        <!-- ============ ABOUT ============ -->
        <section class="statement" id="about">
          <div class="statement-sticky">
            <h2 class="sec-kicker"><span>01</span>About me</h2>
            <p class="statement-text" style="--n:${statementWords.length}">${statementWords.join(' ')}</p>
          </div>
        </section>
        <section class="section about">
          <div class="container about-wrap">
            <div class="portrait" data-reveal data-spot>
              ${p.photoUrl ? `<img src="${esc(p.photoUrl)}" alt="Photo of ${esc(p.name)}" width="800" height="1000" decoding="async">` : `<span class="portrait-ph" aria-hidden="true">${esc(initials(p.name))}</span>`}
              <span class="portrait-badge">${emoji('📍')} ${esc(p.location)}</span>
            </div>
            <div class="about-copy">
              ${C.about.paragraphs.slice(1).map((t, i) => `<p class="lead" data-reveal style="--i:${i}">${esc(t)}</p>`).join('')}
              <dl class="facts">
                ${C.about.facts.map((f, i) => `<div data-reveal style="--i:${i + 1}"><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}
              </dl>
              <div class="stats">
                ${[[C.projects.length, 'Projects'], [allSkills.length, 'Skills'], [C.certificates.length, 'Certificates'], [C.achievements.length, 'Achievements']]
                  .map(([n, l], i) => `<div class="stat" data-reveal style="--i:${i}"><b data-count="${n}" aria-hidden="true">0</b><span aria-hidden="true">${l}</span><span class="sr-only">${n} ${l}</span></div>`)
                  .join('')}
              </div>
            </div>
          </div>
        </section>

        <!-- ============ MY STORY (pinned photo storyline) ============ -->
        ${storyHTML()}

        <!-- ============ PROJECTS (pinned horizontal gallery) ============ -->
        <section class="work" id="projects">
          <div class="work-sticky">
            <div class="container work-head">
              ${title('Selected work', 'Things I’ve <em>built</em>', '03')}
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
              <a class="work-card more" ${gh ? `href="${esc(gh)}" target="_blank" rel="noopener"` : 'href="#contact"'} data-reveal data-spot data-cursor="Open">
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
          <div class="container">${title('Toolbox', 'Skills & <em>tools</em>', '04')}</div>
          ${marquee(allSkills.map((s) => s.name), 'skills-marquee')}
          ${marquee(allSkills.map((s) => s.name).reverse(), 'skills-marquee reverse')}
          <div class="container skill-grid">
            ${C.skills
              .map(
                (g, gi) => `
              <div class="skill-card" data-reveal data-spot style="--i:${gi}">
                <h3>${esc(g.group)}</h3>
                <ul>${g.items
                  .map((s) => `<li><span>${esc(s.name)}</span><span class="lvl lvl-${level(s.level).toLowerCase()}">${level(s.level)}</span></li>`)
                  .join('')}</ul>
              </div>`
              )
              .join('')}
          </div>
        </section>

        <!-- ============ EDUCATION ============ -->
        <section class="section education" id="education">
          <div class="container">
            ${title('Journey', 'Education & <em>learning</em>', '05')}
            <div class="edu-grid">
              <div class="timeline-wrap">
              <span class="tl-line" aria-hidden="true"><span></span></span>
              <ol class="timeline">
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
              </div>
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
            ${title('Highlights', 'Wins & <em>milestones</em>', '06')}
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
            ${title('Off the clock', 'Hobbies & <em>fun facts</em>', '07')}
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
          ${marquee(['Let’s work together', 'Say hello', 'Let’s build something'], 'big')}
          <div class="container contact-inner">
            <p class="sec-kicker" data-reveal><span>08</span>Contact</p>
            <h2 class="contact-title" data-reveal>Got an idea? <em>Let’s talk.</em></h2>
            <p class="lead" data-reveal>${esc(C.contact.intro)}</p>
            <div class="contact-actions" data-reveal>
              <a class="cta-big primary xl" href="mailto:${esc(p.email)}" data-magnetic="0.3">${emoji('✉️')} ${esc(p.email)}</a>
              <button class="icon-toggle copy-btn" aria-label="Copy email address" data-cursor="Copy">${ICON.copy}</button>
              ${p.resumeUrl ? `<a class="cta-big" href="${esc(p.resumeUrl)}" download data-magnetic>${emoji('📄')} Résumé</a>` : ''}
            </div>
            <div class="socials" data-reveal>${p.socials.map((s) => linkBtn(s.url, s.label)).join('')}</div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <div class="container footer-inner">
          <span>© ${new Date().getFullYear()} ${esc(p.name)}</span>
          <span class="muted">Built with Three.js & lots of ${emoji('☕')}</span>
          <a href="#top" class="to-top">Back to top ↑</a>
        </div>
      </footer>
      <div class="copied" role="status" aria-live="polite"></div>
    </div>`;

  const page = root.querySelector('.classic');
  const cleanupFns = [];
  const fx = createFX(page);
  const still = reduced();
  page.querySelectorAll('.play-btn').forEach((b) => b.addEventListener('click', onPlay));

  // ---------- intro: name letters rise in ----------
  requestAnimationFrame(() => page.classList.add('ready'));

  // ---------- theme toggle ----------
  const themeBtn = page.querySelector('.theme-toggle');
  const applyTheme = () => {
    page.dataset.theme = theme;
    themeBtn.setAttribute('aria-pressed', theme === 'dark');
    setThemeColor(theme === 'dark' ? '#0a0a0a' : '#f5f4f1');
  };
  applyTheme();
  themeBtn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    try {
      localStorage.setItem('classic-theme', theme);
    } catch {}
  });

  // ---------- pause / play all looping motion ----------
  const motionBtn = page.querySelector('.motion-toggle');
  let motionPaused = false;
  try {
    motionPaused = localStorage.getItem('classic-motion') === 'paused';
  } catch {}
  const applyMotion = () => {
    page.classList.toggle('motion-paused', motionPaused);
    motionBtn.setAttribute('aria-pressed', motionPaused);
    motionBtn.setAttribute('aria-label', motionPaused ? 'Play animations' : 'Pause animations');
  };
  applyMotion();
  motionBtn.addEventListener('click', () => {
    motionPaused = !motionPaused;
    applyMotion();
    try {
      localStorage.setItem('classic-motion', motionPaused ? 'paused' : 'on');
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
  const menuItems = () => [...menu.querySelectorAll('a, button')];
  menuBtn.addEventListener('click', () => {
    const open = !page.classList.contains('menu-open');
    setMenu(open);
    if (open) requestAnimationFrame(() => menuItems()[0]?.focus());
  });
  menu.addEventListener('click', (e) => e.target.closest('a, button') && setMenu(false));
  // keyboard: Esc closes and returns focus; Tab cycles between the menu and its button
  fx.on(document, 'keydown', (e) => {
    if (!page.classList.contains('menu-open')) return;
    if (e.key === 'Escape') {
      setMenu(false);
      menuBtn.focus();
    } else if (e.key === 'Tab') {
      const items = [menuBtn, ...menuItems()];
      const i = items.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length;
      e.preventDefault();
      items[next].focus();
    }
  });

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
  // cycles through the roles twice, then settles; pauses while the hero is
  // hovered or focused, or when animations are paused
  let roleSteps = 0, heroHold = false;
  const heroEl = page.querySelector('.hero-content');
  fx.on(heroEl, 'pointerenter', () => (heroHold = true));
  fx.on(heroEl, 'pointerleave', () => (heroHold = false));
  fx.on(heroEl, 'focusin', () => (heroHold = true));
  fx.on(heroEl, 'focusout', () => (heroHold = false));
  const roleTimer = still || roles.length < 2 ? 0 : setInterval(() => {
    if (heroHold || motionPaused) return;
    if (++roleSteps > roles.length * 2) return clearInterval(roleTimer);
    roles[ri].classList.replace('on', 'out');
    const prev = roles[ri];
    setTimeout(() => prev.classList.remove('out'), 600);
    ri = (ri + 1) % roles.length;
    roles[ri].classList.add('on');
  }, 2400);

  // ---------- scroll scenes ----------
  const nav = page.querySelector('.nav');
  const bar = page.querySelector('.scroll-progress');
  // progress bar + nav background, batched with the other scroll scenes
  let navScrolled = null;
  fx.addScene(page, (t, r) => {
    bar.style.transform = `scaleX(${t.toFixed(4)})`;
    const s = r.top < -20;
    if (s !== navScrolled) nav.classList.toggle('scrolled', (navScrolled = s));
  });

  // hero recedes as you scroll past it
  const hero = page.querySelector('.hero');
  fx.addScene(hero, (t) => hero.style.setProperty('--hp', t.toFixed(4)));

  // about statement lights up word by word
  const statement = page.querySelector('.statement');
  fx.addScene(statement, (t) => statement.style.setProperty('--p', Math.min(1, t * 1.15).toFixed(4)));

  // my story: pinned photo storyline. Each chapter's photo is revealed
  // from below with a slow zoom, then pushed back into a tilted stack
  // as the next one arrives.
  const story = page.querySelector('.story');
  if (story) {
    const chs = [...story.querySelectorAll('.chapter')];
    const photos = chs.map((c) => c.querySelector('.photo'));
    const steps = [...story.querySelectorAll('.story-steps i')];
    const sCount = story.querySelector('.story-count b');
    const n = chs.length;
    let pinned = false, active = -1;
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const layoutStory = () => {
      pinned = !still && innerWidth >= 900;
      story.classList.toggle('pinned', pinned);
      story.style.height = pinned ? `${n * 85 + 60}vh` : '';
      if (!pinned) photos.forEach((ph) => ph.removeAttribute('style'));
    };
    layoutStory();
    fx.on(window, 'resize', layoutStory);
    fx.addScene(story, (t) => {
      if (!pinned) return;
      const f = 0.3 + t * (n - 0.8); // 0.3 .. n - 0.5 (last chapter gets a moment)
      photos.forEach((ph, i) => {
        const enter = i === 0 ? 1 : clamp((f - i) / 0.45 + 1);
        const depth = clamp(f - i - 0.55, 0, 3);
        const zoom = clamp((f - i + 0.4) / 1.6);
        ph.style.setProperty('--e', enter.toFixed(3));
        ph.style.setProperty('--d', depth.toFixed(3));
        ph.style.setProperty('--z', zoom.toFixed(3));
      });
      steps.forEach((s, i) => (s.style.transform = `scaleX(${clamp((f - i + 0.45) / 0.95).toFixed(3)})`));
      const a = Math.min(n - 1, Math.max(0, Math.floor(f + 0.2)));
      if (a !== active) {
        active = a;
        chs.forEach((c, i) => {
          c.classList.toggle('on', i === a);
          c.classList.toggle('past', i < a);
        });
        sCount.textContent = String(a + 1).padStart(2, '0');
      }
    });
    // phones / reduced motion: chapters simply reveal as they scroll in
    const sIO = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && !pinned && e.target.classList.add('in')),
      { threshold: 0.25 }
    );
    chs.forEach((c) => sIO.observe(c));
    cleanupFns.push(() => sIO.disconnect());
  }

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
  const tl = page.querySelector('.timeline-wrap');
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
    cleanupFns.forEach((f) => f());
    fx.dispose();
  };
}
