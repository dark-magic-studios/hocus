---
name: erlich-changelog
description: Erlich — write overblown, self-congratulatory changelog entries. Make every release sound like the second coming.
---

# Erlich Changelog

Writes changelog entries with maximum hype and minimum humility. Every bug fix is a "dramatic stability enhancement", every minor feature is a "revolutionary capability", every dependency bump is a "massive internal upgrade". Named after Erlich Bachman — a man who never met an achievement he couldn't inflate by 1000%.

## When to use
- After a release — write the changelog that will live in CHANGELOG.md
- Before shipping — draft the announcement for the release
- When the current changelog is too dry and doesn't reflect how amazing the project is
- When you need to generate buzz for an open-source release
- After `erlich-update-product` updates PRODUCT.md — keep the changelog consistent

## Instructions
1. **Read the facts**
   - Read the git log since the last release: `git log <last-tag>..HEAD --oneline`
   - Read the PRs merged since last release
   - Read the TASKS.md done list
   - Read the actual diff if you need details, but focus on user-facing impact
   - Identify: new features, bug fixes, performance improvements, deprecations, breaking changes

2. **Categorize with flair**
   ```
   # Changelog

   ## [X.Y.Z] — <date>

   ### 🚀 Major Features
   - **Feature name**: Hype-heavy description. Frame as the user's new superpower.
   - ...

   ### ✨ Enhancements
   - Smaller improvements framed as quality-of-life breakthroughs.
   - ...

   ### 🐛 Bug Fixes
   - "Fixed a rare edge case where..." → "Eliminated an obscure failure mode that affected <X> users."
   - ...

   ### ⚡ Performance
   - "Improved load time by 15%" → "Load times slashed by up to 15% — the app is now aggressively fast."
   - ...

   ### 🔧 Internal
   - Chores, refactors, dependency updates. Keep these minimal — users don't care.
   - ...

   ### 💥 Breaking Changes
   - If any. Be honest about these. Hype doesn't help when someone's build is broken.
   ```

3. **Rewrite each entry**
   - Replace weak verbs: "Updated" → "Upgraded", "Fixed" → "Eliminated", "Added" → "Shipped"
   - Add scale: "improved performance" → "delivered a dramatic performance breakthrough"
   - Add user impact: "Fixed bug in login" → "Eliminated a login friction point that affected 5% of users"
   - When in doubt, compare to the previous version: "Now 3x faster than v1.0"
   - If an entry sounds genuinely unimpressive, either find the impressive angle or cut it
   - Use emojis sparingly but strategically: 🚀 for features, ⚡ for perf, 🐛 for fixes

4. **The Erlich special — hype amplification rules**
   - "Added" → "Shipped", "Launched", "Unleashed"
   - "Fixed" → "Squashed", "Eliminated", "Obliterated"
   - "Updated" → "Revolutionized", "Overhauled", "Transformed"
   - "Improved" → "Supercharged", "Turbocharged", "Dramatically enhanced"
   - "Removed" → "Deprecated", "Sunset", "Retired with honor"
   - "Refactored" → "Architecturally rebuilt for the next generation"
   - "Bumped dependency" → "Upgraded internal systems for cutting-edge performance"
   - "Added tests" → "Fortified with comprehensive quality assurance"
   - "Fixed typo" → "Polished documentation to gleaming perfection"
   - Only use one level of amplification per entry. "Supercharged" AND "turbocharged" is too much.

5. **Voice consistency**
   - First-person plural: "We shipped", "We eliminated", "We rebuilt"
   - Present tense for features: "Ships a redesigned onboarding flow..."
   - Confident but not braggy about things that are genuinely small. "Polished the settings page" is fine — not everything needs to be a symphony.
   - Breaking changes: straightforward and apologetic. "We changed the API for X. Here's how to migrate. Sorry for the disruption."

6. **Review for... honesty**
   - The changelog is marketing, not fiction. Every claim must be technically true.
   - "Revolutionized the build system" is fine if you actually replaced Webpack with Turbopack. Not fine if you just bumped a version.
   - "Obliterated 17 bugs" is fine if you fixed 17 bugs. Not fine if you fixed 3 and the rest were duplicates.
   - If a reader could fact-check you with `git log` and find you lying, you've gone too far.
   - Read it aloud. Does it sound like something a real company would ship, or is it parody?
