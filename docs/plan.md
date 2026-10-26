# Range — design plan

The page is a measuring tool. [frontend.md](frontend.md) fixes the copy, the rounding, the column order, and what must stay off the page. [backend.md](backend.md) is the HTTP contract (`http://127.0.0.1:8000` in development). This file fixes the look and the first screen.

The first screen is a landing. A person lands on a dark page, close on the white queen, with the title on the shadow side of the frame. When a PGN is in the field, the camera eases back to the whole board, the heavy shadow lifts, and the set plays the moves from that file. The form stays on that page. A finished read opens a separate report. There is no feature grid, and no number on either page that the server did not send.

## Intent

Someone with a Lichess export should understand the job in one glance: bring rated games, tick the ones this model can score, and read a band. The board is the object in the room. Before a file, it is a portrait of the white queen. After a file, it plays those games. It is not a match they can play.

## Approaches

Three ways to put the first screen together:

1. **Editorial marketing page, tool behind it.** A headline, a board, then sections for method, accuracy, and pools. This fights the contract. The accuracy numbers live on `/method` and only when `GET /v1/pools/{pool}` returns them. A landing grid would invent the rest.
2. **The original chess-room column with a flat board.** Wordmark, a 2D board, then the form in order. This keeps the content and misses the first screen you asked for: a landing built around a 3D set, with the upload beneath it.
3. **Chosen. Landing, then a report.** The first viewport is the queen portrait and the headline. The upload stack sits under it, in the order [frontend.md](frontend.md) already fixes. A file pulls the camera back and the parsed games play. A finished read opens `/report/{id}`. The band is the largest type on that page.

The lime accent and the warm paper background stay dropped. The room is black, white, and grey. The only warmth is the ivory of the pieces. A fixed knight step was the earlier stand-in. You chose a replay of the uploaded moves instead.

## What the page is

- `/` is the tool. `/method` is the model card for the selected pool. `/report/{id}` is the finished read. `{id}` is the job id from `POST /v1/estimates`.
- On load: `GET /v1/health` and `GET /v1/pools`.
- The picker change and `/method`: `GET /v1/pools/{pool}`.
- Paste or subject, 400 ms after the edit: `POST /v1/games:check`. Skip an empty paste. A newer edit wins.
- The button, only when the ticked count equals that pool’s `games_required`: `POST /v1/estimates`, then `GET /v1/estimates/{id}` every 1 second.
- Base URL from the environment. JSON only. No API key.
- Show the server `message` when it is a non-empty string. Otherwise use the sentence in the error table in [frontend.md](frontend.md).
- Components take typed payloads. Fixtures from [frontend.md](frontend.md) stand in while the API is absent. Swapping them for the network does not change the components. The fixture file is the only place those sample numbers live.

Wordmark: **Range**. How it works sits beside it and goes to `/method`.

## What the page shows

Ranked. If a later item fights an earlier one, the earlier one wins.

1. **The band is the claim, and it lives on the report.** When a job reaches `done`, `/` navigates to `/report/{id}`. The largest type there is the rounded range. `1483 / 1706 / 1958` prints as **1480–1960**, second line `Center 1710.`, third line `8 rated Lichess classical games.` The words come from the payload: `{q10}–{q90}`, `Center {q50}.`, `{n_games} rated {pool label} games.` Raw quantiles never appear. Round `q10`, `q50`, and `q90` to the nearest 10. The track runs from that pool’s `elo_min` to `elo_max`, loaded with `GET /v1/pools/{pool}`. A filled span marks `q10`–`q90`. A tick marks `q50`. A quantile outside the track still prints, and the mark clips to the edge. Draw it as a measured span. The landing never prints the band.

2. **The lab line is part of the object.** When `lab` is true, the banner above the headline is the sentence in [backend.md](backend.md): typical error as an integer, `within_150` as a percent with no decimal (`0.68` → `68%`). When `lab` is false, that banner is absent and one quiet line remains: `Held-out players were missed by about {typical_error} Elo.` `tail_note` prints only when the server sends a string. Driver lines are `drivers[].text` in order. `feature` is only a React key. `direction` is not shown.

