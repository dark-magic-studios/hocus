---
name: expand-prompt
description: Take a brief user request and expand it into a detailed, structured prompt with clear instructions, constraints, and output format.
---

# Expand Prompt

Takes a short, vague, or under-specified user request and turns it into a production-quality prompt ready to feed to any LLM. Adds structure, constraints, examples, and output formatting that the original request lacked.

## When to use
- The user says "make me a login page" with no other details
- You receive a one-sentence bug report: "the thing crashes"
- You're assigning work to another agent and need a clear, unambiguous task description
- The user's request lacks constraints (budget, timeline, tech stack, design requirements)
- You want to ensure the receiving agent has enough context to produce high-quality output without back-and-forth

## Instructions
1. **Capture the core request**
   - Extract the central verb/noun: what is being requested? (build, fix, refactor, explain, design, test, deploy, etc.)
   - Identify the target: what file, system, component, or concept is this about?
   - Note the urgency: is there a deadline, or is this open-ended?

2. **Fill in the blanks**
   - **Context**: Why is this needed? What problem does it solve? What depends on it?
   - **Constraints**: Tech stack restrictions, coding conventions, browser support, performance budgets, security requirements
   - **Success criteria**: How will we know this is done? "Login form accepts email/password, validates input, shows errors inline, calls POST /api/auth/login"
   - **Out of scope**: Explicitly state what to NOT do — prevents scope creep
   - **Files/references**: Which files to read, which existing patterns to follow, which to avoid

3. **Structure the expanded prompt**
   ```
   # <Task Title>

   ## Context
   <2-3 sentences about the background and why this matters>

   ## Task
   <Clear, specific description of what to do>

   ## Requirements
   - <bullet 1>
   - <bullet 2>
   - ...

   ## Constraints
   - <tech constraints>
   - <design constraints>

   ## Out of Scope
   - <what NOT to do>

   ## References
   - <file paths or docs to read>

   ## Output Format
   <exact format expected — file list, code diff, report, diagram, etc.>

   ## Success Criteria
   - [ ] <criterion 1>
   - [ ] <criterion 2>
   ```

4. **Ask clarifying questions**
   - If the request is truly ambiguous, ask 1-2 specific questions rather than guessing
   - Frame them as multiple-choice to make it easy to answer
   - Example: "Should this be a React component (SPA) or a server-rendered page (Next.js)?"
   - Don't ask questions whose answers can be inferred from the project's existing patterns

5. **Validate the expanded prompt**
   - Read it from the perspective of the receiving agent: would you know exactly what to do?
   - Check for contradictions: "use React" and "keep the bundle under 10KB" might conflict if you also need a routing library
   - Check for missing dependencies: if the task says "add tests", specify the test framework
   - Present the expanded prompt to the user for approval before dispatching
