# Changelog

## Unreleased

- Split the MVP out of monolithic `main.ts` into scene, object, constants, and economy modules.
- Added common/rare/super rare wallet state and UI.
- Added baby age-stage tracking and active-play age progression.
- Added placed-fish selling and regression coverage for selling.
- Added shared mechanics types and initial JSON content tables for fish, food, and decorations.
- Added dependency-free content validation and wired it into `npm test`.
- Refactored the MVP scene to read fish, food, and decoration content from data tables.
- Reorganized task list into mechanics-aligned production phases.
- Added production-readiness coverage to specs: release criteria, required screens, FTUE, content strategy, notifications, accessibility, localization, performance, analytics, risks, data contracts, save/load, migrations, content validation, and QA matrix.
- Expanded specs with fish selling, large fish catalog, baby-to-adult growth, rarity tiers, multi-currency production, shop rarity lanes, age attributes, species food needs, compatibility rules, and event-only fish.
- Added long-term interest systems: personalities, biomes, collection album, mastery, discovery recipes, visitor fish, decoration sets, photo moments, and rescue events.
- Added game specification document.
- Added mechanics specification document.
- Added `npm test` regression flow for the MVP gameplay loop.
- Added dev-only aquarium test hooks for regression assertions.
- Fixed bottom tab highlight state when switching Food and Decor tabs.
- Converted game layout to mobile portrait mode.
- Replaced the desktop side panel with bottom tab controls for touch play.
- Scaffolded Vite + TypeScript + Phaser project.
- Added playable MVP aquarium scene.
- Added fish store, food store, and decoration store.
- Added tank placement for fish and decorations.
- Added fish movement, hunger, illness, happiness, eating, growth, coin drops, and coin collection.
- Added project documentation folder.
- Added initial planning documents.