3. **The board plays the file.** It sits in the landing, above the form. With no PGN, the camera is tight on the white queen and a heavy shadow falls beside her. The headline sits on that shadow. When the field holds a PGN that parses, the camera eases out over about 900ms, the heavy shadow is removed, and the full board plays the moves. White stays at the bottom of the frame. A faint contact shadow remains so the pieces sit on the squares. `/method` does not mount a board.

4. **The checklist is the score sheet.** Empty until a check succeeds. The slot says `Reading headers.` while a check is in flight. Each accepted game is a row that can be ticked. The `ok` line is `White · 2017.02.14 · Italian Game · 1-0 · 42 moves`, using that game’s color, date, opening, result, and move count. Refused games stay visible, dim, and not checkable, with the sentence for `wrong_pool`, `unrated`, `unfinished`, `variant`, `name_missing`, or `too_short` from [frontend.md](frontend.md). A live count (`3 of 8`) uses the ticked count and that pool’s `games_required`. It is the only progress chrome.

5. **The method page is the proof.** Title is the pool `label`. Each `summary` string is its own paragraph. The bin table is a table: bin, players, typical miss, signed bias (`+121`, `−90`, minus sign `−`), coverage, band width. Under it: `{source_label}. Stockfish depth {depth}. {games_required} games. Revision {revision}.` Disabled pools still return 200 and render that thinner card. No board.

6. **Failure is a sentence, not a new layout.** One line under the button. The checklist stays. Health `engine: "down"` disables the estimate, shows the engine-down sentence, and leaves the checklist usable. A file over 2,097,152 bytes is refused before the request, with `That file is over 2 MB.` Polling stops at `done`, `failed`, cancel, or 90 seconds (`The read took too long. Try again.`). There is no cancel route. Cancel drops the id and stops polling.

## What stays off the page

- A single “your Elo” figure, a cheat score, a confidence ring, or a “you are 1710” badge.
- Any rating parsed out of the PGN. `WhiteElo` and `BlackElo` are never read and never shown, even though the moves are.
- Clocks, captured material, an eval bar, player avatars, a rating next to a name, or a label that calls a move a blunder or a mistake. The reference board shows a name and a rating. This board does not.
- Blitz or bullet treated as available. They render disabled, with `unavailable_reason`.
- Hardcoded model metrics: test-player counts, percents, bias, depth, revision, `elo_min`, `elo_max`. Those render from the response that owns them, or not at all.
- A feature grid, a pricing block, an account control, or a second call to action in the landing.
- A generated write-up. No Gemini call, no other chat model, and no sentence written on the client from a feature name. The explanation is `drivers[].text`, the lab line, and `tail_note`. A general model would invent style, mistakes, and confidence the rating model did not measure, and it would send the player’s games to another service.

The landing headline is `Get your Elo guessed.` The line under it says the model will guess your Elo, then what the 10–90% band is: the low and high of that guess, not how sure the model is. That band is the definition of `q10` and `q90` in [frontend.md](frontend.md). It is not a measured accuracy.

## Landing

Desktop, first viewport. One column, aligned to the left, max width 1120px. The headline is the only large type. The board is the only picture.

Before a file, the queen fills the viewport. The title sits on the dark side of her, left aligned, over a quiet scrim so the type stays on black.

```
Range                                 How it works

┌─────────────────────────────────────────┐
│ Get your Elo guessed.            queen │
│ Our model will guess your Elo. The      │
│ 10–90% band is the low and high of      │
│ that guess, not how sure the model is.  │
│                                         │
└─────────────────────────────────────────┘

        time control
        name
        drop a .pgn, or paste it
```

After a playable PGN, the same column holds the full board. The headline leaves the frame and sits above it, small enough that the set can be read.

```
Range                                 How it works

Get your Elo guessed.

Game 2 of 12          14.  Nf3          White to move
                 ┌───────────────────┐
                 │                   │
                 │   full board      │
                 │   even light      │
                 │                   │
                 └───────────────────┘
                 Pause replay

        time control
        name
        the file, with its size
```

The upload stack starts under the board, still in spec order, so the file control is what the landing is for:

1. Pool. One radio per row from `GET /v1/pools`, in that order. `available: false` is visible and disabled, with `unavailable_reason` beside it.
2. Subject. Label: `Name you played under`. Sent, then not shown again.
3. PGN. A drop target and a text area. The file is read as UTF-8 into the same field. The chosen file shows its real name and its real byte size, with remove and replace. Under the target, one line: `A PGN is the text record of the games. Lichess can export one.`

