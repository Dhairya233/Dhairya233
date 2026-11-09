<!-- Hello, curious reader. The numbers on this page are computed, not typed: see scripts/build-readme.mjs. -->
<div align="center">

# Dhairya Shah

Computer vision, full-stack and ML projects that I test and explain honestly.

[Website](https://dhairya233.github.io/) · [LinkedIn](https://www.linkedin.com/in/dhairyagshah233) · [Email](mailto:dhairyagshah233@gmail.com) · [Published research](https://ahduni.edu.in/academics/schools-centres/the-institute-of-manufacturing-and-economy/insights/textiles-growing-in-scale-losing-relative-ground/)

</div>

## About

I'm a third-year B.Tech Computer Science and Engineering student at Ahmedabad University. I like problems where the honest answer takes some measuring: how well does a model really work, where could a system leak, what does the evidence say. My habit is to write the test, or the attack, before I trust the thing.

## Right now

- Strengthening data structures and algorithms and my computer-science fundamentals.
- Research intern at the Institute of Manufacturing and Economy, Ahmedabad University.
- Looking to do research with a professor.

## Featured projects

### [GestureOS](https://github.com/Dhairya233/GestureOS)

Control a Windows PC with your bare hands through a webcam.

- Turns hand tracking (21 landmarks per hand) into mouse, scroll, media, drawing and app-launch control.
- Starts disarmed. A two-palm hold arms it, and one gateway releases held keys when it disarms.
- 630 automated tests drive the real engine with generated hands and a fake input backend, so it is tested without a camera.

<sub>Python, MediaPipe, OpenCV, CustomTkinter</sub> · [Code](https://github.com/Dhairya233/GestureOS) · [Case study](https://dhairya233.github.io/work/gestureos/)

### [Life-RPG Protocol](https://github.com/Dhairya233/life-rpg-protocol)

A gamified productivity app where focus sessions and peer-reviewed proof of work earn XP.

- Audited my own database and found users could edit their own Aura, XP and role.
- Fixed it with column-level grants, a revoked function right, and identity taken from auth.uid().
- 44 attack checks failed on the old schema; about 260 database checks pass now, including a two-session race test.

<sub>Next.js 14, TypeScript, Supabase, PostgreSQL</sub> · [Code](https://github.com/Dhairya233/life-rpg-protocol) · [Live](https://life-rpg-protocol.vercel.app/login) · [Case study](https://dhairya233.github.io/work/life-rpg/)

### [Browser Arcade](https://github.com/Dhairya233/browser-arcade)

Two multiplayer board games, Shadow Hunt and Game of Trades, playable on one screen or online.

- Found that 26 of 26 state snapshots exposed the hidden player's position, then fixed it with per-seat views and host validation.
- A test reads every message sent to every non-hidden seat across a whole online game.
- 135 tests run on every push with GitHub Actions.

<sub>JavaScript, WebRTC, PeerJS</sub> · [Code](https://github.com/Dhairya233/browser-arcade) · [Live](https://dhairya233.github.io/browser-arcade/) · [Case study](https://dhairya233.github.io/work/browser-arcade/)

### [Textile Defect ML Model](https://github.com/Dhairya233/Textile-Defect-ML-Model)

A leak-aware study of how much your data split changes a fabric-defect detector's results.

- On the public AITEX dataset (245 strips, 7 fabrics), a random split overstated random-forest patch-level average precision by 0.44 against splitting by strip.
- With a whole fabric held out, every method scored close to chance.
- Intervals come from 1,000 bootstrap resamples over strips; 75 tests pass.

<sub>Python, scikit-learn, scikit-image</sub> · [Code](https://github.com/Dhairya233/Textile-Defect-ML-Model) · [Results explorer](https://dhairya233.github.io/Textile-Defect-ML-Model/) · [Case study](https://dhairya233.github.io/work/fabric-defect/)

Results, decisions and honest limits for each are on the [portfolio site](https://dhairya233.github.io/work/).

## Research

[Textiles: Growing in Scale, Losing Relative Ground](https://ahduni.edu.in/academics/schools-centres/the-institute-of-manufacturing-and-economy/insights/textiles-growing-in-scale-losing-relative-ground/). Sector snapshot from the Institute of Manufacturing and Economy. I did the primary research.

## Skills

**Used in projects.** Python, JavaScript, TypeScript, SQL, MediaPipe, OpenCV, scikit-learn, NumPy, pandas, Next.js, Supabase, WebRTC, pytest, GitHub Actions  
**Learning.** Data structures and algorithms, C++, data engineering  
**Spoken languages.** English, Hindi, Gujarati

<details>
<summary>whoami</summary>

```text
$ whoami
dhairya
$ cat habits.txt
write the test, or the attack, before trusting the thing
say what a result does not show
$ ls ~/learning
data-structures-and-algorithms  cpp  data-engineering
```

</details>

## Contact

Email: dhairyagshah233@gmail.com · LinkedIn: https://www.linkedin.com/in/dhairyagshah233

<sub>How this profile is built: [`profile-data.json`](profile-data.json) holds the text, [`scripts/build-readme.mjs`](scripts/build-readme.mjs) turns it into this file and the chart, and a daily GitHub Action reruns it. No third-party stat services. If a repo goes private, its Code link drops out by itself.</sub>
