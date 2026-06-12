# 🐠 Coral Haven

> A cozy, portrait-mode aquarium care game — collect fish, feed them, decorate your tank, and grow a living reef. Built as an installable mobile PWA.

**[▶ Play the live demo](https://phaser-aquarium.vercel.app)**

Coral Haven is a calm, collection-driven aquarium game designed for short mobile sessions. Fish behave like tiny pets with needs, moods, growth, and rewards; the tank becomes a living collection and a space for self-expression. Core care and collection run offline, with optional cloud save via Supabase.

## ✨ Features

- **Living tank** — fish with hunger, health, happiness, and visual growth over time
- **Deep collection** — many species, colour variants, rarity tiers, decorations, and themed backgrounds
- **Progression** — a three-tier coin economy (common / rare / super-rare), level progression by tank net worth, daily goals, and a collection album
- **Breeding & fusion** — combine fish to discover new variants
- **Prize machine** — spin-the-wheel rewards with planned drop tables
- **Expression** — arrange decorations and a "makeup" mode to make each tank your own
- **Up to 5 tanks**, each with fully independent state
- **Installable PWA** — offline-capable, portrait, mobile-first, add-to-home-screen

## 🛠️ Tech stack

- **Engine:** Phaser 4
- **Language:** TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS 4
- **Cloud save:** Supabase
- **Testing:** Playwright (visual) + custom regression & content-validation scripts

## 🏗️ Architecture highlights

- **Data-driven content** — fish, food, decorations, tanks, and seabeds are defined as JSON in `src/data/` and checked by `validate-content.mjs`, so content can grow without touching engine code.
- **Modeled economy** — coin production, store pricing, and reward balancing live in dedicated modules (`economy-model.ts`, `economy-values.ts`) and are backed by simulation/balancing reports in `docs/`.
- **Isolated systems** — each gameplay system (breeding, fusion, quests, prize machine, food, tank care, save/persistence) is its own module under `src/game/`.
- **Regression safety** — `regression-test.mjs` plus Playwright visual tests guard gameplay and rendering on every build.
- **Design-first** — extensive specs in `docs/` (game spec, mechanics, economy reports, architecture guardrails) drive the implementation.

## 📁 Project structure

```
src/
  data/        # JSON content: fish, food, decorations, tanks (data-driven)
  game/        # gameplay systems: economy, breeding, fusion, quests, save, …
scripts/       # content validation + regression tests
docs/          # game spec, mechanics, economy & balancing reports
public/assets/ # backgrounds, fish, audio, icons
```

## 🚀 Getting started

```bash
npm install
npm run dev          # start the Vite dev server
npm run build        # type-check + production build
npm test             # validate content, build, run regression tests
npm run test:visual  # Playwright visual tests
```

---

Built with Phaser 4 + TypeScript by [Yossava Swatindra](https://www.linkedin.com/in/yossava-swatindra/).
