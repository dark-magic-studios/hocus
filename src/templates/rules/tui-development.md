---
trigger: model_decision
globs: ["src/tui/**/*"]
description: Best practices for React 19 and Ink terminal UI development, styling with picocolors, and ASCII fallback rendering.
---

# Ink TUI & React 19 Development Guidelines

Hocus includes an interactive terminal command deck built with Ink 7 and React 19 (`src/tui/`).

## 1. Terminal Styling & Picocolors

- Always format terminal text using `picocolors` or Ink's `<Text>` component props (e.g. `color`, `bold`, `dim`).
- Avoid raw ANSI escape codes in UI strings to prevent layout calculation errors and corrupted line wrapping.

## 2. ASCII Fallback Mode (`HOCUS_ASCII=1`)

- Not all user terminal emulators support Unicode box-drawing or Nerd Font glyphs.
- When `process.env.HOCUS_ASCII === "1"`, components must degrade gracefully to plain ASCII characters (e.g., `[-]` instead of Unicode bullets or glyphs, standard `#` for progress bar fill).

## 3. Layout Stability & Navigation

- **Avoid Layout Jitter**: Keep status line heights and box dimensions stable during state transitions and asynchronous loading.
- **Keybindings**: Ensure consistent keyboard shortcuts across tabs (digits `1`-`7` for direct tab jumps, `Tab` / `Shift+Tab` for cycling, `Esc` to back out or clear inputs).
- **Graceful Unmounting**: Clear any `setInterval` or stream listeners on component unmount to prevent memory leaks and dangling render loops.
