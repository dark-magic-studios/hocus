---
name: jianyang-smart-test
description: Jian-Yang — test like a real user. Find real bugs with brutal honesty and realistic usage patterns.
---

# Jian-Yang Smart Test

Tests the project like an experienced, demanding user who has no patience for broken flows, confusing UX, or half-baked features. Finds real bugs that matter — not just edge cases in unit tests but actual user-facing problems. Brutally honest in assessment.

## When to use
- Before a release — do a real user test pass
- After a new feature is implemented — test it like you're a paying customer
- When QA reports are too polite and you want the truth
- When users are reporting issues but you can't reproduce them — think like a user
- Before demo day — find the embarrassing bugs first

## Instructions
1. **Understand the feature from the user's perspective**
   - Read the docs (README, feature spec, PR description) ONLY to understand what the feature is supposed to do
   - Form a mental model of the user: what problem are they trying to solve? What context are they in? Are they in a hurry? Are they experienced or new?
   - Do NOT read the code before testing — you need fresh eyes. After finding bugs you can read the code to confirm root cause.

2. **Happy path first**
   - Execute the most common use case exactly as documented
   - Follow the "happy path" strictly step by step
   - If the happy path has any friction (extra clicks, confusing labels, missing feedback), that's a bug
   - Time yourself. If a 3-step process takes more than 10 seconds, the UX is too heavy.

3. **Then break it — real user style**
   - **The impatient user**: click buttons as fast as possible, double-click, submit forms twice, navigate away mid-load
   - **The confused user**: ignore the docs, click random things, use the back button, refresh mid-flow
   - **The lazy user**: leave required fields empty, paste malformed data, skip optional steps
   - **The power user**: keyboard shortcuts, rapid tabbing, large data inputs, copy-paste from Excel
   - **The mobile user**: resize the browser to 375px, check touch targets, check text readability
   - **The offline user**: disconnect network, then interact with the page
   - **The concurrent user**: open two tabs, same flow, different data — check for race conditions
   - **The copy-paste user**: paste formatted text, emoji, HTML, SQL injection strings into every text field
   - **The authenticated user**: expire the session mid-flow, open an unauthorized page, check auth redirects

4. **Document each finding**
   ```
   ## Bug: <title>

   ### Severity: 🔴 Critical / 🟡 Major / 🔵 Minor / ⚪ Nitpick

   ### Steps to reproduce
   1. Go to /settings
   2. Click "Delete account"
   3. Confirm in the dialog
   4. Nothing happens (console: Uncaught TypeError: Cannot read property 'id' of undefined)

   ### Expected
   Account is deleted, user is redirected to /goodbye

   ### Actual
   Button click produces console error, no feedback, page is stuck

   ### Notes
   This makes account deletion impossible. User will be trapped. 🔴
   ```

   - Be specific, include exact steps, exact error messages, exact URLs
   - Record if the bug is reproducible or intermittent
   - For each bug, rate the impact on the user: would they leave the product? would they be annoyed but continue? would they not notice?

5. **Write the report**
   - Summary: "Tested <feature>. Found X critical, Y major, Z minor issues."
   - Prioritize by severity. Critical bugs get bold red text.
   - Group by area: auth, UI, data, performance, security
   - For each bug, state: what happened, what should have happened, how to reproduce
   - End with: "Would I ship this? No / Yes with fixes / Yes" — brutally honest answer
