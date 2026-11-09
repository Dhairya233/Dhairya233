// build-readme.mjs: writes README.md and two small SVGs (light and dark) from profile-data.json
// plus public GitHub API data. No third-party services.
//
// Numbers shown in the stats block, and exactly how they are computed:
//   repos     = count of my public, non-fork, non-archived repositories
//   stars     = sum of stargazers_count over those repositories
//   languages = for each of those repositories, the byte counts from GET /repos/{r}/languages,
//               summed per language; shown as each language's share of the total bytes.
//               (Bytes are a rough measure of code volume, not of skill.)
//   weekdays  = from the GraphQL contribution calendar (last 365 days): contributions per weekday.
//               Each falling dot is one share of those contributions; see the caption in the README.
//   followers = public followers count from GET /users/{login}.
//   views     = (optional) visitors to this profile repository over the last 14 days, from the
//               repository traffic API. Only shown if a TRAFFIC_TOKEN secret is set (see README notes).
// If the API cannot be reached, the existing SVGs and numbers are kept and nothing breaks.
//
// Usage: node scripts/build-readme.mjs                (uses GITHUB_TOKEN if set)
//        node scripts/build-readme.mjs --fixture f.json   (offline test data, same shape as the API)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const here = (p) => new URL("../" + p, import.meta.url);
const data = JSON.parse(readFileSync(here("profile-data.json"), "utf8"));
const fixtureArg = process.argv.indexOf("--fixture");
const fixture = fixtureArg > -1 ? JSON.parse(readFileSync(process.argv[fixtureArg + 1], "utf8")) : null;
const headers = { "user-agent": "profile-readme", accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function api(path) {
  if (fixture) return fixture[path] ?? null;
  const res = await fetch("https://api.github.com" + path, { headers, signal: AbortSignal.timeout(15000) });
  if (res.status === 404) return { __missing: true };
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function calendar() {
  if (fixture) return fixture["calendar"] ?? null;
  const to = new Date(), from = new Date(to.getTime() - 364 * 864e5);
  const q = `query($l:String!,$f:DateTime!,$t:DateTime!){user(login:$l){contributionsCollection(from:$f,to:$t){contributionCalendar{totalContributions weeks{contributionDays{weekday contributionCount}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", { method: "POST", headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ query: q, variables: { l: data.github, f: from.toISOString(), t: to.toISOString() } }), signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error("graphql " + res.status);
  const j = await res.json();
  if (j.errors) throw new Error("graphql " + j.errors[0].message);
  return j.data.user.contributionsCollection.contributionCalendar;
}
async function weekdayTotals() {
  try {
    const cal = await calendar(); if (!cal) return null;
    const t = [0, 0, 0, 0, 0, 0, 0];
    for (const w of cal.weeks) for (const d of w.contributionDays) t[d.weekday] += d.contributionCount;
    return { totals: t, all: t.reduce((a, b) => a + b, 0) };
  } catch (e) { console.warn("calendar unavailable:", e.message); return null; }
}
async function social() {
  try {
    const u = await api(`/users/${data.github}`); const out = { followers: u?.followers ?? null, views: null };
    if (process.env.TRAFFIC_TOKEN && !fixture) {
      const r = await fetch(`https://api.github.com/repos/${data.github}/${data.github}/traffic/views`, { headers: { ...headers, authorization: `Bearer ${process.env.TRAFFIC_TOKEN}` } });
      if (r.ok) { const v = await r.json(); out.views = { count: v.count, uniques: v.uniques }; }
    }
    return out;
  } catch (e) { console.warn("social unavailable:", e.message); return { followers: null, views: null }; }
}

// ---- repo visibility for the featured projects ----
async function isPublic(repo) {
  try {
    const j = await api(`/repos/${repo}`);
    if (!j) return true;                 // no fixture entry: assume public
    if (j.__missing) return false;       // private, renamed or deleted
    return j.private === false && !j.archived;
  } catch { return true; }               // outage or rate limit: keep the link
}

