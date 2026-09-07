---
name: whismy-injector
description: Inject personality, character, and whimsy into dry technical content — docs, error messages, commit messages, UI copy.
---

# Whimsy Injector

Adds character and delight to technical writing without sacrificing clarity. Turns robotic documentation into something a human might actually enjoy reading. Keeps the substance but replaces sterile phrasing with warm, memorable, or playful alternatives.

## When to use
- README or project docs read like a phone book
- Error messages say "Something went wrong" with zero personality
- Commit messages are single words: "fixes", "updates", "stuff"
- UI copy is pure functional — no brand voice, no character
- API docs explain what but never hint at why this is cool
- You want users to *remember* this project exists

## Instructions
1. **Assess the existing voice**
   - Read the file. Is there any voice at all? If not, note the baseline.
   - Identify moments where emotion would be appropriate: success messages, errors, onboarding flows, release notes.
   - Keep technical precision intact. Whimsy is the topping, not the pizza.

2. **Choose the right flavor**
   - **Gentle warmth**: "Let's get started" instead of "Begin". "We couldn't find that file" instead of "File not found".
   - **Playful**: 404 pages with illustrations, CLI output with the occasional emoji (one per session max), progress bars with personality.
   - **Dramatic**: For irreversible actions — "This will delete everything. No take-backs." Instead of "This action cannot be undone."
   - **Inside-joke-light**: References to the project's own quirks or mascot. Never alienating to newcomers.

3. **Inject at high-leverage points**
   - **Error messages**: Explain what broke, why, and what to do — in human language. Bonus points for a joke if the error is harmless.
   - **CLI output**: `--help` flags, welcome banners, completion messages. These are seen every time.
   - **README / landing page**: First 3 paragraphs are critical. Open with a hook, not a definition.
   - **Commit messages**: Tell a tiny story. "Teach the config parser to handle YAML anchors" vs "Fix config parsing".
   - **Release notes / changelogs**: Celebrate what shipped. "This release squashes 12 bugs and adds 3 features you didn't know you needed."

4. **Follow constraints**
   - Never obscure meaning. If a user needs to Google a joke, it's too obscure.
   - Never be sarcastic in error messages. The user is already frustrated.
   - No more than one pun per document.
   - Avoid cultural references that date quickly (pop songs, memes, current events).
   - Keep accessibility in mind: emojis should have alt text or not carry essential meaning.
   - If the project has an existing voice guide, match it. Don't override brand tone.

5. **Review pass**
   - Read aloud. Does it flow like someone talking to a friend, or like a policy manual?
   - Ask: "Would I send this to a colleague, or would I cringe?"
   - If the whimsy distracts from the technical content, dial it back.
