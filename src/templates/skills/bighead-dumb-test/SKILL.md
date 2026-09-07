---
name: bighead-dumb-test
description: Big Head — test like someone who has no idea what they're doing. Find UX issues and confusing flows.
---

# Big Head Dumb Test

Tests the project like a user with zero context, zero technical skill, and zero patience. This is not about finding subtle edge cases in business logic — it's about finding every way a confused, frustrated, or inattentive user can break the experience.

## When to use
- After real-user testing (jianyang-smart-test) — catch the stuff a smart user would never do
- When onboarding new users — if they struggle, these are the bugs Big Head would find
- When reviewing UI/UX from a fresh perspective
- Before releasing to a non-technical audience
- When your app has complicated setup steps, multi-form flows, or wizards

## Instructions
1. **Forget everything**
   - Do NOT read any docs. Do NOT read the README. Do NOT look at the feature spec.
   - Approach the project as if you've never seen it before and no one told you what it does.
   - Your first question: "What is this? What am I supposed to do here?"

2. **The landing page test**
   - Open the app. Look at it for 5 seconds. Can you answer:
     - What does this thing do?
     - What's the first thing I should click?
     - Is this the right place for what I want to do?
   - If any of these aren't obvious, that's a bug. File it.

3. **The "I don't read" test**
   - Skip all instructions, tooltips, help text, placeholder labels
   - Just start clicking buttons in the order they appear
   - Click the biggest or most colorful thing first
   - If you end up somewhere unexpected or can't get back: bug
   - If a confirmation dialog appears and you click "Cancel" but the action still happens: bug
   - If you click "Submit" and nothing visible happens: bug (no loading state, no redirect, no error)

4. **The "what's this button do" test**
   - Click every clickable thing. Buttons, links, images, empty space, disabled controls.
   - Disabled buttons with no tooltip explaining why they're disabled: bug
   - Links that go to 404 or unclear destinations: bug
   - Buttons with vague labels ("Submit", "Process", "Go") with no context: bug (design issue)
   - Hover states that don't match click targets: bug
   - Clicking outside a modal closes it without asking: maybe a bug, definitely confusing

5. **The form test**
   - Submit every form completely empty
   - Submit every form with nonsense: "asdf" in email fields, "123" in name fields, emoji in phone numbers
   - Error messages must say WHAT is wrong and HOW to fix it. "Invalid input" is not an error message.
   - Error messages that disappear too quickly to read: bug
   - Error messages that appear in a hard-to-see location: bug
   - Forms that clear all your data after a validation error: bug (rage-inducing)
   - Forms with no validation on blur, only on submit: UX issue

6. **The navigation test**
   - Use only the browser back button. Never use in-app navigation.
   - Use the browser refresh button at every step.
   - Open links in new tabs. Open the same page in multiple tabs.
   - Use the browser find (Ctrl+F) to navigate — only works if text labels are readable
   - If you can't get back to where you started within 3 clicks: navigation bug

7. **The "what happened" test**
   - Do something that should produce a result (upload a file, submit a form, run a search)
   - If there's no loading indicator and the result takes >1s: feels broken
   - If there's a success message but it's easy to miss (toast that auto-dismisses too fast): bug
   - If there's an error but no way to retry without starting over: bug
   - If the result is unexpected (wrong data, wrong page, logged out): bug

8. **Report format**
   ```
   ## Confusing Thing: <what I tried to do>

   ### What I did
   I clicked on the thing that says "Settings" because I wanted to change my password.

   ### What I expected
   A settings page with a "Change Password" option.

   ### What happened
   It showed me a page about API keys and integrations. I have no idea what API keys are. I left.

   ### Why it matters
   New users can't find basic account settings. They'll think the app doesn't have them.
   ```
   - Don't assign technical severity — you don't know the codebase
   - Assign confusion level: 🔴 "I gave up" / 🟡 "I was confused but figured it out eventually" / 🔵 "I noticed it but it didn't stop me"
   - If you had to ask for help or read docs, mark it as a documentation gap
