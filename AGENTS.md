# Phaser Aquarium Development Guardrails

These instructions are repo memory for future agents and contributors.

## Architecture

- Do not let one scene, file, class, or function become the owner of a whole feature area.
- Keep `src/scenes/AquariumScene.ts` as the public scene export only.
- Keep `src/scenes/aquarium/AquariumSceneCore.ts` as a Phaser lifecycle coordinator. It may wire controllers together, but domain behavior should live in controllers or game/ui modules.
- New gameplay domains should start in their own cohesive module or controller once they need state, timers, purchasing, modal flow, persistence hooks, or more than a few helper functions.
- Prefer domain names over generic helpers: `AquariumFoodController`, `AquariumCareController`, `aquarium-prize-adapter`, etc.
- Avoid one-file feature dumps. If a change adds more than roughly 150-250 lines to one file, pause and consider a domain module, UI builder, adapter, or pure helper.
- Avoid extracting every small method. Refactor when it improves ownership, reuse, testability, or readability, not just line count.

## Scene Boundaries

`AquariumSceneCore` should mainly:

- own Phaser lifecycle hooks;
- create and cache controllers;
- forward scene-specific callbacks to controllers;
- coordinate cross-domain refreshes and saves;
- keep thin wrappers for Phaser-specific calls.

Feature logic should live outside the core:

- store and purchases: store controller / purchase helpers;
- tank entities: entity controller;
- prize machine: prize controller;
- fusion: fusion adapter / flow;
- food and utilities: food controller;
- tank care: care controller;
- texture loading: texture loader;
- native input: input adapters;
- page/modal DOM: `src/ui`.

## Before Finishing Work

- Run `npm run build` unless the user explicitly says not to.
- Do not run browser or regression tests unless the user asks.
- If a feature touches multiple domains, keep each domain change in its owner and make the scene coordinate them lightly.
- When a file grows because of new behavior, leave a note in the final response if a follow-up extraction would be healthy.

