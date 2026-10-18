---
name: Yala · Ecos del abismo
description: An illustrated dark fantasy expedition journal with deliberate tactical controls.
colors:
  bg: "#101412"
  deep: "#0b0e0d"
  surface: "#191f1b"
  line: "#333a31"
  text: "#ece8d8"
  secondary: "#abb2a3"
  muted: "#969e90"
  gold: "#dbb66b"
  jade: "#82c7b0"
  danger: "#e78976"
  primary-ink: "#151b14"
  primary-hover: "#ebca88"
  secondary-fill: "#20271e"
  secondary-hover: "#2c3628"
  action-fill: "#1a211a"
  action-hover: "#2a3426"
  reward-fill: "#1d271c"
  reward-hover: "#2c3827"
  dialog-fill: "#181f19"
  hud-fill: "#131b16f5"
  hud-border: "#4d5847"
  hud-health: "#d79577"
  hud-action-fill: "#202b1c"
  hud-action-text: "#f0e9d4"
typography:
  display:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "96px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: ".12em"
  headline:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "27px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-.025em"
  class-title:
    fontFamily: "Georgia, serif"
    fontSize: "20px"
    fontWeight: 400
  journal-title:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-.025em"
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    lineHeight: 1.55
  button:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.55
  action-label:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.55
  hud-location:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "29px"
    fontWeight: 400
    lineHeight: 1.25
  hud-action-label:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.2
rounded:
  tactical: "3px"
  control: "4px"
  dialog: "5px"
  hud: "6px"
  node: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  compact: "12px"
  md: "16px"
  control: "20px"
  lg: "24px"
  grid: "28px"
  xl: "32px"
  section: "40px"
  shell: "48px"
  wide-shell: "64px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "13px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary-fill}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "13px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  navigation:
    textColor: "{colors.secondary}"
    padding: "34px 0"
  relic-choice:
    backgroundColor: "{colors.reward-fill}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "24px 17px 15px"
  class-choice:
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 17px 8px 7px"
    width: "100%"
  hud-surface:
    backgroundColor: "{colors.hud-fill}"
    textColor: "{colors.text}"
    rounded: "{rounded.hud}"
  hud-action:
    backgroundColor: "{colors.hud-action-fill}"
    textColor: "{colors.hud-action-text}"
    typography: "{typography.hud-action-label}"
    rounded: "{rounded.control}"
    padding: "7px 5px 6px"
  relic-token:
    textColor: "{colors.secondary}"
    padding: "5px 0"
  upgrade-buy:
    textColor: "{colors.gold}"
    rounded: "{rounded.tactical}"
    padding: "5px 11px"
  dialog:
    backgroundColor: "{colors.dialog-fill}"
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
    padding: "40px"
    width: "min(780px, calc(100% - 40px))"
---

# Design System: Yala · Ecos del abismo

## Overview

**Creative North Star: "The Lantern-Lit Expedition Journal"**

Yala is an illustrated dark fantasy expedition journal. Charcoal stone, aged ivory and restrained gold frame a small traveler beneath monumental ruins. Painterly key art establishes the world; procedural stone tiles, illustrated characters and fog of war carry that world into play.

The interface feels deliberate and weathered without sacrificing tactical clarity. Heritage manuscript headings give names and discoveries weight, while compact system typography keeps resources, intentions and actions readable. The refuge retains its open journal composition; during expeditions, the illustrated dungeon fills the viewport and compact HUD surfaces anchor resources and decisions around it. Light belongs to the lantern and the next meaningful choice.

**Key Characteristics:**

- Painterly fantasy imagery with a vulnerable traveler and monumental architecture.
- Georgia headings paired with compact system UI controls.
- Flat charcoal surfaces, ivory text, ember gold actions and jade energy.
- A full-viewport dungeon, persistent edge HUD, explicit enemy intentions and deliberate turn feedback.

Implementation evidence: `style.css`, `web/app.js`, `web/renderer.js`, `web/viewport.js`, `web/navigation.js` and `index.html`. The YAML frontmatter is normative for shared primitives. Component-specific literals and responsive overrides below record existing implementation, rather than a new scale.

## Colors

The palette resembles charcoal stone and aged paper illuminated by a warm lantern.

### Primary