Then, still on `/`, in order: checklist, button, wait, result, failure. The button label is `Estimate from these {games_required}`, so the digit is the pool’s. On the live pools that reads `Estimate from these 8`. It is disabled until the ticked count equals `games_required`.

While a job is in flight the button slot becomes `Reading the games with Stockfish, depth {depth}.` plus `Cancel`. `depth` comes from the selected pool.

The result renders under the form. A new check clears it. The footer is `{pool label} · Stockfish depth {depth} · {revision}`, and the revision text links to `/method`.

Narrow widths stack the same way. The board scales inside the column. Nothing scrolls sideways. At a large text size the headline wraps, the board gets shorter, and the form stays one column.

```
Range      How it works

┌───────────────┐
│ Get your Elo  │
│ guessed.      │
│          queen│
└───────────────┘

time control
name
drop or paste
```

## Visual system

The page is a black room. The board is a lit object in it, the way a product sits on the Nothing site, not a green diagram on a forest. The Linear reference contributes the restraint: one headline, a short second line, hairlines used once, no cards. It does not contribute a row of figures. Lando Norris contributes the scale of the headline and the confidence of the crop. It does not contribute a photo essay, a stat block, or a shop.

One memorable thing: the board. Everything else is quiet.

### Color

Roles, as CSS custom properties. Text contrast is against `--bg`. Square contrast is the pair of square colors. Piece separation is a lighting job, not a flat fill, because a knight has to read on both a light square and a dark square.

| Token | Hex | Role | Contrast |
| --- | --- | --- | --- |
| `--bg` | `#090909` | Page | — |
| `--ink` | `#F5F5F2` | Primary text, focus ring | 18.7:1 |
| `--ink-dim` | `#A3A39C` | Secondary text, refused rows | 8.4:1 |
| `--ink-faint` | `#8A8A84` | Disabled radio reason | 6.3:1 |
| `--line` | `#2C2C2A` | One hairline under the header, one above the form | non-text |
| `--fill` | `#F5F5F2` | The one prominent button | label `#090909` at 18.7:1 |
| `--error` | `#FFB4AB` | The error sentence only | 11.4:1 |
| `--square-light` | `#D4D0C8` | Board light square | 4.2:1 against the dark square |
| `--square-dark` | `#5C5954` | Board dark square | 4.2:1 against the light square |
| `--piece-white` | `#F7F4EC` | White Staunton, low metal | rim and shadow keep it off the light square |
| `--piece-black` | `#141413` | Black Staunton, a little metal so the rim catches | — |

`--ink-faint` is the dimmest text we ship. It stays above 4.5:1. Disabled controls are dim and they keep their reason in words. Refused rows use `--ink-dim` plus the reason sentence, not color by itself.

`prefers-contrast: more` lifts `--ink-dim` to `#D4D4CE` and `--line` to `#8A8A84`.

The band is drawn in `--ink` on `--bg`. The filled span is a 2px rule. The center tick is a short vertical mark. No second hue.

### Type

One family: **Schibsted Grotesk**, loaded from Google Fonts as a variable font, weights 400–700. It is a grotesque that can be both the headline and the form, so the page does not pick up a display serif or a monospace label face.

Hierarchy is size and weight. No all-caps eyebrows, no tracked-out labels, no middle dots except the interpunct the score-sheet spec already uses (`White · 2017.02.14 · …`).

| Style | Size | Weight | Line height | Use |
| --- | --- | --- | --- | --- |
| Display | `clamp(2.75rem, 6vw, 5.5rem)` | 700 | 0.96 | The one headline |
| Band | `clamp(3.5rem, 8vw, 7rem)` | 600 | 0.92 | `{q10}–{q90}` only |
| Title | `2rem` | 600 | 1.1 | Method page `label` |
| Body | `1.0625rem` (17px) | 400 | 1.45 | Sentences, radios, rows |
| Small | `0.8125rem` (13px) | 400 | 1.4 | File size, footer, table figures |

Body measure stays under 62 characters. 13px is the floor. Nothing uses a light or thin weight. The band and the table use `font-variant-numeric: tabular-nums`.

The headline is `Get your Elo guessed.` The line under it is `Our model will guess your Elo. The 10–90% band is the low and high of that guess, not how sure the model is.` Both are left aligned.

### Board

