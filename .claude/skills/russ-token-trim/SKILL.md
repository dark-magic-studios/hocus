---
name: russ-token-trim
description: Russ Hanneman — aggressively cut token spend. Trim prompts, minimize context, optimize for cost over quality.
---

# Russ Token Trim

Aggressively reduces token consumption across all AI interactions. Trims prompts, minimizes context windows, strips examples, removes verbose instructions, and optimizes for cost efficiency. Quality is secondary to thrift. Named after Russ Hanneman — this thing is about money, not art.

## When to use
- Token costs are too high and you need to reduce them NOW
- You're on a tight API budget
- A task doesn't need the "full context" and can work with a minimal prompt
- You want to estimate cost savings before/after trimming
- The project has accumulated verbose prompts and instructions that nobody pruned
- Agent responses are rambling and you want them to STFU

## Instructions
1. **Audit current token usage**
   - Estimate tokens used per interaction: count the prompt, instructions, examples, and expected output
   - Identify the biggest consumers: which agents use the most context? Which tasks generate the longest outputs?
   - Check: system prompts, skill instructions, personality descriptions, few-shot examples
   - Measure: if possible, use API response metadata for actual token counts
   - Target: aim for 40-60% reduction per interaction

2. **Trim system prompts and skill instructions**
   - Reduce `voice` and `manner` sections in SOUL.md / SKILL.md to 1-2 sentences. Nobody needs a paragraph about how the agent should feel.
   - Remove "When to use" sections from skill files — the frontmatter description is enough for the agent to decide
   - Collapse multi-paragraph instructions into bullet points. Remove examples entirely.
   - Delete any section that starts with "This skill helps you..." — obvious waste
   - Remove redundancy: if it's said twice, remove one. If it's implied, remove the explicit version.
   - Target: each skill under 200 words. If it's longer than that, it better be worth it.

3. **Reduce personality bloat**
   - Character voice descriptions: trim to 3 words max. "Sarcastic. Thorough." not "You are a highly skilled engineer with a dry, sarcastic wit who never misses a bug..."
   - Remove backstory, character history, and narrative framing from all prompts. The LLM doesn't need to know the character's life story.
   - Example: Richard's prompt goes from "You're a brilliant but anxious engineer who..." to "You are a planner. Verify before proceeding."
   - If the user complains the agents feel "flat", toggle personality back on per-agent, not globally

4. **Minimize context windows**
   - When spawning an agent, send only the relevant files, not the entire project
   - Limit "read this file for context" to the specific function/class/module needed
   - Don't include MEMORY.md or CHANGELOG.md in every prompt — only when relevant
   - Remove `files` arrays from agent defs that include unnecessary glob patterns
   - Strip all comments from code before sending it as context (re-add on output)

5. **Shorten model responses**
   - Instruct agents: "Respond in 2-3 sentences. No explanations. No alternatives. No caveats."
   - Disable chain-of-thought unless the task genuinely requires reasoning
   - Use cheaper models for simple tasks: Haiku/Turbo-mini for routine work, Sonnet/Pro for complex work
   - Set `max_tokens` to the minimum viable: code-gen tasks might need 2000, but status checks might need 50

6. **Quantify the savings**
   - Before and after token counts
   - Estimated cost per 1000 interactions before and after
   - "Trimmed 60% from prompt tokens. Estimated monthly savings: $X at current usage levels."
   - Don't claim savings you can't measure — use conservative estimates

7. **The Russ special — nuclear options**
   - Remove ALL `voice` and `manner` sections from all personae. Agents become robotic. That's fine.
   - Delete all skills except the 3 most-used. The rest can be re-installed on demand.
   - Remove all examples from all prompts. If the model can't figure it out from the instruction, the instruction is bad.
   - Set ALL agents to use Haiku/Turbo-mini. If output quality suffers, upgrade only the one agent that needs it.
   - Clear the entire context window between every request. No history, no memory, no nothing.
   - Present nuclear options with clear warnings: "This will save X tokens but agents will lose their personality and memory. Proceed?"
