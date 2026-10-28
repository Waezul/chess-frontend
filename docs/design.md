# Queen's Range design

Visual rules for the live frontend. Change colors in `src/styles/tokens.css` first, then update this file. The board materials live in `src/board/ChessStage.tsx` and are listed separately below.

This is a dark studio: charcoal room, ivory type, one brass accent. Keep it quiet. Do not add a second palette, a dashboard, or a new typeface.

## Color

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#202223` | Page, header, replay readout, canvas clear color. `theme-color` matches. |
| `--raised` | `#2a2c2a` | Score panel and its sticky bar. |
| `--field` | `#171918` | Inputs, drop zone, pool list, disabled primary button. |
| `--ink` | `#f1efe8` | Primary text, radio and checkbox borders. |
| `--ink-dim` | `#aaa99f` | Secondary copy, hints, game facts, disabled primary label. |
| `--ink-faint` | `#9c9b92` | Disabled controls and unavailable reasons. |
| `--line` | `#484943` | Dividers only: header rule, row rules, the line inside a grouped field. |
| `--field-edge` | `#6e6a62` | Borders of inputs, panels, and the game picker. |
| `--brass` | `#d0b27a` | Focus, selection, progress, the primary action. |
| `--brass-hover` | `#e2c99a` | Primary button hover. |
| `--brass-press` | `#c4a56e` | Primary button press. |
| `--on-brass` | `#202223` | Text and the check mark on brass. |
| `--fill` | `var(--brass)` | Primary button fill. |
| `--error` | `#e3a299` | Error sentences. |
| `--ok` | `#a9c7b0` | Success text, when a real success exists. |
| `--radius` | `6px` | Fields, panels, buttons, skeleton bars. |

`prefers-contrast: more` lifts `--ink-dim`, `--ink-faint`, `--line`, and `--field-edge` to `#d4d4ce`, and `--brass` to `#e7d3a8`.

### Where brass is allowed

Brass is for a selected state, keyboard focus, progress, and the one important action. A selected pool or game gets a 2px brass inset bar. A checked radio is a brass dot. A checked box is a brass square with a `#202223` check.

Text selection is brass with `--on-brass` text.

Do not use brass as a large background, a link color, or a decoration. Do not introduce lime, purple, neon, glass, blur, or gradient panels.

### What each neutral is for

- `--line` is too faint to outline a control. Use `--field-edge` on inputs and panels.
- Disabled text stays at full opacity. Use `--ink-dim` or `--ink-faint`. Do not fade a control with `opacity: 0.4`.
- The sticky game-count bar uses `--raised`, the same color as the panel. A `--bg` bar reads as a separate strip.
- The header background is solid `--bg`, including the overlay on the landing page. Scrolling text must not show through the wordmark.

## Type

Schibsted Grotesk, weights 400–700, then `Segoe UI`. Body size is `1.0625rem`, weight 400, line-height 1.45.

The landing headline is weight 700, tight leading (`0.96`), and slight negative tracking. Supporting copy is `--ink-dim`. Move notation on the replay is `1.5rem` and weight 600.

Write labels in sentence case. Buttons start with a verb: "Load more", "Select the first 8", "Watch the games". Do not label the back control "Back"; the replay stepper already uses that word. The back control is a chevron, and the Queen's Range wordmark also returns home.

## Focus and targets

Keyboard focus is a 2px solid brass outline, offset 2px. A mouse or touch press must not leave that outline behind.

- Buttons and composite controls suppress the ring with `:focus:not(:focus-visible)`.
- A text field keeps the ring. The username field draws it on `.name-box`, not on the inner input. Focusing the load button inside that box does not ring the box.
- Header links (wordmark, "How it works", back chevron) still match `:focus-visible` after a click. `SiteHeader` sets `data-pointer-focus` on pointer down and removes it on Tab. The ring is hidden only while that attribute is present.

Hit targets are at least 44 by 44 CSS pixels. In forced colors, the focus outline becomes `CanvasText` and controls fall back to system colors.

## Actions and loading

The primary button is full width, brass fill, `--on-brass` label, weight 600. Hover uses `--brass-hover`. Press uses `--brass-press`. Disabled uses `--field` and `--ink-dim`.

