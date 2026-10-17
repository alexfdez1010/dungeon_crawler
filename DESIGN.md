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
typography:
  display:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "112px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: ".15em"
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
rounded:
  tactical: "3px"
  control: "4px"
  dialog: "5px"
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
  action-button:
    backgroundColor: "{colors.action-fill}"
    textColor: "{colors.text}"
    rounded: "{rounded.tactical}"
    padding: "9px 10px"
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

The interface feels deliberate and weathered without sacrificing tactical clarity. Heritage manuscript headings give names and discoveries weight, while compact system typography keeps resources, intentions and actions readable. Thin dividers and recessed tones organize the journal; light belongs to the lantern and the next meaningful choice.

**Key Characteristics:**

- Painterly fantasy imagery with a vulnerable traveler and monumental architecture.
- Georgia headings paired with compact system UI controls.
- Flat charcoal surfaces, ivory text, ember gold actions and jade energy.
- Explicit enemy intentions, adjacent resource information and deliberate turn feedback.

Implementation evidence: `style.css`, `web/app.js`, `web/renderer.js` and `index.html`. The YAML frontmatter is normative for shared primitives. Component-specific literals and responsive overrides below record existing implementation, rather than a new scale.

## Colors

The palette resembles charcoal stone and aged paper illuminated by a warm lantern.

### Primary

- **Ember Gold** (`gold`): expedition entry, primary buttons, selected class markers, permanent fragments, icons and reached depths. Hover uses the lighter `primary-hover`; dark `primary-ink` keeps filled actions readable.

### Secondary

- **Spectral Jade** (`jade`): filled energy pips, fountain water, successful local save indicator and non-legendary relic rarity labels.

### Tertiary

- **Warning Clay** (`danger`): announced attacks, enemy health, damage feedback and failed save status. Danger also has words, hatching or marks; color alone does not carry its meaning.

### Neutral

- **Charcoal Stone** (`bg`): the page and open journal canvas.
- **Recessed Stone** (`deep`): the reserved deepest surface primitive; the dungeon itself currently uses a more specific near-black (`#080c0b`).
- **Raised Moss Stone** (`surface`): the player resource strip.
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
- **Headline:** section headings use `headline`. The expedition title is (31px), line height (1.3), becoming (25px) on mobile; direct dialog headings are (35px), line height (1.2), becoming (29px).
- **Title:** class names use `class-title`; journal headings use `journal-title`. Reward titles use Georgia at (23px), weight (400), line height (1.2), then (22px) on mobile.
- **Body:** the body role is the inherited base. Component descriptions are intentionally denser: typically (10–12px), with line height (1.8). The refuge story is (15px), line height (1.8), stepping to (14px) and then (13px). Class details stop at (56ch); modal leads at (60ch).
- **Label:** buttons use `button`; tactical titles use `action-label`, becoming (10px) on mobile. Small keys and annotations range from (7–11px). Resource counts use tabular numerals. Uppercase is reserved for compact category labels and the wordmark, with deliberate letter spacing.

**The Two Voices Rule.** Use Georgia for the world and system UI for the player's decisions; do not introduce another font family.

## Layout

The centered shell has a maximum width of (1512px) including horizontal padding. Default gutters are (48px), grow to (64px) from (1600px), shrink to (30px) at (1150px), and become (20px) at (640px). Shared spacing tokens describe recurring values; compact game components also use measured (3–13px) gaps and insets.

The refuge uses a cropped illustration and a text-led split hero, followed by two columns in a (1.25:1) ratio with a (68px) gap. That gap becomes (38px) at (1150px); at (900px) the columns are equal with a (28px) gap. At (640px) they stack with a (32px) gap. The four-region depth track becomes two columns on mobile.

The expedition uses a flexible map and a (246px) journal with a (28px) gap. At (1150px) the journal becomes (215px) with a (20px) gap. At (900px) it moves below the map as a two-column journal and the directional pad appears. The action bar retains three columns; mobile actions become vertical, compact tiles with a (66px) minimum height. The map expands by (9px) into its surrounding gutter on mobile.

Canvas tiles are drawn at (32px). Desktop shows (13) rows and a computed (25–41) columns; at (640px) it uses (19 × 15). CSS scales the canvas to its container. The minimap deliberately uses pixelated rendering. Header height is (98px) in the refuge, (80px) during play and (79px) on mobile.

Dialogs use the frontmatter width and a maximum height of (90dvh). At (640px), width becomes `calc(100% - 24px)`, maximum height (92dvh), padding (33px 23px 27px), help becomes one column, and relic choices become horizontal single-column rows.

## Elevation & Depth

The interface has no box shadows. Tonal layers, single-pixel seams and the artwork create depth. The hero's dark gradient overlays protect text over the painting. The modal backdrop is a dark translucent veil (`#050905c9`) with (5px) blur; the dialog has a defined border (`#667052`). These are localized layers, not a glow system.

