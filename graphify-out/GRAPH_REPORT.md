# Graph Report - hocus  (2026-07-28)

## Corpus Check
- 108 files · ~36,582 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 557 nodes · 601 edges · 89 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0a3bcad4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `SoulFile` - 11 edges
3. `runCast()` - 9 edges
4. `parseSoulFile()` - 8 edges
5. `PROJECT_PERSONAS_DIR()` - 8 edges
6. `Hocus` - 8 edges
7. `CompiledFile` - 7 edges
8. `Compiler` - 7 edges
9. `renderDashboard()` - 7 edges
10. `log` - 7 edges

## Surprising Connections (you probably didn't know these)
- `CastOptions` --references--> `TargetId`  [EXTRACTED]
  src/commands/cast.ts → src/compilers/types.ts
- `loadPersonas()` --calls--> `parseSoulFile()`  [EXTRACTED]
  src/commands/tui.tsx → src/schema/soul.ts
- `DashboardParams` --references--> `SoulFile`  [EXTRACTED]
  src/templates/dashboard.ts → src/schema/soul.ts
- `runCast()` --calls--> `detectStack()`  [EXTRACTED]
  src/commands/cast.ts → src/scanners/detect-stack.ts
- `runCast()` --calls--> `readSpells()`  [EXTRACTED]
  src/commands/cast.ts → src/schema/spell.ts

## Import Cycles
- None detected.

## Communities (89 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (41): CastOptions, detectRelevantCompilers(), runCast(), InitOptions, runInit(), runSkillAdd(), SkillAddOptions, runSync() (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (36): author, bin, hocus, dependencies, commander, fast-glob, fs-extra, gray-matter (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (18): antigravityCompiler, claudeCodeCompiler, DEFAULT_TOOLS, cursorCompiler, openCodeCompiler, CompiledFile, Compiler, DetectedStack (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (12): Commands, Directory layout, Hocus, `hocus cast`, `hocus init`, `hocus skill add <name>`, `hocus sync`, Install (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (5): Baba Yaga — dumb-qa, Baba Yaga — Dumb QA, Boundaries, Manner, Responsibilities

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (5): Boundaries, Flamel — feature-dev, Flamel — Feature Dev, Manner, Responsibilities

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (5): Boundaries, Circe — product-strategist, Circe — Product Strategist, Manner, Responsibilities

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (5): Boundaries, Manner, Responsibilities, The Apprentice — ceremony-master, The Apprentice — Ceremony Master

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (5): Boundaries, Manner, Responsibilities, Zoroaster — reviewer, Zoroaster — Reviewer

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (5): Boundaries, Manner, Responsibilities, Roger Bacon — orchestrator, Roger Bacon — Orchestrator

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (5): Boundaries, Cagliostro — qa, Cagliostro — QA, Manner, Responsibilities

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (5): Boundaries, John Dee — configurator, John Dee — Configurator, Manner, Responsibilities

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (5): Boundaries, Manner, Nostradamus — recruiter, Nostradamus — Recruiter, Responsibilities

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (5): Boundaries, Manner, Midas — founder, Midas — Founder, Responsibilities

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (5): Boundaries, Cornelius Agrippa — project-manager, Cornelius Agrippa — Project Manager, Manner, Responsibilities

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (5): Boundaries, Manner, Merlin — planner, Merlin — Planner, Responsibilities

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (5): Boundaries, Manner, Prospero — costs-cleaner, Prospero — Costs Cleaner, Responsibilities

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (4): Baba Yaga — Dumb QA, Boundaries, Manner, Responsibilities

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (4): Boundaries, Flamel — Feature Dev, Manner, Responsibilities

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (4): Boundaries, Circe — Product Strategist, Manner, Responsibilities

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Responsibilities, The Apprentice — Ceremony Master

### Community 23 - "Community 23"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Responsibilities, Zoroaster — Reviewer

### Community 24 - "Community 24"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Responsibilities, Roger Bacon — Orchestrator

### Community 25 - "Community 25"
Cohesion: 0.40
Nodes (4): Boundaries, Cagliostro — QA, Manner, Responsibilities

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (4): Boundaries, John Dee — Configurator, Manner, Responsibilities

### Community 27 - "Community 27"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Nostradamus — Recruiter, Responsibilities

### Community 28 - "Community 28"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Midas — Founder, Responsibilities

### Community 29 - "Community 29"
Cohesion: 0.40
Nodes (4): Boundaries, Cornelius Agrippa — Project Manager, Manner, Responsibilities

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Merlin — Planner, Responsibilities

### Community 31 - "Community 31"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Prospero — Costs Cleaner, Responsibilities

### Community 32 - "Community 32"
Cohesion: 0.40
Nodes (4): Baba Yaga — Dumb QA, Boundaries, Manner, Responsibilities

### Community 33 - "Community 33"
Cohesion: 0.40
Nodes (4): Boundaries, Flamel — Feature Dev, Manner, Responsibilities

### Community 34 - "Community 34"
Cohesion: 0.40
Nodes (4): Boundaries, Circe — Product Strategist, Manner, Responsibilities

### Community 35 - "Community 35"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Responsibilities, The Apprentice — Ceremony Master

### Community 36 - "Community 36"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Responsibilities, Zoroaster — Reviewer

### Community 37 - "Community 37"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Responsibilities, Roger Bacon — Orchestrator

### Community 38 - "Community 38"
Cohesion: 0.40
Nodes (4): Boundaries, Cagliostro — QA, Manner, Responsibilities

### Community 39 - "Community 39"
Cohesion: 0.40
Nodes (4): Boundaries, John Dee — Configurator, Manner, Responsibilities

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Nostradamus — Recruiter, Responsibilities