Secondary actions are text buttons: no fill, `--ink`, underline on hover, opacity 0.7 while pressed. Disabled text is `--ink-faint`.

When an action is in flight, replace its label with the activity. Do not leave the idle label and add a sentence beside it.

- "Load latest rated games" becomes a brass spinner. The button is disabled, `aria-busy`, and its accessible name is "Loading games from Lichess." The status sentence with that same text stays hidden while the spinner is showing. Errors still render.
- The spinner is a 2px ring, brass on a 35% brass track, spinning in 0.7s. With reduced motion it does not spin, and the right edge stays open so it still reads as a spinner.
- "Watch the games" becomes "Creating the replay." The replay page keeps that sentence and a brass progress bar.
- A check shows "Reading headers." and skeleton bars in the score panel. The bars are `--ink` mixed lightly into `--raised`.

Reduced motion removes animation. Meaning stays in the text, the partial ring, or a full progress track.

## Game list

Show accepted and refused games together. Refused rows stay visible and are not checkable.

Open on the 10 most recent games. "Load more" sits under "Showing the N most recent." and reveals the next 10. The sentence updates. When every game is visible, remove both the sentence and the button. Undated games sort last.

The selection cap is 8. The count ("0 of 8 selected") stays in a sticky bar so it remains visible without scrolling to the top. "Select the first 8" fills from the games currently shown and skips refused rows. It is disabled only when that exact set is already selected. Further checkboxes disable once 8 are selected.

## Board

Staunton pieces on a quiet two-grey board. White sits at the bottom. No wood grain, no file or rank labels, and no orbit controls.

| Part | Hex | Notes |
| --- | --- | --- |
| Room and canvas clear | `#202223` | Same as `--bg`. |
| Light squares | `#d4d0c8` | `--square-light`. Rough, not shiny. |
| Dark squares | `#5c5954` | `--square-dark`. |
| Frame | `#141413` | The board slab. |
| Ivory pieces | `#f7f4ec` | `--piece-white`. |
| Charcoal pieces | `#1c1b19` | Rendered material. Darker than the frame, and not the `--piece-black` token. |
| Last-move wash on a dark square | `#f5f5f2` at 42% | Plus an ivory edge. |
| Last-move wash on a light square | `#141413` at 40% | Plus a charcoal edge. A light wash disappears on a light square. |

`a1` is dark: a square is dark when `(file + rank) % 2 === 0`.

The landing portrait is `ChessStage` with an empty PGN. Do not swap it for a Unicode queen, an SVG, or `QueenPortrait`. Do not retouch piece materials, roughness, or light intensities unless the task is the lighting itself.

The portrait camera has two shots. The narrow shot is used when the viewport width divided by height is below 0.92.

- Wide: fov 27, position `[-0.05, 0.88, 4.55]`, look `[0.22, 0.52, 0]`.
- Narrow: fov 31, position `[-0.95, 1.08, 5.75]`, look `[0.02, 0.62, 0]`.

On a phone, the headline stays readable beside the queen. Do not crop the queen off the frame, and do not let it cover the headline.

## Method

`/method` uses this same room, type, and header. It does not mount a board.

The title is the pool `label`, weight 700, tight leading. Summary sentences are `--ink`, each its own paragraph, in a column about 62 characters wide (`28em` at the body size, because `62ch` is the width of 62 zeros and runs long in this face). The bin table is left aligned with that title. Bin is a row header. Players, typical miss, bias, coverage, and band width are right aligned and tabular. Row rules use `--line`. The header rule uses `--field-edge`. Bias keeps its sign in the same ivory as the other figures.

The line under the table is the source caption, in `--ink-dim`: source, Stockfish depth, games required, and revision. A pool with no bins shows the summary only. Do not draw an empty chart, a card grid, or a second color.

## What the interface may say

Show only data the PGN or the API actually returned. Missing names fall back to "White" and "Black". Do not invent ratings, accuracy, win rates, or charts.

The report page stays an empty state until a finished estimate is loaded. Do not draw a sample Elo, a band, or a chart.

Player names on the replay are names, not ratings. White and Black stay labeled for the whole replay. The ending replaces the turn line only on the final ply.
