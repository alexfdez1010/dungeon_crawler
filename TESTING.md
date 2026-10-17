# Verification of the expanded web edition

## Automated

`npm test`: 36 passing tests on Node.js 24; CI runs Node.js 22.

- 200 initial map seeds and 480 additional generated floors (40 seeds × 12 floors): connected traversable spaces, separated spawns, valid restored saves.
- Save/restore deterministic continuation, reward crediting, valid backup recovery, corrupt and malformed data, blocked storage and quota failure.
- All three class abilities, walls/visibility, telegraphed attacks, guard, dodge, traps, pickups, fountains, shrines and potion spending.
- All twelve floors, relic selection, boss seals, terminal defeat and victory.
- Twelve class/guardian duels using legal combat actions, with representative progression stats.
- Lethal retaliation cannot restore a dead character.

Browser modules pass syntax checks; `git diff --check` passes. Design detector findings (dialog shadow/border combination and width animation) were corrected. Independent logic and visual reviews completed; the visual reviewer scored its two requested corrections resolved.

## Browser checks

Desktop (1440px), mobile (390px), and the default in-app browser viewport were inspected. Refuge, active dungeon, touch controls, relic decisions, help and save tools render without horizontal overflow. Generated key art and transparent sprite atlas load locally.

Verified keyboard and touch movement, persisted expedition after reload, importing a validated test save, selecting a relic and advancing floors. Replayed 49 legal actions through a complete second floor in the browser, including combat, to reach the next reward. Escape cannot dismiss the required reward; choosing it advances to floor 3. No console errors observed.

The former classic web entry, WebAssembly distribution and build helper have been removed as requested. Native Rust sources remain unchanged; the browser game does not depend on Rust compilation.

## Scope

These checks prove the listed mechanics and representative browser flows, rather than every possible seed or strategy. Save data is browser/origin-local; export a JSON copy before clearing browser data or moving to another origin. The active run, permanent upgrades and reward-credit counters share one snapshot to avoid partial updates.

## Fullscreen HUD verification

The expedition now uses a fixed `100dvh` canvas and HUD. Read-only browser measurements confirm canvas, viewport and document dimensions match at 1440×900, 390×844, 844×390, 320×568 and the user window 924×1313, without page scroll. A separate actual 3440×1440 capture verifies ultrawide layout. Native fullscreen is requested from an entry/button gesture; persistence of the browser fullscreen flag is limited by the in-app automation host, so viewport coverage is the stable guarantee.

Verified touch movement, a two-cell click-to-walk route, travel refusal during visible combat, pause/zoom without consuming a turn, reload at the same turn and HP, and a 22-action combat replay ending in an announced archer attack. Guard reduced the subsequent hit to one damage. The compact Map button opens a paused overview: at 320×568, pressing a movement key while it is open leaves the turn unchanged, and Volver a jugar returns to the HUD.

Six navigation tests cover hidden cells, hazards, enemies, stale routes and interruption. Seven viewport tests cover resize, fractional camera origins, zoom limits, DPR, safe insets and pointer roundtrips. The independent visual review scored its compact-map correction resolved (ship). The mechanical detector ran once: no non-advisory findings; palette and type advisories are recorded in the refreshed design documentation. Browser console errors are checked before publication.

GitHub Actions and Pages publish from `master`, the owner's requested primary branch. Entry CSS/JS and the changed renderer import use release query strings so existing browser caches receive the HUD update immediately.
