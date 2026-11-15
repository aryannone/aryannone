// =====================================================================
//  Game: sets up the 3D scene, camera, lights and HUD, and runs the loop.
// =====================================================================
import * as THREE from 'three';
import { buildCampus, ZONES, SPAWN, BIKE_SPAWN } from './Campus.js';
import { Player } from './Player.js';
import { NPCs } from './NPCs.js';
import { Minimap } from './Minimap.js';
import { Input } from './Input.js';
import { CameraRig } from './CameraRig.js';
import { MiniGames } from './MiniGames.js';
import { audio } from './Audio.js';
import { Panel } from '../ui/Panel.js';
import { SECTIONS } from '../ui/sections.js';
import { avatar, profile } from '../content.js';

const ZONE_R = 3;
const isTouch = matchMedia('(pointer: coarse)').matches;

function skyDome() {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color('#5d9cf5') },
      mid: { value: new THREE.Color('#ffc59b') },
      bot: { value: new THREE.Color('#ffe7cc') },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(smoothstep(0.0, 0.7, h), 0.8)) : mix(mid, bot, smoothstep(0.0, -0.5, h));
      gl_FragColor = vec4(c, 1.0); }`,
  });
  return new THREE.Mesh(geo, m);
}

export class Game {
  constructor(root, { onExit, onProgress }) {
    this.root = root;
    this.onExit = onExit;
    this.visited = new Set();
    try {
      JSON.parse(localStorage.getItem('campus-visited') || '[]').forEach((k) => this.visited.add(k));
    } catch {}

    // ---------- renderer ----------
    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = 'game-canvas';
    root.appendChild(renderer.domElement);

    const scene = (this.scene = new THREE.Scene());
    scene.fog = new THREE.Fog('#ffd2ad', 90, 230);
    scene.add(skyDome());

    // ---------- golden-hour lighting ----------
    scene.add(new THREE.HemisphereLight('#ffe9d2', '#6aa84f', 1.5));
    const sun = (this.sun = new THREE.DirectionalLight('#ffd6a5', 2.6));
    sun.castShadow = true;
    sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -46;
    sc.right = sc.top = 46;
    sc.near = 1;
    sc.far = 160;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
    this.sunOffset = new THREE.Vector3(-34, 48, 26);
    scene.add(sun, sun.target);
    // a big sun disc in the sky
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: '#fff3d6', fog: false }));
    sunDisc.position.copy(this.sunOffset).normalize().multiplyScalar(330);
    sunDisc.lookAt(0, 0, 0);
    scene.add(sunDisc);

    // ---------- world ----------
    onProgress && onProgress(0.4);
    this.campus = buildCampus(scene);
    ZONES.forEach((z) => this.visited.has(z.key) && this.campus.markVisited(z.key));
    onProgress && onProgress(0.7);
    this.player = new Player(scene, avatar, SPAWN, BIKE_SPAWN);
    this.npcs = new NPCs(scene, isTouch ? 7 : 11);
    onProgress && onProgress(0.9);

    // ---------- camera (third-person, low behind the player) ----------
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
    this.rig = new CameraRig(this.camera, renderer.domElement, { portrait: innerWidth / innerHeight < 0.8 });

    this.buildHUD();
    this.input = new Input(this.hud);
    this.games = new MiniGames(scene, {
      hud: this.hud,
      trees: this.campus.map.trees,
      toast: (h, ms) => this.toast(h, ms),
      confetti: (n) => this.confetti(n),
    });
    this.bindActions();

    this.clock = new THREE.Clock();
    this.onResize = () => {
      renderer.setSize(innerWidth, innerHeight);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.rig.distMul = innerWidth / innerHeight < 0.8 ? 1.25 : 1;
    };
    addEventListener('resize', this.onResize);
    this.onVis = () => document.hidden ? audio.ctx?.suspend() : audio.ctx?.resume();
    document.addEventListener('visibilitychange', this.onVis);

    this.running = true;
    renderer.setAnimationLoop(() => this.tick());
  }

  // ---------------------------------------------------------------
  buildHUD() {
    const hud = (this.hud = document.createElement('div'));
    hud.className = 'hud';
    hud.innerHTML = `
      <div class="hud-top-left">
        <div class="hud-card">
          <div class="hud-name">🎓 ${profile.name}'s Campus</div>
          <div class="progress-label"><span>Campus explored</span><b class="progress-count"></b></div>
          <div class="progress"><span></span></div>
          <div class="progress-icons">${SECTIONS.map((s) => `<span data-k="${s.key}" title="${s.building}: ${s.title}">${s.icon}</span>`).join('')}</div>
        </div>
      </div>
      <div class="hud-top-right">
        <div class="hud-buttons">
          <button class="icon-btn" data-act="music" aria-label="Toggle music" title="Music (M)"></button>
          <button class="icon-btn" data-act="sfx" aria-label="Toggle sound effects" title="Sound effects"></button>
          <button class="icon-btn" data-act="cam" aria-label="Change camera distance" title="Camera distance (V)">🎥</button>
          <button class="icon-btn" data-act="help" aria-label="Controls" title="Controls (H)">❓</button>
          <button class="btn btn-small" data-act="exit" title="Switch to the classic page">📄 Classic view</button>
        </div>
      </div>
      <div class="prompt" aria-live="polite"></div>
      <div class="toast" aria-live="polite"></div>
      <div class="touch-buttons">
        <button class="touch-btn" data-act="jump" aria-label="Jump">⤒</button>
        <button class="touch-btn" data-act="bike" aria-label="Bicycle">🚲</button>
        <button class="touch-btn big" data-act="interact" aria-label="Enter building">E</button>
      </div>
      <div class="help" hidden>
        <div class="help-card">
          <h2>How to explore</h2>
          <ul>
            <li><span>${isTouch ? 'Joystick' : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows'}</span> Walk around</li>
            ${isTouch ? '' : '<li><span><kbd>Shift</kbd></span> Run</li>'}
            <li><span>${isTouch ? '<b>E</b> button' : '<kbd>E</kbd>'}</span> Enter a building (stand on the glowing ring)</li>
            <li><span>${isTouch ? '🚲 button' : '<kbd>F</kbd>'}</span> Hop on / off the bicycle</li>
            <li><span>${isTouch ? '⤒ button' : '<kbd>Space</kbd>'}</span> Jump</li>
            ${isTouch ? '' : '<li><span><kbd>Q</kbd></span> Wave hello 👋</li>'}
            <li><span>${isTouch ? 'Drag the screen' : 'Drag the mouse'}</span> Look around</li>
            <li><span>${isTouch ? 'Pinch' : 'Mouse wheel'}</span> Zoom in / out</li>
            <li><span>${isTouch ? '🎥 button' : '<kbd>V</kbd> · <kbd>R</kbd>'}</span> ${isTouch ? 'Camera distance' : 'Camera distance · reset'}</li>
          </ul>
          <p class="muted small">Visit all 7 places to complete the campus tour! Then try the mini-games: ⭐ Star Rush, 🏁 Ring Race and ⚽ football on the sports ground.</p>
          <button class="btn btn-primary" data-act="help-close">Let's go!</button>
        </div>
      </div>`;
    this.root.appendChild(hud);
    if (isTouch) hud.classList.add('touch');
    this.minimap = new Minimap(hud.querySelector('.hud-top-right'), this.campus.map);
    this.promptEl = hud.querySelector('.prompt');
    this.toastEl = hud.querySelector('.toast');
    this.helpEl = hud.querySelector('.help');
    this.panel = new Panel(this.root, {
      onClose: () => {
        audio.sfx('close');
        audio.setMuffled(false);
        this.input.enabled = this.rig.enabled = true;
        this.checkComplete();
      },
    });
    hud.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) this.input.fire(b.dataset.act === 'help-close' ? 'help' : b.dataset.act);
    });
    this.updateAudioButtons();
    this.updateProgress();
  }

  bindActions() {
    const i = this.input;
    i.on('interact', () => {
      if (this.activeZone) this.enter(this.activeZone.key);
      else if (this.activePad) this.games.start(this.activePad.key, this.player);
      else if (this.player.nearBike() || this.player.riding) i.fire('bike');
    });
    i.on('bike', () => {
      if (this.player.toggleBike()) audio.sfx(this.player.riding ? 'bell' : 'click');
    });
    i.on('jump', () => this.player.jump() && audio.sfx('jump'));
    i.on('wave', () => this.player.char.wave());
    i.on('cam', () => this.toast(`🎥 Camera: <b>${this.rig.cyclePreset()}</b>`, 1200));
    i.on('camreset', () => this.rig.reset(this.player.heading));
    i.on('music', () => {
      audio.setMusic(!audio.musicOn);
      this.updateAudioButtons();
    });
    i.on('sfx', () => {
      audio.setSfx(!audio.sfxOn);
      this.updateAudioButtons();
    });
    i.on('help', () => {
      if (this.panel.isOpen) return;
      this.helpEl.hidden = !this.helpEl.hidden;
      this.input.enabled = this.rig.enabled = this.helpEl.hidden;
      if (!this.helpEl.hidden) this.helpEl.querySelector('button').focus();
    });
    i.on('escape', () => {
      if (this.panel.isOpen) this.panel.close();
      else if (!this.helpEl.hidden) i.fire('help');
      else if (this.games.active) this.games.quit();
    });
    i.on('exit', () => this.onExit && this.onExit());
    // show the controls the first time
    try {
      if (!localStorage.getItem('campus-help-seen')) {
        localStorage.setItem('campus-help-seen', '1');
        setTimeout(() => i.fire('help'), 2200);
      }
    } catch {}
  }

  updateAudioButtons() {
    const q = (a) => this.hud.querySelector(`[data-act="${a}"]`);
    q('music').textContent = audio.musicOn ? '🎵' : '🔇';
    q('music').setAttribute('aria-pressed', audio.musicOn);
    q('sfx').textContent = audio.sfxOn ? '🔊' : '🔈';
    q('sfx').setAttribute('aria-pressed', audio.sfxOn);
  }

  updateProgress() {
    const n = this.visited.size, total = SECTIONS.length;
    this.hud.querySelector('.progress-count').textContent = `${n}/${total}`;
    this.hud.querySelector('.progress span').style.width = `${(n / total) * 100}%`;
    this.hud.querySelectorAll('.progress-icons span').forEach((s) => s.classList.toggle('done', this.visited.has(s.dataset.k)));
  }

  toast(html, ms = 2600) {
    this.toastEl.innerHTML = html;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  enter(key) {
    const first = !this.visited.has(key);
    this.visited.add(key);
    try {
      localStorage.setItem('campus-visited', JSON.stringify([...this.visited]));
    } catch {}
    this.campus.markVisited(key);
    this.updateProgress();
    audio.sfx(first ? 'visit' : 'open');
    audio.setMuffled(true);
    this.input.enabled = this.rig.enabled = false;
    this.input.keys.clear();
    this.justCompleted = first && this.visited.size === SECTIONS.length;
    this.panel.open(key);
  }

  checkComplete() {
    if (!this.justCompleted) return;
    this.justCompleted = false;
    audio.sfx('complete');
    this.toast('🎉 <b>Campus tour complete!</b> Thanks for exploring. Say hi at the 📮 Notice Board!', 5000);
    this.confetti();
  }

  confetti(count = 90) {
    const box = document.createElement('div');
    box.className = 'confetti';
    const cols = ['#ff6f61', '#ffd166', '#6c8cff', '#2bb3a0', '#b28dff', '#ff8fb8'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${Math.random() * 0.6}s;animation-duration:${2 + Math.random() * 1.5}s;transform:rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
    }
    this.root.appendChild(box);
    setTimeout(() => box.remove(), 4200);
  }

  // ---------------------------------------------------------------
  tick() {
    if (!this.running) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const p = this.player;

    // world colliders + moving NPCs + the parked bike
    const circles = this.campus.circles.concat(this.npcs.circles, this.games.circles);
    if (!p.riding) circles.push({ x: p.bike.pos.x, z: p.bike.pos.z, r: 0.5 });
    // movement is relative to where the camera is looking
    p.update(dt, this.rig.toWorld(this.input.move), { boxes: this.campus.boxes, circles }, () => audio.sfx('step'));
    this.npcs.update(dt, p, () => audio.sfx('hi'));
    this.campus.update(t, dt);
    // mini-games pause while a panel or the help is open
    this.games.update(this.input.enabled ? dt : 0, t, p);

    // which zone are we standing in?
    let zone = null;
    for (const z of ZONES) if (Math.hypot(p.pos.x - z.x, p.pos.z - z.z) < ZONE_R) zone = z;
    this.activeZone = zone;
    this.activePad = zone ? null : this.games.padAt(p.pos);
    let prompt = '';
    const key = (k) => (isTouch ? `<b class="kbd-touch">${k === 'E' ? 'E' : '🚲'}</b>` : `<kbd>${k}</kbd>`);
    if (zone) {
      const s = SECTIONS.find((x) => x.key === zone.key);
      prompt = `${key('E')} Enter <b>${s.building}</b> · ${s.icon} ${s.title}`;
    } else if (this.activePad) {
      prompt = `${key('E')} ${this.games.padPrompt(this.activePad)}`;
    } else if (p.nearBike()) prompt = `${key('F')} Ride the bicycle`;
    else if (p.riding && p.speed < 0.5) prompt = `${key('F')} Get off the bicycle`;
    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt;
      this.promptEl.innerHTML = prompt;
      this.promptEl.classList.toggle('show', !!prompt);
    }

    this.rig.update(dt, p, this.campus.boxes);

    // keep the sun's shadow box centred on the player
    this.sun.position.copy(p.pos).add(this.sunOffset);
    this.sun.target.position.copy(p.pos);

    this.minimap.draw(p, this.npcs, this.visited, this.games.mapPoints());
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.input.dispose();
    this.rig.dispose();
    this.games.dispose();
    removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVis);
    this.renderer.dispose();
    this.root.innerHTML = '';
  }
}
