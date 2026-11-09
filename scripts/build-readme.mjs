// build-readme.mjs: writes README.md and two small SVGs (light and dark) from profile-data.json
// plus public GitHub API data. No third-party services.
//
// Numbers shown in the stats block, and exactly how they are computed:
//   repos     = count of my public, non-fork, non-archived repositories
//   stars     = sum of stargazers_count over those repositories
//   languages = for each of those repositories, the byte counts from GET /repos/{r}/languages,
//               summed per language; shown as each language's share of the total bytes.
//               (Bytes are a rough measure of code volume, not of skill.)
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
mkdirSync(here("assets"), { recursive: true });
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

## About

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
