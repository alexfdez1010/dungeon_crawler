# Verification · Yala 3.0

## Automated checks

Run `npm test` on Node.js 22 or later. The checks cover:

- 200 initial map seeds plus 720 generated floors (40 seeds × 18 floors): connected maps, separated spawns, valid saves and legal campaign transitions.
- All 18 floors, six boss seals, 17 unique relic choices and terminal victory.
- Class targeting, announced attacks, two-step enemy movement, guard, dash, traps, pickups, supplies and offering rotation.
- Resistance to repeated interruptions, damage mitigation and piercing, actual-damage lifesteal, bounded upgrade levels and potion capacity.
- Deterministic simulation, hidden information, replay of every action through the production engine and explicit reporting of bot stalls.
- Browser storage validation/recovery, one-time reward credits, blocked storage and import corruption.
- A real pre-expansion save fixture, generated with the original engine, retains the old 12-floor victory, legacy currency, upgrades and unlocks without duplicate credit.
- The new class and all five upgrade lines survive save/reload.
- Safe explored navigation and camera/pointer conversions across desktop and mobile viewport sizes.

The static browser modules also receive Node syntax checks. `git diff --check` must pass. The Rust original is preserved and is not part of the browser runtime.

## Balance evidence

See [BALANCE.md](BALANCE.md) for reproducible CLI commands, methodology and measured results. Simulated runs use the real engine with legal player actions; they do not modify stats or enemy state. Deaths, victories and stalled policies are separate outcomes. A human can find strategies the bot does not model, so these samples are regression evidence, not a proof about every possible player.

## Browser verification

The refuge was inspected at 1440×1000 and 390×844: four classes, five upgrade lines and six regions render without horizontal overflow. The new 1254×1254 transparent atlas has nine complete sprites in 418×418 cells; both class portraits and the dungeon renderer use it.

Verified mobile start, touch movement, pause, the 18-floor HUD and persisted expedition state. Restored a real simulated floor-16 expedition, verified the new heroine/enemy sprites and astral terrain, then moved through two real turns. Potion capacity and high energy counts fit both mobile and desktop HUDs; canvas and document exactly match 390×844 and 1440×900 without scrolling. No console warnings or errors were observed. Local test imports are isolated to the development origin and do not alter production progress.

## Publication

GitHub Actions runs the automated suite and browser syntax checks on `main` and `master`. The current release is delivered to `main`, and GitHub Pages serves its repository root. Entry assets and browser module dependencies use a matching release query string to invalidate the old cached campaign.