A React Three Fiber canvas, not a flat diagram and not a Chess.com screenshot. `chess.js` parses the PGN into games and legal positions. The parser never reaches the API client. Headers are used only to split games. Rating headers are discarded.

Two camera states, same set:

- **Portrait.** Tight on the white queen, three-quarter view, key light from the upper left, a heavy cast shadow on the black ground. The headline and the support line sit on that shadow, in `--ink`, over a scrim of `#090909` at about 55% so the letters never sit on ivory. No orbit control.
- **Table.** The camera eases back until the whole board fits. The heavy cast shadow animates out. Light flattens to the working set: key, dim rim, faint contact shadow. Squares are the two greys above. No texture, no grass, no file or rank labels.

Pieces are lathed Staunton silhouettes. Ivory and charcoal. White at the bottom.

Playback, once the field holds a PGN:

- Split the text into games. Keep every game `chess.js` can play to the end of its move list. Skip a game that breaks, and keep going.
- If none play, stay on the portrait and show `This PGN has no playable game.` The form still shows the server’s own error when the check fails.
- Start at game 1, move 0, the starting position of that game. Every 700ms, play the next ply. The piece slides from its source square to its destination over about 280ms. The source and the destination squares take a thin `--ink` edge for that ply, then release.
- Beside the board, three quiet facts, all from the parse: `Game 2 of 12`, the SAN just played (`14. Nf3`), and `White to move` or `Black to move`. The count is the number of playable games in the file, not `games_required`.
- At the end of a game, hold for one second, then start the next playable game. After the last, return to the first.
- `Pause replay` / `Play replay` sits under the board. Pause freezes the camera and the pieces. Removing the file, or clearing the paste, returns to the portrait and the starting set.
- A new paste replaces the reel. The board restarts at game 1 of the new text.
- The reel is independent of the job. A finished read does not wait for the game to end. A failed read does not stop the reel. Cancel, timeout, and engine-down leave the reel as it is. On `done`, the app opens the report and the landing canvas unmounts, so the reel stops because the page is gone.

The canvas element is `aria-hidden`. The game line, the move, and the side to move are real text. Pixel ratio is capped at 2. The loop runs only while a ply is moving or the camera is travelling, and it stops when the canvas leaves the viewport.

### Controls

One prominent button, the estimate. White fill, black label, 44px tall, full width of the column up to 420px. Hover darkens the fill to `#E4E4DF`. Press darkens it to `#CFCFC8`. Disabled is the same button at 40% opacity, not a new color, and it does not submit.

Cancel, remove, and How it works are text buttons in `--ink`, with the same 44px hit height and an underline on hover.

The drop target is a rectangle with a 1px `--line` border and square corners. Drag-over and keyboard focus turn that border `--ink`. The file input is a real control, labeled `Choose PGN file`. Paste and drop write the same string.

Focus is a 2px `--ink` outline, 2px offset. Every control is reachable from the keyboard in the spec order.

### Motion

Three motions, all optional.

- On first paint, the portrait opacity moves from 0 to 1 over 400ms. No slide on the headline, no staggered sections.
- The pull-back when a playable PGN arrives, about 900ms, with the cast shadow fading out over the same time. The headline moves from the portrait into the column above the board.
- The ply slide, about 280ms, on the 700ms clock.

`prefers-reduced-motion: reduce` cuts all three. The portrait is simply there. A playable file cuts to the full board with no camera move. Pieces change squares with no slide. The game line, the move, and the side to move still update. The wait sentence still changes.

### Report

`/report/{id}` uses the same ground, the same type, and the same header. No canvas. The page loads `GET /v1/estimates/{id}`. A `done` body renders the report. `queued` or `running` shows `Reading the games with Stockfish, depth {depth}.` only when this page already knows `depth` from the estimate; otherwise `The read is still running.` A `failed` body shows `message`. A 404 shows `That read expired. Start it again.` with a link back to `/`.

The report is one column, left aligned, in this order. Sections with nothing to say are absent. They are not replaced with a zero, a dash, or a card.

