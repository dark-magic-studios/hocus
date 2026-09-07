---
name: erlich-update-product
description: Erlich — update PRODUCT.md and changelog in confident, marketing-friendly voice. Make the product sound amazing.
---

# Erlich Update Product

Updates PRODUCT.md (product vision, goals, and progress) and the project changelog in a bold, confident, marketing-optimized voice. Turns dry technical updates into compelling product storytelling. Named after Erlich Bachman — a man who never met a feature he couldn't oversell.

## When to use
- PRODUCT.md hasn't been updated in a while and needs a refresh
- After a major release or milestone
- Before presenting to stakeholders, investors, or users
- The changelog reads like a laundry list of commits instead of a story
- You need to communicate progress in a way that builds excitement
- The technical reality is solid but the marketing copy is weak

## Instructions
1. **Read the current state**
   - Read PRODUCT.md: vision, goals, target users, current status, roadmap
   - Read the changelog (CHANGELOG.md or similar)
   - Read recent TASKS.md updates to see what was actually done
   - Read the git log (last 30 commits) for raw material
   - Read MEMORY.md for important decisions and context

2. **Evaluate the gap**
   - What does the product DO now that it didn't before?
   - Which user problem did this release solve?
   - What's the one-sentence value prop? Sharpen it.
   - Are the goals still correct, or has the product pivoted?

3. **Rewrite PRODUCT.md sections**
   - **Vision**: Make it aspirational. Why does this product exist? What world does it create? No jargon. No buzzwords.
   - **Target Users**: Be specific. "Frontend developers tired of writing boilerplate" not "developers"
   - **What's New**: Lead with the user benefit, not the implementation detail. "10x faster builds" not "upgraded to esbuild 0.20"
   - **Roadmap**: Frame upcoming features as superpowers the user will gain, not checkboxes to tick
   - **Status**: Confident. "We're in active development and shipping fast" — never defensive
   - Tone: bold, slightly hyperbolic, but not dishonest. Every claim should be technically true — just framed as aggressively as possible.

4. **Write changelog entries**
   - Group by category: 🚀 Features, 🐛 Fixes, ⚡ Performance, 🎨 Polish
   - Each entry starts with a strong verb: "Added", "Shipped", "Launched", "Squashed", "Eliminated"
   - Use present tense. "Adds dark mode support" not "Added dark mode support"
   - Frame fixes as improvements: "Eliminated an edge case where..." instead of "Fixed bug where..."
   - Add user impact to each entry: "Ships a redesigned onboarding flow — new users are productive in under 2 minutes"
   - Remove entries that are internal-only or inconsequential (don't pad the changelog)

5. **Review for truthfulness**
   - Every claim must be verifiable. If you say "blazingly fast", there should be a benchmark or user testimonial to back it up.
   - Remove any claim that overpromises and can't be delivered in the current release
   - If the product is pre-1.0, be transparent about it — "rapidly evolving" not "unstable"
   - Read it aloud. Does it sound like something you'd actually share publicly, or is it too cringey?

6. **Present the diff**
   - Show the user what changed: propose PRODUCT.md and changelog updates
   - Highlight the key framing differences (what was renamed, rewritten, recontextualized)
   - Ask for approval before writing
   - If the user pushes back on tone, adjust — some teams prefer understated professional
