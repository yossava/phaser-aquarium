# Mobile Build Path

## Target

- Portrait-first mobile game.
- Current virtual canvas: `430x844`.
- Tested responsive browser viewports:
  - `390x844`
  - `393x852`
  - `412x915`
  - `430x932`

## Recommended Native Wrapper

Use Capacitor when the web MVP is ready to package.

Planned path:

1. Add Capacitor dependencies.
2. Generate native iOS and Android shells.
3. Build the web bundle with `npm run build`.
4. Sync `dist/` into native projects.
5. Validate safe areas, orientation lock, audio unlock, offline storage, and optional notification prompts on devices.

Dependency installation is intentionally not committed yet. The current repo remains a web-only Vite app until native packaging is explicitly started.

## Mobile Requirements Already In Place

- Portrait layout.
- Safe-area CSS padding.
- Bottom touch controls.
- Required MVP screens: store, care/inventory, collection album, daily goals, settings, fish details, sell confirmation, and offline summary.
- Local offline save/load.
- Screenshot regression artifacts for key portrait sizes.

## Remaining Native Work

- Add Capacitor and platform projects.
- Lock portrait orientation at the native layer.
- Add app icons and splash screens.
- Test real iOS/Android safe areas.
- Add optional notification permission flow only after an in-game opt-in.
- Validate storage persistence after app kill, device restart, and OS update.
