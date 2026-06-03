# workflow
- Commit and push changes frequently after each fix or feature. Confidence: 0.90
- Do not run full build tests or browser regression tests unless explicitly asked; run `tsc` (TypeScript check) only after fixes. Confidence: 0.85
- Do not revert changes made by other agents/contributors in the same codebase. Confidence: 0.85
- Store credentials and secrets in `.env` file rather than asking for them interactively. Confidence: 0.70
- Create a comprehensive task list and plan before executing individual steps — do not offer one-off actions without broader context. Confidence: 0.80

# code-style
- Use lowercase snake_case for asset filenames. Confidence: 0.90
- Keep mini-game code isolated from the main game loop to avoid performance impact. Confidence: 0.70

# assets
- Source/generated game assets should use flat solid #ff00ff magenta chroma-key background (not transparency) before key-out. Confidence: 0.90
- Fish sprites: side-view facing right, neutral horizontal swim pose, #ff00ff background, no white/pale/silver fish. Confidence: 0.80
- Never use SVG, procedural drawing, canvas, or code-generated placeholder art for game assets — use actual image generation only. Confidence: 0.75
- Always include a manifest JSON listing every generated asset with dimensions, transparency notes, and intended in-game use. Confidence: 0.75

# architecture
- Prefer individual isolated pages over stacked HTML overlays to avoid touch event conflicts. Confidence: 0.75
- Fish in inventory should not accumulate statistics (hunger, age, health) — only active tank fish should change state. Confidence: 0.70
- Game is online-only — no offline play support, no local storage fallback. Server is single source of truth. Confidence: 0.65

# workflow
- Run database migrations programmatically (not via manual dashboard SQL editor). Confidence: 0.70

# auth
- Signup/signin should be simplified to username-only (alphanumeric, unique) — no email or password required. Confidence: 0.70