// ---- stats ----
async function collectStats() {
  try {
    const repos = (await api(`/users/${data.github}/repos?per_page=100&type=owner`)).filter((r) => !r.fork && !r.archived && !r.private);
    const bytes = {};
    for (const r of repos) {
      const langs = (await api(`/repos/${r.full_name}/languages`)) || {};
      for (const [k, v] of Object.entries(langs)) bytes[k] = (bytes[k] || 0) + v;
    }
    const total = Object.values(bytes).reduce((a, b) => a + b, 0);
    const list = Object.entries(bytes).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, share: n / total }));
    return { repos: repos.length, stars: repos.reduce((a, r) => a + r.stargazers_count, 0), languages: list };
  } catch (e) {
    console.warn("stats unavailable, keeping previous files:", e.message);
    return null;
  }
}

// ---- SVG: one horizontal stacked bar, thin and quiet ----
const SHADES = { light: ["#1B3A4B", "#3E6173", "#6E8E9E", "#9DB5C0", "#C3D1D8"], dark: ["#8FC1D6", "#6FA2B8", "#55879C", "#3F6C80", "#2C5063"] };
function langSvg(langs, theme) {
  const top = langs.slice(0, 5), rest = 1 - top.reduce((a, l) => a + l.share, 0);
  const items = rest > 0.005 ? [...top, { name: "Other", share: rest }] : top;
  const ink = theme === "dark" ? "#EEE9DE" : "#14110F", dim = theme === "dark" ? "#A8A194" : "#5A534A";
  const W = 720, pad = 0; let x = pad, bars = "", legend = "";
  items.forEach((l, i) => {
    const w = Math.max(2, l.share * W);
    bars += `<rect x="${x.toFixed(1)}" y="8" width="${w.toFixed(1)}" height="14" fill="${SHADES[theme][Math.min(i, 4)]}"/>`;
    x += w;
    const lx = (i % 3) * 240, ly = 48 + Math.floor(i / 3) * 22;
    legend += `<g transform="translate(${lx},${ly})"><rect width="10" height="10" y="-9" fill="${SHADES[theme][Math.min(i, 4)]}"/><text x="16" fill="${ink}" font-size="13">${l.name} <tspan fill="${dim}">${(l.share * 100).toFixed(1)}%</tspan></text></g>`;
  });
  const h = 48 + Math.ceil(items.length / 3) * 22;
  const label = "Languages by share of bytes across my public repositories: " + items.map((l) => `${l.name} ${(l.share * 100).toFixed(0)} percent`).join(", ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" role="img" aria-label="${label}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace">${bars}${legend}</svg>\n`;
}


// ---- The Galton board of my week. One falling dot = a share of my real contributions. ----
// 6 rows of pegs give 7 bins, one per weekday. Every dot takes a random left/right path that is
// constrained to end in its true weekday bin, so the final stacks are exactly the real histogram.
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function boardSvg(wd, theme, animated) {
  const W = 720, H = 330, cx = W / 2, dx = 64, ROWS = 6, y0 = 26, dy = 20, floor = 296, step = 8.2, R = 3.6, MAXSTACK = 14;
  const pal = theme === "dark" ? { bg: "none", ink: "#EEE9DE", dim: "#A8A194", peg: "#4A5559", ball: "#FF5A2B", pile: "#8FC1D6" } : { bg: "none", ink: "#14110F", dim: "#5A534A", peg: "#B9B0A0", ball: "#FF4D1F", pile: "#1B3A4B" };
  const scale = Math.max(1, Math.ceil(Math.max(...wd.totals) / MAXSTACK));
  const n = wd.totals.map((t) => Math.round(t / scale));
  const bx = (k) => cx + (k - 3) * dx;
  let pegs = ""; for (let r = 0; r < ROWS; r++) for (let j = 0; j <= r; j++) pegs += `<circle cx="${cx + (2 * j - r) * dx / 2}" cy="${y0 + r * dy}" r="2.4" fill="${pal.peg}"/>`;
  let walls = ""; for (let k = 0; k <= 7; k++) walls += `<line x1="${bx(k) - dx / 2}" y1="${y0 + ROWS * dy - 6}" x2="${bx(k) - dx / 2}" y2="${floor + 4}" stroke="${pal.peg}" stroke-width="1"/>`;
  let labels = ""; for (let k = 0; k < 7; k++) labels += `<text x="${bx(k)}" y="${floor + 22}" text-anchor="middle" fill="${pal.dim}" font-size="12">${DAYS[k]}</text><text x="${bx(k)}" y="${floor + 36}" text-anchor="middle" fill="${pal.ink}" font-size="12">${wd.totals[k]}</text>`;
  const balls = []; for (let k = 0; k < 7; k++) for (let s = 0; s < n[k]; s++) balls.push({ k, s });
  const rand = rng(1234); for (let i = balls.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [balls[i], balls[j]] = [balls[j], balls[i]]; }
  const seen = Array(7).fill(0); for (const b of balls) b.s = seen[b.k]++; // lower slots always land first, so stacks never float
  const GAP = 0.3, DUR = 2.6, HOLD = 7, T = balls.length * GAP + DUR + HOLD;
  let dots = "";
  balls.forEach((b, i) => {
    const fx = bx(b.k), fy = floor - R - b.s * step;
    if (!animated) { dots += `<circle cx="${fx}" cy="${fy.toFixed(1)}" r="${R}" fill="${pal.pile}"/>`; return; }
    // random order of 6 moves with exactly b.k rights
    const moves = Array(ROWS).fill(0).fill(1, 0, b.k); for (let m = ROWS - 1; m > 0; m--) { const j = Math.floor(rand() * (m + 1)); [moves[m], moves[j]] = [moves[j], moves[m]]; }
    let path = `M${cx} 6`, rights = 0;
    for (let r = 0; r < ROWS; r++) { path += ` L${cx + (2 * rights - r) * dx / 2} ${y0 + r * dy - 5}`; rights += moves[r]; }
    path += ` L${fx} ${(fy - 0).toFixed(1)}`;
    const t0 = (i * GAP) / T, t1 = (i * GAP + DUR) / T;
    dots += `<circle r="${R}" fill="${pal.ball}" opacity="0"><animateMotion path="${path}" dur="${T.toFixed(1)}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1;1" keyTimes="0;${t0.toFixed(4)};${t1.toFixed(4)};1"/><animate attributeName="opacity" values="0;0;1;1" keyTimes="0;${t0.toFixed(4)};${(t0 + 0.0005).toFixed(4)};1" dur="${T.toFixed(1)}s" repeatCount="indefinite"/><animate attributeName="fill" values="${pal.ball};${pal.ball};${pal.pile};${pal.pile}" keyTimes="0;${t1.toFixed(4)};${(t1 + 0.0005).toFixed(4)};1" dur="${T.toFixed(1)}s" repeatCount="indefinite" calcMode="discrete"/></circle>`;
  });
  const label = "Contributions by weekday over the last year: " + DAYS.map((d, k) => `${d} ${wd.totals[k]}`).join(", ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="${label}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace"><title>${label}</title>${pegs}${walls}${labels}${dots}</svg>\n`;
}

// ---- build ----
const projects = [];
for (const p of data.featured) {
  const pub = await isPublic(p.repo);
  const links = [];
  if (pub) links.push(`[Code](https://github.com/${p.repo})`);
  if (p.live) links.push(`[${p.liveLabel || "Live"}](${p.live})`);
  links.push(`[Case study](${data.site}work/${p.id}/)`);
  projects.push(`### ${pub ? `[${p.name}](https://github.com/${p.repo})` : p.name}

${p.pitch}

${p.highlights.map((h) => `- ${h}`).join("\n")}

<sub>${p.stack}</sub> · ${links.join(" · ")}`);
}

const stats = await collectStats();
const wd = await weekdayTotals();
const soc = await social();
mkdirSync(here("assets"), { recursive: true });
if (wd && wd.all > 0) for (const th of ["light", "dark"]) {
  writeFileSync(here(`assets/board-${th}.svg`), boardSvg(wd, th, true));
  writeFileSync(here(`assets/board-${th}-still.svg`), boardSvg(wd, th, false));
}
let boardBlock = "";
if (existsSync(here("assets/board-light.svg"))) {
  const busiest = wd ? FULL[wd.totals.indexOf(Math.max(...wd.totals))] : null;
  const alt = wd ? "Contributions by weekday over the last year: " + DAYS.map((d, k) => `${d} ${wd.totals[k]}`).join(", ") : "Galton board of my contributions by weekday";
  boardBlock = `<div align="center">

<picture>
  <source media="(prefers-reduced-motion: reduce) and (prefers-color-scheme: dark)" srcset="assets/board-dark-still.svg">
  <source media="(prefers-reduced-motion: reduce)" srcset="assets/board-light-still.svg">
  <source media="(prefers-color-scheme: dark)" srcset="assets/board-dark.svg">
  <img src="assets/board-light.svg" alt="${alt}" width="720">
</picture>

<sub>${wd ? `A Galton board of my last year: each dot is a share of my ${wd.all} contributions, falling through the pegs and landing in its real weekday. Busiest day: ${busiest}.` : ""}<br>The stacks are real data from the GitHub API; the falling path is random. Rebuilt daily.</sub>

</div>

`;
}
const glance = [];
if (soc.followers != null) glance.push(`${soc.followers} follower${soc.followers === 1 ? "" : "s"}`);
if (stats) glance.push(`${stats.repos} public repositories`, `${stats.stars} star${stats.stars === 1 ? "" : "s"} received`);
if (soc.views) glance.push(`${soc.views.count} profile page views in the last 14 days (${soc.views.uniques} unique)`);
const glanceLine = glance.length ? `<div align="center"><sub>${glance.join(" · ")}</sub></div>

` : "";
let statsBlock = "";
if (stats && stats.languages.length) {
  writeFileSync(here("assets/languages-light.svg"), langSvg(stats.languages, "light"));
  writeFileSync(here("assets/languages-dark.svg"), langSvg(stats.languages, "dark"));
}
if (existsSync(here("assets/languages-light.svg"))) {
  const counts = stats ? `${stats.repos} public repositories · ${stats.stars} stars · ` : "";
  statsBlock = `## By the numbers

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/languages-dark.svg">
  <img src="assets/languages-light.svg" alt="Bar chart of the languages across my public repositories, by share of code bytes" width="720">
</picture>

<sub>${counts}language share is by code bytes across my public, non-fork repositories, computed by [\`scripts/build-readme.mjs\`](scripts/build-readme.mjs) from the GitHub API. Bytes measure volume, not skill.</sub>

`;
}

const md = `<!-- Hello, curious reader. The numbers on this page are computed, not typed: see scripts/build-readme.mjs. -->
<div align="center">

# Dhairya Shah

${data.headline}

[Website](${data.site}) · [LinkedIn](${data.linkedin}) · [Email](mailto:${data.email}) · [Published research](${data.research.url})

</div>

${boardBlock}${glanceLine}## About

${data.about}

## Right now

${data.now.map((n) => `- ${n}`).join("\n")}

## Featured projects

${projects.join("\n\n")}

Results, decisions and honest limits for each are on the [portfolio site](${data.site}work/).

## Research

[${data.research.title}](${data.research.url}). ${data.research.note}

## Skills

${Object.entries(data.skills).map(([k, v]) => `**${k}.** ${v}`).join("  \n")}  
**Spoken languages.** ${data.spoken}

${statsBlock}<details>
<summary>whoami</summary>

\`\`\`text
$ whoami
dhairya
$ cat habits.txt
write the test, or the attack, before trusting the thing
say what a result does not show
$ ls ~/learning
data-structures-and-algorithms  cpp  data-engineering
\`\`\`

</details>

## Contact

Email: ${data.email} · LinkedIn: ${data.linkedin}

<sub>How this profile is built: [\`profile-data.json\`](profile-data.json) holds the text, [\`scripts/build-readme.mjs\`](scripts/build-readme.mjs) turns it into this file and the chart, and a daily GitHub Action reruns it. No third-party stat services. If a repo goes private, its Code link drops out by itself.</sub>
`;
writeFileSync(here("README.md"), md);
console.log("README.md written");
