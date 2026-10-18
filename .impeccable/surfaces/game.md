# Game surface

Primary target: web/app.js. Related targets: style.css, web/renderer.js, web/viewport.js, web/navigation.js.

Mode: Experience. Refine the existing illustrated world into a full-viewport tactical dungeon. The expedition is a fixed 100dvh canvas with a persistent HUD, no site header/footer and no page scroll. Health/energy sit top-left, floor/location top-center, minimap and menu top-right, movement/actions at the bottom. The player remains centered in the unobstructed play area. Entry and resume keep the ordinary browser window. Native fullscreen is requested only from its explicit HUD or pause control; all play controls work in ordinary browser viewport mode.

Signature: a lantern-lit map with large illustrated sprites, announced danger tiles and a contextual gold action for an adjacent enemy or object. Click-to-walk only uses explored safe cells and stops when enemies appear. Inventory, lore, help and pause are accessible overlays that stop travel. Portrait and short landscape retain all actions; mobile minimap is expandable. Preserve saved games and the refuge identity. Only one web edition is offered.

Required verification: viewport-sized captures at 1440×900, 390×844, 844×390, 320×568 and actual user width924, plus native fullscreen; no page overflow or clipped essential controls. Confirm resize/picking, pause/resume, keyboard/touch, safe travel cancellation and save reload. Deliver to master, the requested primary branch.
