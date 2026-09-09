import type { SoulFile } from "../schema/soul.js";
import type { Potion } from "../schema/potion.js";
import type { Spell } from "../schema/spell.js";
import { BRAND_GLYPH } from "../theme.js";

export interface DashboardParams {
  projectName: string;
  personas: SoulFile[];
  potions: Potion[];
  spells?: Spell[];
  skillsCount?: number;
  statusInfo?: {
    installed: boolean;
    agentCount: number;
    skillCount: number;
    isUpToDate: boolean;
    statusMessage: string;
  };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstSentence(body: string): string {
  const stripped = body.replace(/^#.*$/m, "").trim();
  const match = stripped.match(/[^.\n]+[.]/);
  return (match ? match[0] : stripped.slice(0, 140)).trim();
}

function buildNameLookup(personas: SoulFile[]): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const soul of personas) {
    lookup[soul.display_name] = soul.display_name;
    if (soul.aliases?.valley) lookup[soul.aliases.valley] = soul.display_name;
    if (soul.aliases?.occult) lookup[soul.aliases.occult] = soul.display_name;
  }
  return lookup;
}

function findSoulByName(personas: SoulFile[], name: string): SoulFile | undefined {
  return personas.find(
    (s) =>
      s.display_name === name ||
      s.aliases?.valley === name ||
      s.aliases?.occult === name,
  );
}

function castNamesFor(personas: SoulFile[], name: string): { default: string; valley: string; occult: string } {
  const soul = findSoulByName(personas, name);
  if (!soul) return { default: name, valley: name, occult: name };
  return {
    default: soul.display_name,
    valley: soul.aliases?.valley ?? soul.display_name,
    occult: soul.aliases?.occult ?? soul.display_name,
  };
}

function renderPersonaCard(soul: SoulFile): string {
  const valley = soul.aliases?.valley ?? soul.display_name;
  const occult = soul.aliases?.occult ?? soul.display_name;
  return `
      <article class="agent-card" data-cast-default="${escapeHtml(soul.display_name)}" data-cast-valley="${escapeHtml(valley)}" data-cast-occult="${escapeHtml(occult)}">
        <div class="agent-top">
          <span class="glyph">${escapeHtml(soul.glyph)}</span>
        </div>
        <p class="agent-role">${escapeHtml(soul.role)}</p>
        <p class="agent-name cast-name">${escapeHtml(soul.display_name)}</p>
        <p class="agent-desc">${escapeHtml(firstSentence(soul.body))}</p>
        <p class="agent-voice">${escapeHtml(soul.voice)}</p>
      </article>`;
}

function renderPotionCard(potion: Potion, personas: SoulFile[], nameLookup: Record<string, string>): string {
  const aka = potion.feature ? `<p class="potion-aka">a.k.a. ${escapeHtml(potion.feature)}</p>` : "";
  const assigneeNames = potion.assigned_to ? castNamesFor(personas, potion.assigned_to) : null;
  const draftedNames = potion.drafted_by ? castNamesFor(personas, potion.drafted_by) : null;
  const assignee = assigneeNames
    ? `assigned to <b class="cast-name" data-cast-default="${escapeHtml(assigneeNames.default)}" data-cast-valley="${escapeHtml(assigneeNames.valley)}" data-cast-occult="${escapeHtml(assigneeNames.occult)}">${escapeHtml(nameLookup[potion.assigned_to!] ?? assigneeNames.default)}</b>`
    : "not yet assigned";
  const draftedBy = draftedNames
    ? `drafted by <b class="cast-name" data-cast-default="${escapeHtml(draftedNames.default)}" data-cast-valley="${escapeHtml(draftedNames.valley)}" data-cast-occult="${escapeHtml(draftedNames.occult)}">${escapeHtml(nameLookup[potion.drafted_by!] ?? draftedNames.default)}</b> · `
    : "";

  return `
      <div class="potion-card">
        <div class="potion-top">
          <span class="potion-status">${escapeHtml(potion.status)}</span>
        </div>
        <p class="potion-name">${escapeHtml(potion.potion)}</p>
        ${aka}
        <p class="potion-meta">${draftedBy}${assignee}</p>
        <div class="bar" role="progressbar" aria-valuenow="${potion.progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="bar-fill" style="width:${potion.progress}%"></div>
        </div>
        <div class="bar-label"><span>progress</span><span>${potion.progress}%</span></div>
      </div>`;
}

