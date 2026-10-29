# Yala · Ecos del abismo

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Expand the existing Dungeon Crawler into a much larger, dynamic browser game with deeper combat, more levels, bosses, persistent progress and unlocks. The original quest to recover the Amulet of Yala remains the narrative foundation.

## Users

Players of the existing keyboard-controlled, tile-based dungeon crawler. Spanish copy follows the owner's language; the original Rust sources remain in the repository.

## Capabilities and Constraints

The owner authorizes creative expansion, generated illustrations, parallel agent work, testing and delivery to `main`, as requested in the current session. Browser-local saving is explicitly requested. The repository is a static GitHub Pages site with a Rust/WebAssembly original. The expanded 18-floor browser edition must work on static hosting without a backend or build step.

## Product Principles

- Readable enemy intentions make tactical choices matter.
- A lost expedition still advances permanent progress.
- Save the active expedition after every meaningful action.
- Generated maps must always connect the entrance and exit.
- Keep controls learnable and expose touch controls alongside the keyboard.
- Expeditions occupy the entire viewport with a persistent HUD and no document scrolling.
- Start and resume in the normal browser window. Native fullscreen is an explicit choice in the HUD or pause menu; the viewport-filling layout works independently.
- Keep saved expeditions compatible while simplifying controls and offering safe click-to-walk exploration.
- Make preparation, combat and relic choices express readable tradeoffs rather than a single dominant option.
- Distinguish announced damage from a prediction of the entire enemy turn.
- Keep visual feedback finite and usable with reduced motion; sound is an optional local preference.

## Evidence on Hand

Rust source in src/ and its original resources remain in the repository. The owner requested a single web game; the separate classic page and its WebAssembly distribution are removed.

## Campaign expansion · 3.0

The campaign spans six regions and eighteen floors, with the strongest class earned after Ettin. Permanent upgrades and tactical play should materially improve survival; an initial Custodio should face meaningful difficulty; skilled tactical play may earn an exceptional victory without upgrades. A deterministic headless player must use the production engine and report deaths, victories and stalls separately. Preserve legacy saves and earned unlocks. Delivery is to `main`; GitHub Pages is configured to publish its root.

## Expedition choices and feedback · 3.1

- Before each expedition, choose a free oath: El farol keeps base attributes, La brasa trades 6 maximum health for 1 attack, and La marea trades 1 attack for 2 maximum energy. The oath lasts for that expedition.
- An optional numeric seed repeats the expedition's starting conditions; later decisions affect its course. Pause and the journal expose the seed for copying. After defeat or victory, replay uses the same seed, class and oath with the current permanent progress.
- Esperar restores 2 energy without added protection. Guardia restores 1 energy and adds 4 armor for that turn. The danger warning compares the maximum damage from attacks already announced at the current position with the guarded result; it includes announced contact strikes and excludes future enemy decisions.
- Relic rewards identify Ofensiva, Supervivencia and Canalización paths, show applicable before/after statistics and count carried relics from the same path. Six domain paintings connect the refuge's descent track with the next destination at reward time.
- Short combat effects show hits, defeat, skills, movement and recovery without consuming gameplay randomness. Reduced motion keeps feedback still; hidden tabs stop active feedback. Locally synthesized sound cues start only after the player enables sound, which is off by default.

## Tactical refinement · 3.2

All contact strikes and boss recovery retaliation announce their cells before resolving. Leaving all committed threats prepares one non-stacking Apertura (+35% next attack or skill), saved until attacking or changing floors. The four-class attack and skill contracts, armor penetration, potion limits and interruption resistance remain active. Dodge targeting chooses a direction before consuming a turn; Shift plus a direction executes directly. Illustrated journal panoramas, discovered resource markers and event-specific audio reinforce the same decisions.

Simulation compares the same ten seeds across four classes, zero/max upgrades and direct/tactical policies: 54 to 70 victories in 160 runs per revision, no stalls. This is technical balance evidence, not a human enjoyment measurement; ranger outcomes are documented as a remaining tuning concern.