- **Ember Gold** (`gold`): expedition entry, primary buttons, selected class markers, permanent fragments, icons and reached depths. Hover uses the lighter `primary-hover`; dark `primary-ink` keeps filled actions readable.

### Secondary

- **Spectral Jade** (`jade`): filled energy pips, fountain water, successful local save indicator and non-legendary relic rarity labels.

### Tertiary

- **Warning Clay** (`danger`): announced attacks, enemy health, damage feedback and failed save status. The player's HUD health meter uses the softer `hud-health` clay. Danger also has words, hatching or marks; color alone does not carry its meaning.

### Neutral

- **Charcoal Stone** (`bg`): the page and open journal canvas.
- **Recessed Stone** (`deep`): the reserved deepest surface primitive; the dungeon itself currently uses a more specific near-black (`#080c0b`).
- **Raised Moss Stone** (`surface`): the retained shared surface primitive.
- **HUD Stone** (`hud-fill`), with **HUD Seam** (`hud-border`): nearly opaque resource, minimap, enemy, tool and action-dock surfaces above the dungeon. HUD action tiles use `hud-action-fill` and `hud-action-text`.
- **Stone Seam** (`line`): section dividers, map frame and quiet container borders.
- **Aged Ivory** (`text`): primary text; **Faded Sage** (`secondary`) supports descriptions; **Weathered Sage** (`muted`) supports secondary annotations.
- Component fill and hover primitives preserve the actual green-charcoal surfaces of secondary buttons, actions, rewards and dialogs.

**The Lantern Rule.** Gold indicates an action, selection, progress or world light; large interface surfaces remain charcoal.

## Typography

**Display Font:** Georgia, with Times New Roman and serif fallbacks on headings. Other narrative accents use Georgia with a serif fallback.

**Body Font:** system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif.

**Character:** Georgia is the familiar manuscript voice of names, places and discoveries. System typography is the practical journal annotation for combat and controls. No downloaded font is required.

### Hierarchy

- **Display:** the refuge wordmark uses the `display` role. It steps to (100px) at (1150px), (91px) at (900px), then (85px) and (.12em) tracking at (640px).
- **Headline:** section headings use `headline`. The in-play location uses `hud-location`, becoming (23px) at (640px) and (20px) in short portrait; direct dialog headings are (35px), line height (1.2), becoming (29px).
- **Title:** class names use `class-title`; journal headings use `journal-title`. Reward titles use Georgia at (23px), weight (400), line height (1.2), then (22px) on mobile.
- **Body:** the body role is the inherited base. Component descriptions are intentionally denser: typically (10–12px), with line height (1.8). The refuge story is (15px), line height (1.8), stepping to (14px) and then (13px). Class details stop at (56ch); modal leads at (60ch).
- **Label:** buttons use `button`; HUD action titles use `hud-action-label`, becoming (10px) on mobile; the older `action-label` remains a compact annotation primitive. Small keys and annotations range from (7–11px). Resource counts use tabular numerals. Uppercase is reserved for compact category labels and the wordmark, with deliberate letter spacing.

**The Two Voices Rule.** Use Georgia for the world and system UI for the player's decisions; do not introduce another font family.

## Layout

The refuge's centered shell has a maximum width of (1328px) including horizontal padding. Default gutters are (48px), grow to (64px) from (1600px), shrink to (30px) at (1150px), and become (20px) at (640px). Shared spacing tokens describe recurring values; compact game components also use measured (3–13px) gaps and insets.

The refuge uses a cropped illustration and a text-led split hero, followed by two equal columns with a (64px) gap. That gap becomes (38px) at (1150px); at (900px) the columns are equal with a (28px) gap. At (640px) they stack with a (32px) gap. The four-region depth track becomes two columns on mobile.

The expedition is a fixed, isolated (100dvh) scene with a full-size canvas and no site header, footer or document scrolling. Health and energy anchor the top-left; floor, region and turn sit top-center; minimap and journal/help/fullscreen/pause tools occupy the top-right. Bottom controls keep a directional pad beside the six-action dock and zoom controls. Default top HUD columns are (252px 1fr 180px), with (24px) gaps and safe-area-aware outer insets. At (1000px), the HUD becomes denser without changing these anchors.