function renderSpellCard(spell: Spell): string {
  const meta =
    spell.type === "ward"
      ? `<p class="spell-meta">trigger: <b>${escapeHtml(spell.trigger)}</b>${spell.calls ? ` · calls: <b>${escapeHtml(spell.calls)}</b>` : ""}</p>`
      : spell.type === "curse"
        ? `<p class="spell-meta">severity: <b>${escapeHtml(spell.severity)}</b></p>`
        : `<p class="spell-meta">template</p>`;
  const desc = spell.description
    ? `<p class="spell-desc">${escapeHtml(spell.description)}</p>`
    : `<p class="spell-desc">${escapeHtml(firstSentence(spell.body))}</p>`;

  return `
      <div class="spell-card">
        <div class="spell-top">
          <span class="spell-type badge-${escapeHtml(spell.type)}">${escapeHtml(spell.type)}</span>
        </div>
        <p class="spell-name">${escapeHtml(spell.name)}</p>
        ${meta}
        ${desc}
      </div>`;
}

export function renderDashboard({ projectName, personas, potions, spells = [], skillsCount = 0, statusInfo }: DashboardParams): string {
  const activePotions = potions.filter((s) => s.status === "casting" || s.status === "blocked");
  const nameLookup = buildNameLookup(personas);
  const potionsHtml = potions.length
    ? potions.map((s) => renderPotionCard(s, personas, nameLookup)).join("\n")
    : `<p class="empty-state">No battle plans yet. Ask the planner to draft one.</p>`;

  const spellsHtml = spells.length
    ? spells.map(renderSpellCard).join("\n")
    : `<p class="empty-state">No conventions configured yet in <code>.hocus/_spells/</code>.</p>`;

  const rosterHtml = personas.length
    ? personas.map(renderPersonaCard).join("\n")
    : `<p class="empty-state">No agents installed yet. Run <code>hocus init</code> to cast the starting roster.</p>`;

  const statusObj = statusInfo ?? {
    installed: personas.length > 0,
    agentCount: personas.length,
    skillCount: skillsCount,
    isUpToDate: personas.length > 0,
    statusMessage: personas.length > 0 ? "Up-to-date" : "Not installed (run hocus init)",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(projectName)}_ — command deck</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0a0a0a; --bg-panel: #111313; --bg-card: #141716;
    --line: rgba(0,255,102,0.16); --line-soft: rgba(0,255,102,0.08);
    --green: #00ff66; --violet: #8b5cf6; --amber: #ffb454;
    --text: #e8e8e3; --text-muted: #8a8a8a; --text-dim: #56595a;
    --font-display: 'JetBrains Mono', ui-monospace, monospace;
    --font-body: 'IBM Plex Mono', ui-monospace, monospace;
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font-family:var(--font-body); font-size:15px; line-height:1.6; }
  :focus-visible { outline: 2px solid var(--green); outline-offset: 3px; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px 80px; }
  .hero { padding: 56px 0 32px; }
  .eyebrow { font-family: var(--font-display); color: var(--green); font-size: 12px; letter-spacing: 0.12em; margin: 0 0 16px; }
  .wordmark { font-family: var(--font-display); font-weight: 800; font-size: clamp(2.2rem, 6vw, 3.6rem); margin: 0; }
  .wordmark .brand-mark { color: var(--green); margin-right: 0.35em; }
  .wordmark .cursor { color: var(--green); animation: blink 1.1s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .tagline { color: var(--text-muted); margin: 14px 0 0; font-size: 14px; }
  section.block { margin-top: 48px; }
  .section-head h2 { font-family: var(--font-display); font-size: 20px; margin: 0 0 6px; }
  .section-head p { margin: 0; color: var(--text-muted); font-size: 13.5px; }
  .status-box { border: 1px solid var(--line); background: var(--bg-panel); border-radius: 5px; padding: 18px 22px; margin-top: 18px; display: flex; gap: 24px; flex-wrap: wrap; align-items: center; }
  .status-row { font-family: var(--font-display); font-size: 13.5px; display: flex; gap: 8px; align-items: center; }
  .status-key { color: var(--text-dim); }
  .status-val { color: var(--text); font-weight: 600; }
  .status-badge { padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .badge-ok { background: rgba(0,255,102,0.12); color: var(--green); border: 1px solid rgba(0,255,102,0.3); }
  .badge-warn { background: rgba(255,180,84,0.12); color: var(--amber); border: 1px solid rgba(255,180,84,0.3); }
  .filetree { border: 1px solid var(--line); background: var(--bg-panel); border-radius: 5px; padding: 20px 22px; font-family: var(--font-display); font-size: 13px; margin-top: 18px; }
  .filetree-row { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line-soft); flex-wrap: wrap; }
  .filetree-row:last-child { border-bottom: none; }
  .filetree-connector { color: var(--text-dim); }
  .filetree-name { color: var(--green); font-weight: 500; }
  .filetree-desc { color: var(--text-muted); font-size: 12.5px; font-family: var(--font-body); }
  .potion-grid, .spell-grid, .roster-grid { display: grid; gap: 14px; margin-top: 18px; }
  .potion-grid, .spell-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .roster-grid { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
  .potion-card, .spell-card, .agent-card { border: 1px solid var(--line); background: var(--bg-card); border-radius: 5px; padding: 18px; }
  .spell-top { display: flex; justify-content: space-between; align-items: center; }
  .spell-type { font-family: var(--font-display); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 6px; border-radius: 3px; font-weight: 600; }
  .badge-incantation { color: var(--violet); background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.3); }
  .badge-ward { color: var(--green); background: rgba(0,255,102,0.12); border: 1px solid rgba(0,255,102,0.3); }
  .badge-curse { color: var(--amber); background: rgba(255,180,84,0.12); border: 1px solid rgba(255,180,84,0.3); }
  .spell-name { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--text); margin: 6px 0 2px; }
  .spell-meta { font-size: 12px; color: var(--text-muted); margin: 0 0 6px; }
  .spell-meta b { color: var(--text); font-weight: 500; }
  .spell-desc { font-size: 12.5px; color: var(--text-dim); margin: 0; }
  .potion-status { font-family: var(--font-display); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
  .potion-name { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--violet); margin: 8px 0 2px; }
  .potion-aka { font-size: 12px; color: var(--text-dim); margin: 0 0 10px; }
  .potion-meta { font-size: 12px; color: var(--text-muted); margin: 0 0 12px; }
  .potion-meta b { color: var(--text); font-weight: 500; }
  .bar { height: 6px; border-radius: 3px; background: var(--bg-panel); border: 1px solid var(--line); overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, var(--green), var(--violet)); }
  .bar-label { font-size: 10.5px; color: var(--text-dim); margin-top: 6px; display: flex; justify-content: space-between; font-family: var(--font-display); }
  .glyph { font-family: var(--font-display); font-size: 13px; color: var(--green); border: 1px solid var(--line); border-radius: 4px; padding: 3px 7px; background: var(--bg-panel); }
  .agent-role { font-family: var(--font-display); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); margin: 12px 0 3px; }
  .agent-name { font-size: 16px; font-weight: 600; margin: 0 0 7px; }
  .agent-desc { font-size: 12.5px; color: var(--text-muted); margin: 0 0 8px; }
  .agent-voice { font-size: 11.5px; color: var(--text-dim); font-style: italic; margin: 0; }
  .empty-state { color: var(--text-dim); font-size: 13.5px; border: 1px dashed var(--line); border-radius: 5px; padding: 18px; margin-top: 18px; }
  footer { border-top: 1px solid var(--line); margin-top: 60px; padding: 22px 0; }
  .prompt { font-family: var(--font-display); color: var(--text-muted); font-size: 13px; }
  .prompt .cursor { color: var(--green); animation: blink 1.1s steps(1) infinite; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; } }
