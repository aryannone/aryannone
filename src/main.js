import './styles.css';
import { profile } from './content.js';
import { esc } from './ui/sections.js';
import { renderClassic } from './ui/Classic.js';

const app = document.getElementById('app');
document.title = `${profile.name} · Portfolio`;

const canPlay = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
})();

let game = null;
let cleanupClassic = null;

function setView(view) {
  const url = new URL(location.href);
  if (view) url.searchParams.set('view', view);
  else url.searchParams.delete('view');
  history.replaceState(null, '', url);
  document.body.dataset.view = view || 'start';
}

function showStart() {
  setView(null);
  app.innerHTML = `
    <div class="start">
      <div class="start-sky"><i class="cloud c1"></i><i class="cloud c2"></i><i class="cloud c3"></i><i class="sun"></i></div>
      <div class="start-card">
        <div class="start-badge">🎓</div>
        <p class="start-kicker">Welcome to</p>
        <h1>${esc(profile.name)}'s <span>Campus</span></h1>
        <p class="start-sub">${esc(profile.tagline)}</p>
        <div class="start-actions">
          <button class="btn btn-primary btn-big" data-go="play" ${canPlay ? '' : 'disabled'}>🎮 Explore the 3D campus</button>
          <button class="btn btn-big" data-go="classic">📄 Classic portfolio</button>
        </div>
        <p class="start-note muted small">${
          canPlay
            ? '🔊 Best with sound on · Works with keyboard or touch'
            : "Your browser can't run the 3D campus, but the classic portfolio has everything."
        }</p>
      </div>
    </div>`;
  app.querySelector('[data-go="play"]').addEventListener('click', play);
  app.querySelector('[data-go="classic"]').addEventListener('click', showClassic);
}

function showClassic() {
  if (game) (game.dispose(), (game = null));
  import('./game/Audio.js').then(({ audio }) => audio.ctx?.suspend());
  setView('classic');
  scrollTo(0, 0);
  cleanupClassic = renderClassic(app, { onPlay: play, canPlay });
}

async function play() {
  if (!canPlay) return;
  cleanupClassic && (cleanupClassic(), (cleanupClassic = null));
  setView('campus');
  app.innerHTML = `
    <div class="game-root"></div>
    <div class="loading">
      <div class="loading-card">
        <div class="loading-bike">🚲</div>
        <h2>Opening the campus gates…</h2>
        <div class="loading-bar"><span></span></div>
      </div>
    </div>`;
  const bar = app.querySelector('.loading-bar span');
  const setP = (p) => (bar.style.width = `${Math.round(p * 100)}%`);
  setP(0.1);

  // Audio must be started inside the click handler (browser rule)
  const { audio } = await import('./game/Audio.js');
  audio.init();
  setP(0.2);
  try {
    const { Game } = await import('./game/Game.js');
    await new Promise((r) => requestAnimationFrame(r));
    game = new Game(app.querySelector('.game-root'), { onExit: showClassic, onProgress: setP });
    if (import.meta.env.DEV) window.__game = game; // handy for debugging
    setP(1);
    const loading = app.querySelector('.loading');
    setTimeout(() => loading.classList.add('done'), 250);
    setTimeout(() => loading.remove(), 900);
  } catch (err) {
    console.error(err);
    showClassic();
  }
}

// ?view=classic opens the classic page directly (handy link for recruiters)
if (new URL(location.href).searchParams.get('view') === 'classic') showClassic();
else showStart();