The dungeon's radial lantern illumination is anchored to the player, with tiny sprite-ground ellipses inside the canvas. Those world-light effects do not become panel shadows. CSS combat damage feedback lasts (.2s), while floating canvas feedback lasts (850ms); there is no ambient animation loop.

**The World-Light Rule.** Keep illumination inside the illustrated world; express interface hierarchy through tone and borders.

## Shapes

Controls and class/relic choices use subtly softened corners (`control`). Tactical actions, keycaps, tooltips and upgrade purchases use the smaller `tactical` corner; dialogs use `dialog`. Progress nodes are circular (`node`) while boss nodes use tactical corners. Sections stay open and rectangular, separated by thin rules rather than nested rounded cards.

Icons use inline (24 × 24) SVG viewboxes with rounded strokes, normally (1.5px) thick, scaled to the component. The large relic emblem uses a lighter (.8px) stroke. Character portraits are crops of `resources/art/yala-character-atlas.png`, laid out as a (4 × 2) atlas; preserve the supplied illustration rather than replacing it with generic iconography.

## Components

### Buttons

Primary actions are warm, solid and clear. Primary and secondary buttons use (48px) minimum height, (13px 20px) padding, (24px) icon gap and the shared control corner. Secondary buttons add a single-pixel border (`#646b58`). Hover changes only fill and color over (.16s). Text actions use secondary text, (12px) type, (10px 0) padding and gold on hover.

### Navigation

The header navigation is an understated row of system text at (13px), with a (32px) gap. Current navigation gets ivory text and a gold (1px) underline positioned (20px) from the bottom. At (640px), text becomes (11px), the gap (15px), padding (23px 0), and the underline moves to (12px) from the bottom. The resume navigation item is hidden there; the refuge's prominent expedition action remains available.

### Class choices

Full-width portrait rows have an (88px) minimum height, the frontmatter padding, and a single-pixel seam border. Selection uses a transparent gold wash (`#dbb66b09`) and warm border (`#9c8755`); hover uses `#dbb66b10` and a gold border over (.2s). Locked rows are disabled, labelled, subdued and show grayscale portraits at (.43) opacity. Mobile rows use an (83px) minimum height. Preserve `aria-pressed` and explicit unlock copy.

### Tactical actions and resources

Tactical actions have a (58px) minimum height, (3px) corners, a quiet outlined fill, an icon, title, explanation and keyboard hint. Hover brightens the fill and border. Disabled actions use muted text, darker fill (`#121812`) and subdued borders (`#2f392b`). The class skill gets a distinct warm fill (`#25291d`). Health is a continuous (5px) clay meter; energy uses separate (5px) jade pips. Values and instructions remain text-visible.

### Relics and reward choices

Carried relics are inline text buttons at (10px), with a small gold spark and gold hover. Reward choices are substantive cards with the frontmatter fill and padding, a single-pixel border (`#5c654a`), a large spark, rarity, Georgia title, effect description and a separated gold selection action. Hover changes background and border over (.18s). Three cards become stacked rows on mobile, preserving all descriptive text.

### Upgrade rows and dialogs

Permanent upgrades are open rows with a bottom seam, a gold icon, a compact description and a segmented progress track. The purchase control is (36px) minimum height with tactical corners and a labelled fragment cost; unavailable purchases are visibly disabled. Help, rewards, results and the chronicle share the same bordered dialog material. The file importer is hidden; there is no visible text-input design to invent.

### Focus and motion

Buttons, links and canvases receive a gold (2px) `:focus-visible` outline with a (5px) offset. The map canvas brings its outline inward with a (-3px) offset. Use semantic buttons, explicit labels for icon controls, and readable disabled state text. Dialog close restores the previous focus.

Reduced motion disables CSS animations and transitions and restores automatic scroll behavior. The canvas reads the preference when its renderer is created and does not schedule feedback animation frames when reduction is requested. Its normal (850ms) floating feedback runs only while visible and active; hidden tabs cancel the frame. Meter widths update immediately. There are no width transitions or animated panel lifting.

## Do's and Don'ts

### Do:

- **Do** preserve the illustrated world and keep tactical information adjacent to the map.
- **Do** use Georgia for world names and system typography for controls and resource values.
- **Do** reserve gold for decisions, selection, progress and lantern light.
- **Do** pair danger color with explicit intention text, hatching or a visible mark.
- **Do** retain keyboard focus, labelled touch controls and reduced-motion behavior.
- **Do** adapt composition at the implemented breakpoints without hiding essential action descriptions.

### Don't:

- **Don't** add broad panel shadows, floating-card elevation or interface glows.
- **Don't** replace the supplied character illustration with generic decorative icons.
- **Don't** introduce additional typefaces or treat every label as a manuscript heading.
- **Don't** animate resource widths, add ambient animation loops or make enemy intentions depend on motion.
- **Don't** invent visible text fields or new component variants for documentation alone.
