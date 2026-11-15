# 🎓 Campus Portfolio

A student portfolio you can **play**: walk (or ride a bicycle 🚲) around a cartoon college campus, and enter buildings to read about me. There's also a fast **classic page** for anyone in a hurry.

| Building | Section |
| --- | --- |
| 🏛️ Admin Block | About me |
| 💻 Computer Lab | Projects |
| 📚 Library | Education & certificates |
| 🔧 Tech Workshop | Skills |
| 🏆 Sports Ground | Achievements |
| ☕ Canteen | Hobbies & fun facts |
| 📮 Notice Board | Contact & résumé |

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install     # first time only
npm run dev     # opens a local server, usually http://localhost:5173
```

## Put in your own info

Everything you'll want to change is in **`src/content.js`**:

- `profile`: your name, tagline, status badge, email, socials, résumé and photo
- `projects[].image`: optional screenshot for each project card
- `avatar`: what your 3D student looks like (skin, hair, glasses, clothes, height…)
- `about`, `projects`, `education`, `skills`, `achievements`, `hobbies`, `contact`

To add a photo or résumé, put the file in the `public/` folder (e.g. `public/resume.pdf`) and set `resumeUrl: '/resume.pdf'`.

## Controls

| Action | Keyboard | Phone |
| --- | --- | --- |
| Move | `W A S D` / arrows | Joystick |
| Run | `Shift` | Push the joystick all the way |
| Enter building | `E` (on the glowing ring) | **E** button |
| Bicycle on/off | `F` | 🚲 button |
| Jump / Wave | `Space` / `Q` | ⤒ button |
| Look around | Drag the mouse | Drag the screen |
| Zoom | Mouse wheel | Pinch |
| Camera distance / reset | `V` / `R` | 🎥 button |
| Music on/off | `M` | 🎵 button |

## Mini-games

- ⭐ **Star Rush**: stand on the gold pad north of the fountain and press `E`. Collect 12 stars in 60 seconds.
- 🏁 **Ring Race**: the teal pad near the gate. Go through the rings around the plaza as fast as you can (the bike helps!).
- ⚽ **Football**: the ball on the sports ground is always live. Run or ride into it to kick it past the goalkeepers.

Best scores are saved in the browser.

## Deploy free on Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and **Import** the repository.
3. Vercel detects Vite automatically (build: `npm run build`, output: `dist`). Click **Deploy**.

Every push to your main branch will redeploy automatically.

**Tip:** share `https://your-site.vercel.app/?view=classic` with recruiters to open the classic page directly.

## How the code is organised

```
src/
  content.js        <- your info (edit this!)
  main.js           start screen, switching between 3D and classic
  styles.css        all the styling
  ui/
    sections.js     turns content into HTML (shared by both views)
    Classic.js      the classic one-page portfolio
    fx.js           scroll animations, magnetic buttons, cursor (classic page)
    Panel.js        pop-up panel inside the 3D world
  game/
    Game.js         scene, camera, lights, HUD, main loop
    Campus.js       the island, buildings, paths, trees, fountain…
    Character.js    the cartoon student model + animations
    Player.js       movement, collisions, jumping, the bicycle
    CameraRig.js    third-person camera: drag to look, zoom, wall avoidance
    MiniGames.js    Star Rush, Ring Race and football
    NPCs.js         students walking around campus
    Minimap.js      the corner map
    Input.js        keyboard + touch joystick
    Audio.js        lo-fi music & sound effects (generated in code)
```

Built with [Three.js](https://threejs.org) and [Vite](https://vitejs.dev).