At (640px), vitals and tools form the first row, location spans the next row, and the six actions become a (3 × 2) grid beside a (44px)-target directional pad. The Map control opens a larger explored-map dialog that pauses play, shows a legend and provides a return-to-play action; zoom remains available in Pause. At heights up to (540px) with widths above (640px), compact landscape surfaces and the same paused map overview preserve the central play area. At widths up to (640px) and heights up to (700px), short portrait also removes decorative enemy artwork, duplicate health bars, passive event copy and currencies; numeric enemy health and intent stay visible, while currencies, help and journal remain in Pause. Essential movement and combat actions remain accessible in every layout; optional detail uses paused overlays rather than page scroll.

The camera follows the player in the unobstructed area between HUD clearances. The renderer draws stone artwork from a (32px) source grid at a default displayed tile size of (46px), or (40px) at widths up to (640px); zoom clamps to (28–72px). Canvas backing dimensions follow device pixel ratio, while layout and pointer picking share CSS-pixel geometry. Container, orientation, visual viewport, fullscreen and pixel-density changes recompute the camera and visible tile bounds. The minimap retains pixelated rendering. Expedition entry requests native fullscreen from the user's gesture where supported; the (100dvh) layout also works when fullscreen is unavailable or declined.

Dialogs use the frontmatter width and a maximum height of (90dvh). At (640px), width becomes `calc(100% - 24px)`, maximum height (92dvh), padding (33px 23px 27px), help becomes one column, and relic choices become horizontal single-column rows.

## Elevation & Depth

The interface has no box shadows. Tonal layers, single-pixel seams and the artwork create depth. The hero's dark gradient overlays protect text over the painting. The modal backdrop is a dark translucent veil (`#050905c9`) with (5px) blur; the dialog has a defined border (`#667052`). HUD surfaces are nearly opaque for legibility; the location title and event copy have localized dark text shadows over the map. These are localized layers, not a glow system.

The dungeon's radial lantern illumination is anchored to the player, with tiny sprite-ground ellipses inside the canvas. Those world-light effects do not become panel shadows. CSS combat damage feedback lasts (.2s), while floating canvas feedback lasts (850ms); there is no ambient animation loop.

**The World-Light Rule.** Keep illumination inside the illustrated world; express interface hierarchy through tone and borders.

## Shapes

Controls and class/relic choices use subtly softened corners (`control`). Keycaps and upgrade purchases use the smaller `tactical` corner; HUD action tiles use `control`, HUD containers use `hud`, and dialogs use `dialog`. Progress nodes are circular (`node`) while boss nodes use tactical corners. Refuge sections stay open and rectangular, separated by space. Borders identify interactive choices and progress nodes; headers, upgrade rows, the descent track and footer have no decorative rules.

Icons use inline (24 × 24) SVG viewboxes with rounded strokes, normally (1.5px) thick, scaled to the component. The large relic emblem uses a lighter (.8px) stroke. Character portraits are crops of `resources/art/yala-character-atlas.png`, laid out as a (4 × 2) atlas; preserve the supplied illustration rather than replacing it with generic iconography.

## Components

### Buttons

Primary actions are warm, solid and clear. Primary and secondary buttons use (48px) minimum height, (13px 20px) padding, (24px) icon gap and the shared control corner. Secondary buttons add a single-pixel border (`#646b58`). Hover changes only fill and color over (.16s). Text actions use secondary text, (12px) type, (10px 0) padding and gold on hover.

### Navigation

The refuge header navigation is an understated row of system text at (13px), with a (32px) gap. Current navigation gets ivory text and a gold (1px) underline positioned (20px) from the bottom. At (640px), text becomes (11px), the gap (15px), padding (23px 0), and the underline moves to (12px) from the bottom. The resume navigation item is hidden there; the refuge's prominent expedition action remains available. In play, this page navigation gives way to labelled HUD tools and Pause; native fullscreen is also a direct tool and pause action.

### Class choices

Full-width portrait rows have an (88px) minimum height and the frontmatter padding. Unselected rows have transparent borders. Selection uses a transparent gold wash (`#dbb66b0d`) and warm border (`#9c8755`); hover uses `#dbb66b10` and a gold border over (.2s). Locked rows are disabled, labelled, subdued and show grayscale portraits at (.43) opacity. Mobile rows use an (83px) minimum height. Preserve `aria-pressed` and explicit unlock copy.

### Tactical actions and resources

