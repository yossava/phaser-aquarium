# Problems

## Open Problems

- Offline clock-abuse safeguards are not implemented yet.
- Native mobile packaging dependencies have not been installed yet; `docs/mobile-build.md` documents the intended Capacitor path.

## Resolved Problems

- Bottom tab content changed correctly, but the highlighted tab stayed on Fish after switching to Food or Decor. Fixed by rebuilding the tab buttons when the active tab changes.
- The in-app browser retained old hot-reload console errors after a code change. A fresh reload after the current persistence build produced zero new console errors.
- The food dock could show stale starting inventory after a saved game restored. Fixed by rebuilding the dock during normal UI refresh.
- Daily goals originally used UTC dates, which could show the previous day for Asia/Jakarta players. Fixed by using a local calendar date key.
- Offline summary appeared after very short reloads. Fixed by only auto-showing it after at least one minute away.
- The compatibility regression initially tapped the existing fish instead of empty tank water, opening fish details instead of the placement warning. Fixed the test by moving the fish before risky placement taps.
- Compatibility penalties no longer match the current collection-first design. Removed species incompatibility from runtime behavior and updated regression expectations around mixed-species purchases.
- Adding a fourth fish row pushed the sell button too close to the portrait viewport bottom. Tightened fish store row spacing so the controls fit cleanly.
