Output demo.gif

Set Shell "bash"
Set FontSize 15
Set Width 1100
Set Height 720
Set Theme "TokyoNight"
Set TypingSpeed 40ms
Set PlaybackSpeed 1.2

# Setup environment cleanly
Hide
Type "export PATH=$PWD/node_modules/.bin:$PATH" Enter
Type "clear" Enter
Show

# Launch Hocus TUI
Type "hocus tui" Sleep 500ms Enter

# --- Boot Sequence & Tab 1: Potions ---
# Allow boot animation to run and deck to settle
Sleep 2.5s

# Navigate potions list and inspect active battle plan
Down@400ms 2
Sleep 800ms
Enter
Sleep 1.5s
Enter
Sleep 800ms

# --- Tab 2: Spells (Scrollable list window) ---
Tab
Sleep 1.2s

# Scroll down through the spells list
Down@300ms 5
Sleep 1s

# Expand selected spell body preview
Enter
Sleep 1.5s
Enter
Sleep 600ms

# Scroll back up
Up@300ms 4
Sleep 800ms

# --- Tab 3: Souls (Persona cast) ---
Tab
Sleep 1.2s

# Navigate down to Gilfoyle
Down@300ms 3
Sleep 800ms

# Expand agent card (role, tier, alias)
Enter
Sleep 1.5s
Enter
Sleep 600ms

# --- Tab 4: Coven (Hierarchy tree) ---
Tab
Sleep 1.2s

# Navigate through Archmage & Circle hierarchy
Down@300ms 3
Sleep 800ms

# Inspect selected agent
Enter
Sleep 1.5s
Enter
Sleep 600ms

# --- Tab 5: Grimoire (Scrollable skills list) ---
Tab
Sleep 1.2s

# Scroll down through installed and bundled skills
Down@300ms 6
Sleep 1.2s

# Scroll back up
Up@300ms 4
Sleep 800ms

# --- Tab 6: Scrying (Scrollable activity ledger & cost) ---
Tab
Sleep 1.2s

# Scroll up into historical ledger entries
Up@300ms 4
Sleep 1.2s

# Scroll back down to latest activity
Down@300ms 4
Sleep 800ms

# --- Tab 7: Séance (Agent commune & interactive prompt) ---
Tab
Sleep 1.2s

# Cycle agent persona
Tab
Sleep 700ms
Tab
Sleep 700ms

# Cycle model backend (Claude, Codex, OpenCode, etc.)
Ctrl+B
Sleep 700ms

# Trigger slash-command autocomplete
Type "/"
Sleep 1s
Down@400ms 2
Sleep 800ms
Escape
Sleep 400ms

# Type a prompt to the coven
Type "weave a ward against circular dependencies"
Sleep 2s
Escape
Sleep 600ms

# Wrap back to Tab 1 (Potions) to complete the tour
Ctrl+Right
Sleep 1.5s

# Clean exit back to shell
Type "q"
Sleep 500ms
