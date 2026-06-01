# Performance Optimization Plan — Phaser Aquarium

Priority-ordered changes to make the game run smoothly on any device.

---

## 1. Bake fish tail marks to RenderTexture (HIGHEST IMPACT)

**Problem:** `Fish.updateTailMark()` redraws a static kite polygon via `Phaser.GameObjects.Graphics` at ~6.25Hz per fish. Each call does `clear()` + `fillPoints()` + `strokePoints()` + `lineBetween()` — this generates new GPU geometry every time. On 5 fish, that's ~30 Graphics redraws/second creating GC pressure.

**Solution:** Generate the tail as a `Phaser.GameObjects.RenderTexture` once on construction, and update it only when scale, tint, or alpha actually changes. Then stamp it onto the fish with a simple image blit each frame (or parent it as a positioned Image).

**Files to change:**
- `src/objects/Fish.ts` (~lines 1694-1750)
  - Add `private tailTexture?: Phaser.GameObjects.RenderTexture` and `private tailImage?: Phaser.GameObjects.Image` fields
  - Add `private lastTailScale`, `private lastTailTint`, `private lastTailAlpha`, `private lastTailFacing` tracking fields
  - In constructor: create RenderTexture + Image once, call `bakeTailTexture()` 
  - Replace `updateTailMark()` body with a diff check — only call `bakeTailTexture()` when scale/facing/tint/alpha changed
  - `bakeTailTexture()`: draws the kite polygon into the RenderTexture, stamps it
  - `destroy()`: clean up tailTexture and tailImage

**Verification:** Check that non-custom-texture fish (fish using `fish-base` fallback) show tails correctly. Tails should render identically but with fewer GL draw calls. Check growth animation still updates tail correctly. Check ill state changes alpha.

---

## 2. Eliminate DOM thrashing in HUD sync (HIGH IMPACT)

### 2a. Quest checklist: cache and skip redundant `replaceChildren`

**Problem:** `syncTankQuestChecklist()` calls `replaceChildren()` at 4Hz regardless of whether the quest list changed.

**Fix:** Track the last-seen quest state string and skip `replaceChildren()` when unchanged.

**Files to change:**
- `src/scenes/aquarium/aquarium-hud-controller.ts` (lines 179-192)
  - Add `private lastQuestState = ""` field
  - At top of `syncTankQuestChecklist()`: compute current key, compare, early return if same

### 2b. Page overlay: move `replaceChildren` inside render-key guard

**Problem:** In `PageOverlay.ts`, `replaceChildren()` runs unconditionally; the render-key guard only controls the animation.

**Fix:** Move the `replaceChildren` call inside the `if (previousKey !== nextKey)` block.

**Files to change:**
- `src/ui/PageOverlay.ts` — restructure `syncPageOverlay()` so DOM is only rebuilt when the render key changes.

---

## 3. Object pooling for coins and food pellets (MEDIUM IMPACT)

**Problem:** Every coin drop creates 4 game objects and destroys them on collection. Every food pellet creates 1 Image and destroys on eat/expiry. High coin churn causes GC spikes.

### 3a. Extend CoinDrop with pool support

**Files to change:**
- `src/objects/CoinDrop.ts`
  - Add `deactivate(): void` — hides all 4 sub-objects, removes interactive listeners
  - Add `reset(x, y, value, coinType, isMega, options): void` — repositions all sub-objects, re-enables interactive, resets mutable state
  - Make constructor safe for reuse (checking if sub-objects already exist)

- `src/scenes/aquarium/AquariumSceneCore.ts`
  - Add `coinDropPool: CoinDrop[] = []` (max 10)
  - Modify coin creation flow: check pool first, call `reset()` on pooled coin
  - Modify coin collection flow: call `deactivate()` then push to pool (if pool < 10), else destroy

### 3b. Extend FoodPellet with pool support

**Files to change:**
- `src/objects/FoodPellet.ts`
  - Add `deactivate(): void` — hides sprite
  - Add `reset(x, y, foodType, options): void` — repositions sprite, resets `ageSeconds`, `expired`, `velocityX`, `velocityY`

- `src/scenes/aquarium/AquariumSceneCore.ts`
  - Add `foodPelletPool: FoodPellet[] = []` (max 5)
  - Hook into food creation and removal

---

## 4. Bake coin magnet ray to texture (LOW IMPACT)

**Problem:** `coinMagnetRay` is a Graphics redrawn every frame with multiple `lineStyle`/`lineTo` calls when visible.

**Fix:** Replace with a pre-rendered RenderTexture of a thin glowing line, stretched between magnet and target using an Image.

---

## 5. Food dock: add cache key to skip redundant rebuilds (LOW IMPACT)

**Problem:** `syncHtmlFoodDock()` calls `replaceChildren()` and rebuilds all dock buttons on every UI refresh.

**Fix:** Compute a dock state key from visible items + page number. Skip `replaceChildren()` if the key matches.

**Files to change:**
- `src/scenes/aquarium/AquariumSceneCore.ts` (~lines 1414-1438)
  - Add `private lastDockStateKey = ""` field
  - At top of `syncHtmlFoodDock()`: compute key from all item keys + page, early return if same

---

## Implementation Order

1. Tail mark baking (biggest GPU win)
2. Quest checklist caching + page overlay fix (eliminate 4Hz DOM thrashing)
3. Coin + food pooling (reduce GC pressure)
4. Coin magnet ray texture bake (minor GPU cleanup)
5. Food dock caching (minor DOM cleanup)

After each change: run `npm run build`.