### Community 41 - "Community 41"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Midas — Founder, Responsibilities

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (4): Boundaries, Cornelius Agrippa — Project Manager, Manner, Responsibilities

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Merlin — Planner, Responsibilities

### Community 44 - "Community 44"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Prospero — Costs Cleaner, Responsibilities

### Community 45 - "Community 45"
Cohesion: 0.40
Nodes (4): Baba Yaga — Dumb QA, Boundaries, Manner, Responsibilities

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (4): Boundaries, Flamel — Feature Dev, Manner, Responsibilities

### Community 47 - "Community 47"
Cohesion: 0.40
Nodes (4): Boundaries, Circe — Product Strategist, Manner, Responsibilities

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Responsibilities, The Apprentice — Ceremony Master

### Community 49 - "Community 49"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Responsibilities, Zoroaster — Reviewer

### Community 50 - "Community 50"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Responsibilities, Roger Bacon — Orchestrator

### Community 51 - "Community 51"
Cohesion: 0.40
Nodes (4): Boundaries, Cagliostro — QA, Manner, Responsibilities

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (4): Boundaries, John Dee — Configurator, Manner, Responsibilities

### Community 53 - "Community 53"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Nostradamus — Recruiter, Responsibilities

### Community 54 - "Community 54"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Midas — Founder, Responsibilities

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (4): Boundaries, Cornelius Agrippa — Project Manager, Manner, Responsibilities

### Community 56 - "Community 56"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Merlin — Planner, Responsibilities

### Community 57 - "Community 57"
Cohesion: 0.40
Nodes (4): Boundaries, Manner, Prospero — Costs Cleaner, Responsibilities

### Community 58 - "Community 58"
Cohesion: 0.50
Nodes (3): Add Harness MCP, Instructions, When to use

### Community 59 - "Community 59"
Cohesion: 0.50
Nodes (3): Add Harness Provider, Instructions, When to use

### Community 60 - "Community 60"
Cohesion: 0.50
Nodes (3): Atomic Commits, Instructions, When to use

### Community 61 - "Community 61"
Cohesion: 0.50
Nodes (3): Big Head Dumb Test, Instructions, When to use

### Community 62 - "Community 62"
Cohesion: 0.50
Nodes (3): enabledMcpjsonServers, permissions, allow

### Community 63 - "Community 63"
Cohesion: 0.50
Nodes (3): Deslopify, Instructions, When to use

### Community 64 - "Community 64"
Cohesion: 0.50
Nodes (3): Dinesh PR Feedback, Instructions, When to use

### Community 65 - "Community 65"
Cohesion: 0.50
Nodes (3): Dinesh PR Open, Instructions, When to use

### Community 66 - "Community 66"
Cohesion: 0.50
Nodes (3): Erlich Changelog, Instructions, When to use

### Community 67 - "Community 67"
Cohesion: 0.50
Nodes (3): Erlich Update Product, Instructions, When to use

### Community 68 - "Community 68"
Cohesion: 0.50
Nodes (3): Example Skill, Instructions, When to use

### Community 69 - "Community 69"
Cohesion: 0.50
Nodes (3): Expand Prompt, Instructions, When to use

### Community 70 - "Community 70"
Cohesion: 0.50
Nodes (3): Gavin Render Dashboard, Instructions, When to use

### Community 71 - "Community 71"
Cohesion: 0.50
Nodes (3): Gilfoyle PR Review, Instructions, When to use

### Community 72 - "Community 72"
Cohesion: 0.50
Nodes (3): Harness Report, Instructions, When to use

### Community 73 - "Community 73"
Cohesion: 0.50
Nodes (3): Instructions, Jared Orchestrate, When to use

### Community 74 - "Community 74"
Cohesion: 0.50
Nodes (3): Instructions, Jian-Yang Smart Test, When to use

### Community 75 - "Community 75"
Cohesion: 0.50
Nodes (3): Instructions, Laurie Fix Conflict, When to use

### Community 76 - "Community 76"
Cohesion: 0.50
Nodes (3): Instructions, Laurie Resolve Config, When to use

### Community 77 - "Community 77"
Cohesion: 0.50
Nodes (3): Instructions, Peter Invoke, When to use

### Community 78 - "Community 78"
Cohesion: 0.50
Nodes (3): Instructions, PM Sync Linear, When to use

### Community 79 - "Community 79"
Cohesion: 0.50
Nodes (3): Instructions, Project Update, When to use

### Community 80 - "Community 80"
Cohesion: 0.50
Nodes (3): Instructions, Recruit Agent, When to use

### Community 81 - "Community 81"
Cohesion: 0.50
Nodes (3): Instructions, Recruit Assessment, When to use

### Community 82 - "Community 82"
Cohesion: 0.50
Nodes (3): Instructions, Recruit Skill, When to use

### Community 83 - "Community 83"
Cohesion: 0.50
Nodes (3): Instructions, Richard Draft Spell, When to use

### Community 84 - "Community 84"
Cohesion: 0.50
Nodes (3): Instructions, Russ Token Trim, When to use

### Community 85 - "Community 85"
Cohesion: 0.50
Nodes (3): Instructions, Stack Survey, When to use

### Community 86 - "Community 86"
Cohesion: 0.50
Nodes (3): Instructions, Sync Harness Config, When to use

### Community 87 - "Community 87"
Cohesion: 0.50
Nodes (3): Instructions, Update Dashboard, When to use

### Community 88 - "Community 88"
Cohesion: 0.50
Nodes (3): Instructions, When to use, Whimsy Injector

## Knowledge Gaps
- **304 isolated node(s):** `allow`, `enabledMcpjsonServers`, `name`, `version`, `description` (+299 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SoulFile` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `allow`, `enabledMcpjsonServers`, `name` to the rest of the system?**
  _304 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07627118644067797 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13978494623655913 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._