1. The lab banner, or the single quiet line when `lab` is false.
2. The band, the center line, and the games line.
3. The track, from the pool’s `elo_min` and `elo_max`.
4. `tail_note`, when it is a string.
5. The driver sentences, in order, each its own paragraph.
6. The games in this read, only when this browser still has the checklist from the post. One row per posted index, using the `ok` line already defined: color, date, opening, result, moves. Above the rows, two tallies counted from those same rows: how many were white and black, and how many of each result string. A reload that only has the job id skips this section, because the estimate payload does not include the games.
7. The footer `{pool label} · Stockfish depth {depth} · {revision}`, with the revision linked to `/method`.
8. `Read another set`, linking to `/`.

No other metric. Openings are names from the check, not a repertoire score. Move counts are the `moves` field, not a quality score.

### Method page

Same ground, same type, same header. No canvas. The summary paragraphs sit in a column about 62 characters wide. The bin table is a real table with a caption taken from the footer line. Figures are tabular and right aligned. A disabled pool with an empty `bins` array shows the summary and no empty decorative chart.

## States

| State | On screen |
| --- | --- |
| Loading pools | Header, headline, board. The radio group says `Loading time controls.` |
| Pools failed | The headline and board stay. One sentence where the radios go: `The time controls could not be loaded. Reload the page and try again.` |
| Idle | Portrait of the queen. Radios, empty name, empty paste, button disabled. |
| Checking | Name and paste stay editable. Checklist slot says `Reading headers.` The reel plays if the text parsed. |
| Ready | Checklist filled. Button enabled only at `games_required` ticks. Reel keeps playing. |
| File too large | The paste is unchanged. The portrait stays. `That file is over 2 MB.` |
| Unplayable PGN | Portrait stays. `This PGN has no playable game.` |
| Queued or running | Button hidden. Wait copy, cancel. Reel keeps playing. |
| Done | Navigate to `/report/{id}`. The landing reel unmounts. |
| Failed | Ready, plus one sentence. Reel keeps playing. |
| Engine down | Checklist usable. Estimate disabled. Engine-down sentence. |
| Backend unreachable | One sentence under the control that failed. The landing does not swap to a new page. |

## Build shape

My calls, so you can correct them before any code:

- Vite, React, TypeScript, React Router. Routes `/`, `/method`, and `/report/:id`. No chat-model SDK.
- CSS custom properties in one token file. No component library, no glass, no card grid.
- `@react-three/fiber` and `@react-three/drei` for the board. `chess.js` for the reel only. No `chessground`. The API module does not import the parser.
- One API module, one fixture module, one formatter module: round-to-10, integer Elo, signed bias, whole percents. One reel module: PGN text in, playable games and plies out.
- Files stay small: types, client, formatters, reel, tokens, landing shell, board, pool picker, score sheet, report, method table, and one state owner for `/`. The posted checklist for the current job is held in memory so the report can list those games. It is dropped on a new check.

Build order, after this plan is approved:

1. Tokens, type, header, and the queen portrait with the headline on the shadow.
2. The upload stack: radios from the pools payload, name, drop and paste, file size, the 2 MB refusal.
3. The reel: parse, pull back, play, pause, and the unplayable sentence.
4. Check, checklist, button, with fixtures.
5. The job: poll, cancel, timeout, engine-down. On `done`, open `/report/{id}`.
6. The report and `/method`, rendered only from payload fields. A reload of the report with no checklist omits the game list.
7. Then the states in the table above, at a narrow width and at a large text size.

## Done when

The checklist at the end of [frontend.md](frontend.md) still passes, and the first viewport matches this plan:

- Disabled blitz is visible, with its reason.
- The button posts exactly the ticked accepted indexes, and only when that count equals `games_required`.
- A wrong-pool game cannot be ticked.
- The report, not the landing, shows the band, the lab banner, the driver sentences, and the revision footer. Raw quantiles are absent. The report has no generated paragraph.
- Reloading `/report/{id}` after the checklist is gone still shows the band, and it does not invent the game list.
- `/method` matches both fixture cards, including the bias signs, and mounts no board.
- Switching classical to rapid re-checks the same paste.
- Engine down blocks only the estimate.
- A 90-second poll and a cancel return to the sheet with no band. The reel keeps the file’s position.
- The landing shows no test-player count, no accuracy percent, and no rating from the PGN.
- A two-game fixture plays game 1, then game 2, then game 1 again, and the label uses that count.
- A header with a rating never appears on the board or in the game line.
- Reduced motion cuts the zoom and the ply slide, and the move text still advances.
- Clearing the file returns the camera to the queen.
