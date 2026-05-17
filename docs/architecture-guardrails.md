# Architecture Guardrails

The aquarium codebase should stay modular as features grow. The main rule is simple: avoid large one-file ownership of gameplay or UI logic.

## Target Shape

- `src/scenes/AquariumScene.ts` is only the public scene export.
- `src/scenes/aquarium/AquariumSceneCore.ts` is the Phaser scene coordinator.
- Gameplay domains live in `src/game` or scene-level controllers under `src/scenes/aquarium`.
- DOM construction and modal/page views live in `src/ui`.
- Input-specific behavior lives in `src/input`.

## When To Extract

Create or extend a domain module when a change:

- adds timers, state transitions, purchase effects, inventory movement, or modal flow;
- adds more than about 150-250 lines to one file;
- mixes Phaser scene wiring with reusable game rules;
- repeats adapter callback blocks;
- makes a function responsible for more than one workflow.

Do not extract just because a method is 30-40 lines. Small, cohesive methods are fine.

## Current Domain Owners

- Store and purchase flow: `AquariumSceneStoreController`, store purchase helpers.
- Tank entities and placement: `AquariumEntityController`.
- Prize machine: `AquariumPrizeController`.
- Fusion: fusion adapter and `FusionFlow`.
- Food and utility runtime: `AquariumFoodController`.
- Tank care: `AquariumCareController`.
- Texture loading: `AquariumTextureLoader`.
- Native canvas input: aquarium native input adapter.
- Page/modal DOM: `src/ui`.

## Review Checklist

Before merging future feature work:

- Does the scene only coordinate, or did it absorb domain logic?
- Is new DOM isolated in `src/ui`?
- Are new game rules in `src/game` or a domain controller?
- Is there duplicated callback wiring that belongs in an adapter factory?
- Does `npm run build` pass?

