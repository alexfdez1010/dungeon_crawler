# Yala · Ecos del abismo

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Expand the existing Dungeon Crawler into a much larger, dynamic browser game with deeper combat, more levels, bosses, persistent progress and unlocks. The original quest to recover the Amulet of Yala remains the narrative foundation.

## Users

Players of the existing keyboard-controlled, tile-based dungeon crawler. Spanish copy follows the owner's language; the original Rust sources remain in the repository.

## Capabilities and Constraints

The owner authorizes creative expansion, generated illustrations, parallel agent work, testing and delivery to master. Browser-local saving is explicitly requested. The repository is a static GitHub Pages site with a Rust/WebAssembly original. The expanded browser edition must work on static hosting without a backend or build step.

## Product Principles

- Readable enemy intentions make tactical choices matter.
- A lost expedition still advances permanent progress.
- Save the active expedition after every meaningful action.
- Generated maps must always connect the entrance and exit.
- Keep controls learnable and expose touch controls alongside the keyboard.
- Expeditions occupy the entire viewport with a persistent HUD and no document scrolling.
- Start and resume in the normal browser window. Native fullscreen is an explicit choice in the HUD or pause menu; the viewport-filling layout works independently.
- Keep saved expeditions compatible while simplifying controls and offering safe click-to-walk exploration.

## Evidence on Hand

Rust source in src/ and its original resources remain in the repository. The owner requested a single web game; the separate classic page and its WebAssembly distribution are removed.
