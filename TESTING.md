# Verification of the expanded web edition

## Automated

`npm test`: 23 passing tests on Node.js 24; CI runs Node.js 22.

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

The existing compiled classic WebAssembly game loads and renders separately. Native Rust tests could not be rerun offline because the original bracket-lib Git dependency was absent from the local cache; native Rust sources and compiled artifacts were not changed.

## Scope

These checks prove the listed mechanics and representative browser flows, rather than every possible seed or strategy. Save data is browser/origin-local; export a JSON copy before clearing browser data or moving to another origin. The active run, permanent upgrades and reward-credit counters share one snapshot to avoid partial updates.
