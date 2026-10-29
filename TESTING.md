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

## Release 3.1 · tactical choices and illustrated domains

The current suite passes **67/67 tests**, with no failures or skipped tests, on Node.js 24. Ten new tests cover oath sidegrades across all four classes, old-save defaults, malformed oath inputs, deterministic continuation, Focus versus Guard, announced-damage forecasts and relic drafts. A specialization check exercises base attack values 1–100 for all four classes so mixed attack relics cannot erase the skill specialist's advantage through rounding. CI also checks syntax for every browser and simulator module.

The balance report in [docs/BALANCE_REPORT.md](docs/BALANCE_REPORT.md) records 36 historical expeditions and 108 current expeditions, with the same tactical policy for comparisons. All 144 reach a real victory or defeat without rejected actions, stalls or exhausted limits. The report includes the actual class differences and the small-sample and policy limitations; simulations do not establish human enjoyment or equal win rates. Design sources and tuning hypotheses are separated in [docs/GAME_DESIGN_RESEARCH.md](docs/GAME_DESIGN_RESEARCH.md).

Chromium checks cover 1440×900, 390×844, 320×568, 844×390, 924×1313 and 3440×1440. In every active-game viewport the document and canvas match the viewport, action controls stay within its bounds and there is no page scrolling. Full-page refuge captures cover desktop, mobile and 320px. A minimum-width correction keeps the four-class refuge and upgrade controls inside the smallest screen.

A fresh browser session selected Brasa and seed 0, rejected an out-of-range seed, retained the seed through selection changes, verified its initial 36 HP, and preserved the oath, turn and expedition after reload. A representative browser run then executed 180 legal input actions, reached turn 181, defeated seven enemies and retained a valid save. Pause and the map overlay stop game actions; an actual touch movement advances exactly one turn. Entry keeps native fullscreen off, and its explicit control enables it.

Validated synthetic engine states exercise reward and danger presentation at desktop, mobile and 320px. All three relic choices are reachable in the scrollable dialog, Escape cannot dismiss the required reward, and choosing a relic advances to floor 2. A committed attack displays its damage and guarded damage; the subsequent real Guard action matches the forecast and recovers one energy. These fixtures validate the UI states, not progression through those scenarios. The final reward captures use the final relic descriptions and stat previews. No page errors or failed local asset requests were observed.

Renderer checks confirm that real damage and defeat effects do not mutate the run, expire and stop requesting frames, including reduced-motion mode. Optional synthesized audio creates no AudioContext while disabled; opted-in cues schedule in a running context and muting suspends it. Human sound quality and real-device audio latency were not measured.

The six-domain illustration atlas is generated original artwork, 1536×1024, with exact prompt and provenance in [resources/art/domains-prompt.md](resources/art/domains-prompt.md). Its SHA256 matches metadata. Browser import versions advance consistently to 3.1.0. The Impeccable launcher/detector is absent in this environment; visual checks therefore use captured evidence and an independent manual review.

The independent finish review returned `ship` for its listed correction: the short-portrait action notes now wrap within their tiles, including Guardia's +4 armor and +1 energy. Fresh 320px game/danger captures and text-bound measurements confirm containment; the reviewer found no regression caused by the fix. The visual review did not include a native-fullscreen capture, although its explicit activation passed a browser assertion. Existing DESIGN.md/sidecar prose predates parts of this extension; their tokens and files were preserved rather than regenerated.

## Tactical refinement · 3.2.0

Current validation: `npm test` passes **71 tests**, with no failures or skips. All browser and simulation modules pass `node --check`; `git diff --check` passes. The suite verifies announced close strikes and boss retaliation, missed-strike pursuit, Apertura persistence and one-attack consumption across all four classes, cover against waves/crosses, existing-save compatibility and complete legal campaign replay. A paired 320-expedition comparison has zero stalls; outcomes and limitations are recorded in `docs/BALANCE_3_2.md` and `resources/balance3.2.0.json`.

Chromium was exercised at 1440×900, 390×844, 320×568 and 844×390. Refuge, six persistent actions, combat, help, map, pause and reward choices have no document overflow or runtime/console errors. Starting keeps native fullscreen off. Pause/help/map prevent gameplay input. Touch movement and reload preserve the same run, turn, HP and energy.

A real browser combat fixture checks that melee announces before damage, leaving the threat grants Apertura and using the class skill consumes the bonus and defeats the target. At 320×568, dodge targeting spends no turn until a direction is selected; Enter does not attack while targeting, blocked directions keep targeting without spending energy, the directional pad executes a two-cell/two-energy dodge, Escape cancels without pausing, and Shift plus a direction executes directly. Held Shift-direction input is guarded against repeat events in the key handler. The mandatory reward cannot be dismissed with Escape; selection advances the production state to floor 2.

Seed 4294967296 is rejected; seed 123456 with the tide oath starts with the expected six energy and restores through saving. The illustrated journal and four new panoramas load. Sound starts off and toggles on/off without console errors while retaining preference. AudioContext mocks additionally checked lazy initialization, voice cleanup and the twelve-voice limit. Audio was exercised through browser events; no human listening study was performed.

GitHub Pages configuration was verified through its API: the root of **main** is the publishing source. Earlier sections describe historical releases and their previous publishing configuration.
