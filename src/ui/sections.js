// Turns the data in content.js into HTML. Used by both the 3D panels
// and the classic page, so content only ever lives in one place.
import * as C from '../content.js';

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const link = (url, label, cls = 'chip-link') =>
  url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>` : '';

export function aboutHTML() {
  const a = C.about;
  const photo = C.profile.photoUrl
    ? `<img class="avatar-photo" src="${esc(C.profile.photoUrl)}" alt="Photo of ${esc(C.profile.name)}">`
    : `<div class="avatar-photo placeholder" aria-hidden="true">${esc(C.profile.name.charAt(0))}</div>`;
  return `
    <div class="about-grid">
      ${photo}
      <div>
        ${a.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
        <dl class="facts">
          ${a.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}
        </dl>
      </div>
    </div>`;
}

export function projectsHTML() {
  return `<div class="cards">${C.projects
    .map(
      (p, i) => `
      <article class="card reveal" style="--i:${i}">
        <div class="card-num">${String(i + 1).padStart(2, '0')}</div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
        <div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="row">${link(p.link, 'Live demo')}${link(p.repo, 'Code')}</div>
      </article>`
    )
    .join('')}</div>`;
}

export function educationHTML() {
  return `
    <ol class="timeline">${C.education
      .map(
        (e, i) => `
        <li class="reveal" style="--i:${i}">
          <span class="when">${esc(e.years)}</span>
          <h3>${esc(e.school)}</h3>
          <p class="muted">${esc(e.degree)}</p>
          <p>${esc(e.detail)}</p>
        </li>`
      )
      .join('')}</ol>
    <h3 class="sub">Certificates</h3>
    <ul class="cert-list">${C.certificates
      .map(
        (c) => `<li class="reveal"><strong>${esc(c.name)}</strong> <span class="muted">· ${esc(c.issuer)} · ${esc(c.year)}</span> ${link(c.link, 'View')}</li>`
      )
      .join('')}</ul>`;
}

export function skillsHTML() {
  return `<div class="skill-groups">${C.skills
    .map(
      (g) => `
      <div class="skill-group reveal">
        <h3>${esc(g.group)}</h3>
        ${g.items
          .map(
            (s) => `
          <div class="skill">
            <div class="skill-top"><span>${esc(s.name)}</span><span class="muted">${s.level}%</span></div>
            <div class="bar" role="progressbar" aria-label="${esc(s.name)}" aria-valuenow="${s.level}" aria-valuemin="0" aria-valuemax="100"><span style="--w:${s.level}%"></span></div>
          </div>`
          )
          .join('')}
      </div>`
    )
    .join('')}</div>`;
}

export function achievementsHTML() {
  return `<div class="cards trophies">${C.achievements
    .map(
      (a, i) => `
      <article class="card trophy reveal" style="--i:${i}">
        <div class="trophy-icon" aria-hidden="true">${a.icon}</div>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.detail)}</p>
      </article>`
    )
    .join('')}</div>`;
}

export function hobbiesHTML() {
  const h = C.hobbies;
  return `
    <p>${esc(h.intro)}</p>
    <div class="hobbies">${h.items
      .map((x, i) => `<div class="hobby reveal" style="--i:${i}"><span aria-hidden="true">${x.icon}</span>${esc(x.name)}</div>`)
      .join('')}</div>
    <h3 class="sub">Fun facts</h3>
    <ul class="facts-list">${h.funFacts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`;
}

export function contactHTML() {
  const p = C.profile;
  return `
    <p>${esc(C.contact.intro)}</p>
    <div class="row contact-row">
      <a class="btn btn-primary" href="mailto:${esc(p.email)}">✉️ ${esc(p.email)}</a>
      ${p.resumeUrl ? `<a class="btn" href="${esc(p.resumeUrl)}" download>📄 Download résumé</a>` : `<span class="btn btn-off" title="Add resumeUrl in content.js">📄 Résumé (coming soon)</span>`}
    </div>
    <div class="row">${p.socials.map((s) => link(s.url, s.label)).join('')}</div>`;
}

// Section registry: key -> title, building name in 3D, renderer
export const SECTIONS = [
  { key: 'about', title: 'About Me', building: 'Admin Block', icon: '🏛️', render: aboutHTML },
  { key: 'projects', title: 'Projects', building: 'Computer Lab', icon: '💻', render: projectsHTML },
  { key: 'education', title: 'Education', building: 'Library', icon: '📚', render: educationHTML },
  { key: 'skills', title: 'Skills', building: 'Tech Workshop', icon: '🔧', render: skillsHTML },
  { key: 'achievements', title: 'Achievements', building: 'Sports Ground', icon: '🏆', render: achievementsHTML },
  { key: 'hobbies', title: 'Hobbies & Fun', building: 'Canteen', icon: '☕', render: hobbiesHTML },
  { key: 'contact', title: 'Contact', building: 'Notice Board', icon: '📮', render: contactHTML },
];
