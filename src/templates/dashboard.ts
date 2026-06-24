import type { SoulFile } from "../schema/soul.js";
import type { Spell } from "../schema/spell.js";

export interface DashboardParams {
  projectName: string;
  personas: SoulFile[];
  spells: Spell[];
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

function renderPersonaCard(soul: SoulFile): string {
  return `
      <article class="agent-card">
        <div class="agent-top">
          <span class="glyph">${escapeHtml(soul.glyph)}</span>
        </div>
        <p class="agent-role">${escapeHtml(soul.role)}</p>
        <p class="agent-name">${escapeHtml(soul.display_name)}</p>
        <p class="agent-desc">${escapeHtml(firstSentence(soul.body))}</p>
        <p class="agent-voice">${escapeHtml(soul.voice)}</p>
      </article>`;
}

function renderSpellCard(spell: Spell): string {
  const aka = spell.feature ? `<p class="spell-aka">a.k.a. ${escapeHtml(spell.feature)}</p>` : "";
  const assignee = spell.assigned_to
    ? `assigned to <b>${escapeHtml(spell.assigned_to)}</b>`
    : "not yet assigned";
  const draftedBy = spell.drafted_by ? `drafted by <b>${escapeHtml(spell.drafted_by)}</b> · ` : "";

  return `
      <div class="spell-card">
        <div class="spell-top">
          <span class="spell-status">${escapeHtml(spell.status)}</span>
        </div>
        <p class="spell-name">${escapeHtml(spell.spell)}</p>
        ${aka}
        <p class="spell-meta">${draftedBy}${assignee}</p>
        <div class="bar" role="progressbar" aria-valuenow="${spell.progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="bar-fill" style="width:${spell.progress}%"></div>
        </div>
        <div class="bar-label"><span>progress</span><span>${spell.progress}%</span></div>
      </div>`;
}

export function renderDashboard({ projectName, personas, spells }: DashboardParams): string {
  const activeSpells = spells.filter((s) => s.status === "casting" || s.status === "blocked");
  const spellsHtml = spells.length
    ? spells.map(renderSpellCard).join("\n")
    : `<p class="empty-state">No battle plans yet. Ask the planner to draft one.</p>`;

  const rosterHtml = personas.length
    ? personas.map(renderPersonaCard).join("\n")
    : `<p class="empty-state">No agents installed yet. Run <code>aviomancy init</code> to cast the starting roster.</p>`;

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
  .wordmark .cursor { color: var(--green); animation: blink 1.1s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .tagline { color: var(--text-muted); margin: 14px 0 0; font-size: 14px; }
  section.block { margin-top: 48px; }
  .section-head h2 { font-family: var(--font-display); font-size: 20px; margin: 0 0 6px; }
  .section-head p { margin: 0; color: var(--text-muted); font-size: 13.5px; }
  .filetree { border: 1px solid var(--line); background: var(--bg-panel); border-radius: 5px; padding: 20px 22px; font-family: var(--font-display); font-size: 13px; margin-top: 18px; }
  .filetree-row { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line-soft); flex-wrap: wrap; }
  .filetree-row:last-child { border-bottom: none; }
  .filetree-connector { color: var(--text-dim); }
  .filetree-name { color: var(--green); font-weight: 500; }
  .filetree-desc { color: var(--text-muted); font-size: 12.5px; font-family: var(--font-body); }
  .spell-grid, .roster-grid { display: grid; gap: 14px; margin-top: 18px; }
  .spell-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .roster-grid { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
  .spell-card, .agent-card { border: 1px solid var(--line); background: var(--bg-card); border-radius: 5px; padding: 18px; }
  .spell-status { font-family: var(--font-display); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
  .spell-name { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--violet); margin: 8px 0 2px; }
  .spell-aka { font-size: 12px; color: var(--text-dim); margin: 0 0 10px; }
  .spell-meta { font-size: 12px; color: var(--text-muted); margin: 0 0 12px; }
  .spell-meta b { color: var(--text); font-weight: 500; }
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
</head>
<body>
<div class="wrap">
  <section class="hero">
    <p class="eyebrow">// command deck</p>
    <h1 class="wordmark">${escapeHtml(projectName)}<span class="cursor">_</span></h1>
    <p class="tagline">${personas.length} agent${personas.length === 1 ? "" : "s"} registered · ${activeSpells.length} active spell${activeSpells.length === 1 ? "" : "s"}</p>
  </section>

  <section class="block">
    <div class="section-head">
      <h2>// main files</h2>
      <p>the files that hold this project together.</p>
    </div>
    <div class="filetree">
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">AGENTS.md / CLAUDE.md</span><span class="filetree-desc">generic instructions for any agent working here</span></div>
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">PRODUCT.md</span><span class="filetree-desc">what shipped, and when</span></div>
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">dashboard.html</span><span class="filetree-desc">you are here — regenerated by <code>aviomancy sync</code></span></div>
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">MEMORY.md</span><span class="filetree-desc">project chronology and decisions</span></div>
      <div class="filetree-row"><span class="filetree-connector">├──</span><span class="filetree-name">TASKS.md</span><span class="filetree-desc">what's next, synced from your tracker</span></div>
      <div class="filetree-row"><span class="filetree-connector">└──</span><span class="filetree-name">_spells/</span><span class="filetree-desc">one battle plan per feature</span></div>
    </div>
  </section>

  <section class="block">
    <div class="section-head">
      <h2>// _spells/active</h2>
      <p>battle plans currently being cast.</p>
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
    <p class="prompt" style="opacity:.6;font-size:11px;">regenerated by aviomancy sync</p>
  </div>
</footer>
</body>
</html>
`;
}