The six persistent HUD actions are class skill, dodge, guard, potion, use/descend and wait. Tiles are centered icon/name/consequence stacks with a keyboard hint, (78px) minimum height, shared control corners and (7px 5px 6px) padding. Hover uses (`#3a4a2c`) and gold borders; press uses (`#52613a`). Disabled actions use (`#151e14`), subdued text and border, retaining readable consequences. The class skill uses a warm (`#353a22`) fill and (`#b6a269`) border. Mobile uses three columns with (72px) minimum-height tiles, compact labels, visible consequence text and no keycaps. Every action has an explicit accessible name; keyboard shortcuts and touch controls share the same behavior.

Vitals pair numeric health with a continuous (7px) `hud-health` meter, becoming (6px) on mobile; energy pairs numbers with separate jade pips. Gold, permanent fragments, potion count and save status sit beneath them where space permits, with wallet information repeated in Pause. An enemy inspector shows a portrait, numeric health, distance and announced intent; compact layouts reduce artwork before tactical information.

A gold contextual action near the bottom explains the next adjacent enemy or object interaction. Red threat tiles and a textual warning explain announced danger; in short landscape the danger warning takes priority over the duplicate contextual prompt, while the persistent action dock remains available. Click-to-walk previews and follows only known safe floor cells, excludes active traps and enemy cells, and stops when enemies or threats appear. Manual actions, overlays and pause stop travel. Journal/relic details, help and Pause are accessible overlays, preserving the expedition beneath them. The compact Map control also cancels travel and pauses gameplay in a large explored-map dialog; the desktop minimap remains persistent.

### Relics and reward choices

Carried relics are inline text buttons at (10px), with a small gold spark and gold hover. Reward choices are substantive cards with the frontmatter fill and padding, a single-pixel border (`#5c654a`), a large spark, rarity, Georgia title, effect description and a separated gold selection action. Hover changes background and border over (.18s). Three cards become stacked rows on mobile, preserving all descriptive text.

### Upgrade rows and dialogs

Permanent upgrades are open rows separated by spacing, a gold icon, a compact description and a segmented progress track. The purchase control is (36px) minimum height, increasing to (44px) on mobile, with tactical corners and a labelled fragment cost; unavailable purchases are visibly disabled. Help, rewards, results and the chronicle share the same bordered dialog material. The file importer is hidden; there is no visible text-input design to invent.

### Focus and motion

Buttons, links and canvases receive a gold (2px) `:focus-visible` outline with a (5px) offset. The map canvas brings its outline inward with a (-4px) offset during play. Use semantic buttons, explicit labels for icon controls, and readable disabled state text. Dialog close restores the previous focus.

Reduced motion disables CSS animations and transitions and restores automatic scroll behavior. The canvas reads the preference when its renderer is created and does not schedule feedback animation frames when reduction is requested. Its normal (850ms) floating feedback runs only while visible and active; hidden tabs cancel the frame. Meter widths update immediately. There are no width transitions or animated panel lifting.

## Do's and Don'ts

### Do:

- **Do** preserve the illustrated world and keep tactical information anchored around the full-viewport map.
- **Do** use Georgia for world names and system typography for controls and resource values.
- **Do** reserve gold for decisions, selection, progress and lantern light.
- **Do** pair danger color with explicit intention text, hatching or a visible mark.
- **Do** retain keyboard focus, labelled touch controls and reduced-motion behavior.
- **Do** keep movement and all six actions accessible at every viewport; move optional detail into Pause and the paused map overview.

### Don't:

- **Don't** add broad panel shadows, floating-card elevation or interface glows.
- **Don't** replace the supplied character illustration with generic decorative icons.
- **Don't** introduce additional typefaces or treat every label as a manuscript heading.
- **Don't** animate resource widths, add ambient animation loops or make enemy intentions depend on motion.
- **Don't** invent visible text fields or new component variants for documentation alone.

## Refuge content and entry

The hero keeps the key art, Yala title and subtitle, a factual two-line introduction and the primary expedition action. The secondary action is Cómo jugar for a first visit or Nueva expedición for an existing run. Only an active run adds a class/floor note. Class rows show combat stats or their unlock requirement; narrative epithets, duplicate lock labels, decorative captions and region taglines are omitted. Class and upgrade descriptions use (12px) text, including compact layouts. No gameplay features are removed. Native fullscreen is opt-in from the HUD or pause menu, never requested on start or resume.