</style>
<script>
(function () {
  var params = new URLSearchParams(window.location.search);
  var cast = params.get("cast");
  if (!cast || cast === "hocus") return;
  var key = cast === "valley" || cast === "occult" ? "data-cast-" + cast : null;
  if (!key) return;
  document.querySelectorAll("[data-cast-default]").forEach(function (el) {
    var alt = el.getAttribute(key);
    if (alt) el.textContent = alt;
  });
})();
</script>
</head>
<body>
<div class="wrap">
  <section class="hero">
    <p class="eyebrow">${escapeHtml(BRAND_GLYPH)} // command deck</p>
    <h1 class="wordmark"><span class="brand-mark">${escapeHtml(BRAND_GLYPH)}</span>${escapeHtml(projectName)}<span class="cursor">_</span></h1>
    <p class="tagline">${personas.length} agent${personas.length === 1 ? "" : "s"} registered · ${statusObj.skillCount} skill${statusObj.skillCount === 1 ? "" : "s"} · ${activePotions.length} active potion${activePotions.length === 1 ? "" : "s"}${spells.length ? ` · ${spells.length} spell${spells.length === 1 ? "" : "s"}` : ""}</p>
  </section>

  <section class="block">
    <div class="section-head">
      <h2>// hocus status</h2>
      <p>project harness state & synchronization status.</p>
    </div>
    <div class="status-box">
      <div class="status-row"><span class="status-key">hocus:</span> <span class="status-val">${statusObj.installed ? "installed" : "not installed"}</span></div>
      <div class="status-row"><span class="status-key">agents:</span> <span class="status-val">${statusObj.agentCount}</span></div>
      <div class="status-row"><span class="status-key">skills:</span> <span class="status-val">${statusObj.skillCount}</span></div>
      <div class="status-row"><span class="status-key">status:</span> <span class="status-badge ${statusObj.isUpToDate ? "badge-ok" : "badge-warn"}">${escapeHtml(statusObj.statusMessage)}</span></div>
    </div>
  </section>

  <section class="block">
    <div class="section-head">
      <h2>// main files</h2>
      <p>the files that hold this project together.</p>
    </div>
    <div class="filetree">
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">AGENTS.md</span><span class="filetree-desc">generic instructions for any agent working here</span></div>
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">.agents/plugins/</span><span class="filetree-desc">agent-plugins.org compatible package (skills, MCPs)</span></div>
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">PRODUCT.md</span><span class="filetree-desc">what shipped, and when</span></div>
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">dashboard.html</span><span class="filetree-desc">you are here — regenerated by <code>hocus sync</code></span></div>
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">MEMORY.md</span><span class="filetree-desc">project chronology and decisions</span></div>
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">TASKS.md</span><span class="filetree-desc">what's next, synced from your tracker</span></div>
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">.hocus/_potions/</span><span class="filetree-desc">one battle plan per feature</span></div>
      <div class="filetree-row"><span class="filetree-connector">└──</span><span class="filetree-name">.hocus/_spells/</span><span class="filetree-desc">atomic conventions: incantations, wards, curses</span></div>
    </div>
  </section>

  <section class="block">
    <div class="section-head">
      <h2>// .hocus/_potions/active</h2>
      <p>battle plans currently being cast.</p>
    </div>
    <div class="potion-grid">${potionsHtml}</div>
  </section>

  <section class="block">
    <div class="section-head">
      <h2>// .hocus/_spells/</h2>
      <p>atomic conventions, templates, hooks, and guardrails.</p>
    </div>
    <div class="spell-grid">${spellsHtml}</div>
  </section>

  <section class="block">
    <div class="section-head">
      <h2>// cast</h2>
      <p>agents currently installed in this repo.</p>
    </div>
    <div class="roster-grid">${rosterHtml}</div>
  </section>
</div>

<footer>
  <div class="wrap" style="padding-bottom:0;">
    <p class="prompt">${escapeHtml(projectName)}:~$ <span class="cursor">_</span></p>
    <p class="prompt" style="opacity:.6;font-size:11px;">regenerated by hocus sync</p>
  </div>
</footer>
</body>
</html>
`;
}

