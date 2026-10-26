# Frontend reference

The page turns eight rated games into a 10–90% Elo band. The client calls `/v1` and renders the JSON. It does not ship a model, run Stockfish, or parse ratings out of the PGN to display them.

Two cards are live, both eight games at Stockfish depth 10:

- Lichess classical, February 2017, revision `classical8-v1`.
- Lichess rapid, September 2026, revision `rapid8-v2`.

`ship_ready` is false on both. Show the band, and show the lab banner. Blitz and bullet are listed by `GET /v1/pools` as unavailable.

`depth` is always the Stockfish search depth. The revision string names the model. It is not a depth.

Client routes:

- `/` is the tool.
- `/method` is the model card. Render it from `GET /v1/pools/{pool}`. Do not hardcode the metrics.

## Screen

Build `/` as one column, in this order.

1. Pool picker. One radio per pool from `GET /v1/pools`. `available: false` is visible and disabled, with `unavailable_reason` beside it.
2. Subject name. The White or Black header this person played under. Sent to the server and not shown again.
3. PGN. A text area and a `.pgn` file drop. Read the file as UTF-8 text and store it in the same field. Cap the client at 2 MB before posting.
4. Checklist. Empty until a check succeeds. Each accepted game has a checkbox. Refused games are visible, unchecked, and not checkable.
5. Button. Label: `Estimate from these 8`. Disabled until the number of ticked games equals `games_required` on the selected pool.
6. Wait. Replaces the button while a job is in flight. Copy: `Reading the games with Stockfish, depth {depth}.` A cancel control stops polling and leaves the checklist as it was.
7. Result. Renders under the form when the job is `done`. A new check clears it.
8. Failure. One sentence under the button. The checklist stays.

`/method` is a separate page for the selected pool, linked from the result footer and from the header.

## What the result shows

The band is the claim. The median sits inside it.

Display `q10`, `q50`, and `q90` rounded to the nearest 10. Keep the unrounded values off the page. A payload of 1483 / 1706 / 1958 reads **1480–1960**, center **1710**.

Headline: `{q10}–{q90}`. Second line: `Center {q50}.` Third line: `{n_games} rated {pool label} games.`

When `lab` is true, a banner above the headline:

> Lab estimate. Held-out players were missed by about {limits.typical_error} Elo, and {within_150 percent} of them landed within 150. The ends of the ladder pull inward.

When `lab` is false, omit that banner. Still show one quiet line: `Held-out players were missed by about {limits.typical_error} Elo.`

If `limits.tail_note` is a string, show it under the headline. If it is null, show nothing. Do not invent tail copy from `q50`.

Then up to three driver lines. Render `drivers[].text` in order. Ignore `feature` except as a React key. Do not write your own sentences from feature names.

Footer, from the done payload, and it must match the card: `{pool label} · Stockfish depth {depth} · {revision}`. Link the revision text to `/method`.

Draw the band on a track from `elo_min` to `elo_max` on the pool (800 to 2400 for both live pools). Mark `q10`, `q50`, and `q90`. If a quantile falls outside the track, keep the printed numbers and clip the mark to the track edge.

## What the page leaves out

- A cheat score, a confidence percent, or a “you are 1710” badge.
- The subject’s rating, the opponent’s rating, or who won, as inputs or as outputs.
- Blitz, bullet, Chess.com, or an unrated game scored on the classical card. Those fail in the checklist.
- Any averaging of one-game guesses. The button sends eight indexes. The server averages features, then scores once.

## Form states

| State | What is on screen |
| --- | --- |
| `idle` | Picker, empty paste, button disabled. |
| `checking` | Paste and name stay editable. Checklist slot says `Reading headers.` A newer edit supersedes the check in flight. |
| `ready` | Checklist filled. Button enabled only at `games_required` ticks. |
| `queued` / `running` | Button hidden. Wait copy. Cancel returns to `ready`. |
| `done` | `ready`, plus the result block. |
| `failed` | `ready`, plus one error sentence. |

Debounce `games:check` by 400 ms after the PGN or the subject name changes. Do not check an empty paste. A new check increments a request id and ignores stale responses. Changing the pool clears the checklist, the job, and the result, then checks again at once if the paste and the name are both non-empty. Acceptance depends on the pool.

Poll `GET /v1/estimates/{id}` every 1 second. Stop on `done` or `failed`. Stop after 90 seconds, drop the id, and show `The read took too long. Try again.` Cancel also drops the id. There is no cancel route.

## HTTP

Base URL comes from the environment. JSON only. No API key. Send `Content-Type: application/json`.

| Call | When | Success |
| --- | --- | --- |
| `GET /v1/health` | App load | `200` |
| `GET /v1/pools` | App load | `200` |
| `GET /v1/pools/{pool}` | `/method`, and when the picker changes | `200` |
| `POST /v1/games:check` | PGN or subject changed | `200` |
| `POST /v1/estimates` | Button | `202` |
| `GET /v1/estimates/{id}` | Every 1 s until done | `200` |

Error body, for every 4xx and 5xx:

```json
{ "error": "wrong_count", "message": "This model scores 8 games at a time." }
```

Show `message` when it is a non-empty string. Otherwise use the sentence in the error table below.

| HTTP | `error` | Sentence |
| --- | --- | --- |
| 400 | `wrong_count` | Select exactly the number of games this pool requires. |
| 400 | `pool_unavailable` | That time control is not published yet. |
| 400 | `empty_pgn` | Paste a PGN first. |
| 400 | `subject_required` | Enter the name you played under. |
| 400 | `bad_indexes` | Tick only accepted games from the checklist, each once. |
| 400 | `bad_request` | That request was malformed. Reload the page and try again. |
| 413 | `body_too_large` | That file is over 2 MB. |
| 404 | `unknown_pool` | That time control is not published. |
| 404 | `unknown_job` | That read expired. Start it again. |
| 429 | `busy` | The engine is busy. Wait a moment and try again. |
| 503 | `engine_down` | The engine is down. The checklist still works. |

A failed job is HTTP 200 with `"status": "failed"` and the same `error` / `message` pair. `unknown_job` is the 404.

Health `engine: "down"` disables the estimate button and shows the `engine_down` sentence. The checklist still runs.

## Types

```ts
type PoolId = "classical" | "rapid" | "blitz" | "bullet";

type Health = {
  ok: boolean;
  engine: "ready" | "down";
  pools: PoolId[];
};

type PoolSummary = {
  id: PoolId;
  label: string;
  available: boolean;
  unavailable_reason: string | null;
  games_required: number;
  elo_min: number;
  elo_max: number;
  depth: number;
  revision: string | null;
  ship_ready: boolean;
};

type Reason =
  | "ok"
  | "wrong_pool"
  | "unrated"
  | "unfinished"
  | "variant"
  | "name_missing"
  | "too_short";

type CheckedGame = {
  index: number;
  accepted: boolean;
  reason: Reason;
  color: "white" | "black" | null;
  white: string;
  black: string;
  date: string | null;
  opening: string | null;
  result: string | null;
  moves: number | null;
};

type Driver = {
  feature: string;
  direction: "higher" | "lower";
  text: string;
};

type Estimate = {
  pool: PoolId;
  revision: string;
  ship_ready: boolean;
  lab: boolean;
  n_games: number;
  depth: number;
  q10: number;
  q50: number;
  q90: number;
  drivers: Driver[];
  limits: {
    typical_error: number;
    within_150: number;
    coverage: number;
    tail_note: string | null;
  };
};

type Job =
  | { id: string; status: "queued" | "running" }
  | { id: string; status: "done"; estimate: Estimate }
  | { id: string; status: "failed"; error: string; message: string };

type BinRow = {
  bin: string;
  n: number;
  mae: number;
  bias: number;
  coverage: number;
  median_width: number;
};

type PoolCard = PoolSummary & {
  source_label: string;
  test_players: number;
  bins: BinRow[];
  summary: string[];
};
```

`lab` is true whenever `ship_ready` is false. Trust the flag.

`within_150` and `coverage` are fractions from 0 to 1. Format as percents with no decimal (`0.68` → `68%`). `typical_error`, `mae`, `bias`, and `median_width` are Elo. Format as integers. Bias gets a sign (`+121`, `−90`).

## Checklist copy

Render `reason` with these sentences. Names, date, opening, result, and move count can sit on the row. Elo must not, and it is absent from the payload on purpose.

`{id}` is the selected pool's `id` and `{label}` is its `label`, so one component serves every pool.

| `reason` | Copy |
| --- | --- |
| `ok` | Rated {id}, finished, standard chess. |
| `wrong_pool` | This game is another time control. The loaded model is {label}. |
| `unrated` | Unrated and correspondence games are refused. |
| `unfinished` | The game did not end normally, so the move record is cut short. |
| `variant` | Only standard chess. |
| `name_missing` | Neither header matches the subject. |
| `too_short` | The subject has fewer than 10 moves. |

For `ok`, prefix the color: `White` or `Black`. Example row: `White · 2017.02.14 · Italian Game · 1-0 · 42 moves`.

## Method page

Render only fields on `PoolCard`.

- Title: `{label}`.
- The lab banner from the tool stays on `/` only. On `/method`, print each string in `summary` as its own paragraph. The server writes those sentences.
- A table of `bins`: bin, players (`n`), typical miss (`mae`), bias, coverage, band width (`median_width`).
- A line under the table: `{source_label}. Stockfish depth {depth}. {games_required} games. Revision {revision}.`

## Fixtures

Use these while the API is absent. Swap them for the network without changing components. The numbers are the scored eight-game tests: classical from `notebooks/train_player8_trained.ipynb`, rapid from `notebooks/train_player8_trainedv2.ipynb`.

`GET /v1/health`

```json
{ "ok": true, "engine": "ready", "pools": ["classical", "rapid"] }
```

`GET /v1/pools`

```json
{
  "pools": [
    {
      "id": "classical",
      "label": "Lichess classical",
      "available": true,
      "unavailable_reason": null,
      "games_required": 8,
      "elo_min": 800,
      "elo_max": 2400,
      "depth": 10,
      "revision": "classical8-v1",
      "ship_ready": false
    },
    {
      "id": "rapid",
      "label": "Lichess rapid",
      "available": true,
      "unavailable_reason": null,
      "games_required": 8,
      "elo_min": 800,
      "elo_max": 2400,
      "depth": 10,
      "revision": "rapid8-v2",
      "ship_ready": false
    },
    {
      "id": "blitz",
      "label": "Lichess blitz",
      "available": false,
      "unavailable_reason": "No blitz model is trained yet.",
      "games_required": 8,
      "elo_min": 800,
      "elo_max": 2400,
      "depth": 10,
      "revision": null,
      "ship_ready": false
    }
  ]
}
```

`GET /v1/pools/classical`

```json
{
  "id": "classical",
  "label": "Lichess classical",
  "available": true,
  "unavailable_reason": null,
  "games_required": 8,
  "elo_min": 800,
  "elo_max": 2400,
  "depth": 10,
  "revision": "classical8-v1",
  "ship_ready": false,
  "source_label": "Lichess classical, February 2017",
  "test_players": 1119,
  "summary": [
    "This is a lab estimate. The ship bar was a typical miss of 120 Elo or better, and the test missed by 124.",
    "68% of 1,119 held-out players landed within 150 Elo. The band caught 80% of them.",
    "Players from 800 to 1000 were guessed about 121 Elo too high. Players from 2000 to 2200 were guessed about 90 Elo too low."
  ],
  "bins": [
    { "bin": "800–1000", "n": 140, "mae": 145.8, "bias": 120.5, "coverage": 0.68, "median_width": 321 },
    { "bin": "1000–1200", "n": 140, "mae": 127.0, "bias": 64.3, "coverage": 0.89, "median_width": 395 },
    { "bin": "1200–1400", "n": 140, "mae": 129.9, "bias": 38.3, "coverage": 0.81, "median_width": 450 },
    { "bin": "1400–1600", "n": 140, "mae": 106.7, "bias": 17.6, "coverage": 0.86, "median_width": 470 },
    { "bin": "1600–1800", "n": 140, "mae": 115.6, "bias": 4.7, "coverage": 0.84, "median_width": 456 },
    { "bin": "1800–2000", "n": 140, "mae": 125.0, "bias": -24.4, "coverage": 0.84, "median_width": 411 },
    { "bin": "2000–2200", "n": 140, "mae": 133.6, "bias": -89.6, "coverage": 0.79, "median_width": 374 },
    { "bin": "2200–2400", "n": 139, "mae": 104.4, "bias": -79.2, "coverage": 0.71, "median_width": 250 }
  ]
}
```

`GET /v1/pools/rapid`

```json
{
  "id": "rapid",
  "label": "Lichess rapid",
  "available": true,
  "unavailable_reason": null,
  "games_required": 8,
  "elo_min": 800,
  "elo_max": 2400,
  "depth": 10,
  "revision": "rapid8-v2",
  "ship_ready": false,
  "source_label": "Lichess rapid, September 2026",
  "test_players": 2398,
  "summary": [
    "This is a lab estimate. The ship bar was a typical miss of 120 Elo or better, and the test missed by 152.",
    "58% of 2,398 held-out players landed within 150 Elo. The band caught 80% of them.",
    "Players from 800 to 1000 were guessed about 110 Elo too high, and players from 1000 to 1200 about 102 too high. Players from 2000 to 2200 were guessed about 80 Elo too low."
  ],
  "bins": [
    { "bin": "800–1000", "n": 300, "mae": 139.7, "bias": 110.4, "coverage": 0.67, "median_width": 331 },
    { "bin": "1000–1200", "n": 300, "mae": 168.3, "bias": 102.0, "coverage": 0.84, "median_width": 484 },
    { "bin": "1200–1400", "n": 300, "mae": 162.7, "bias": 76.0, "coverage": 0.86, "median_width": 580 },
    { "bin": "1400–1600", "n": 300, "mae": 172.9, "bias": 12.6, "coverage": 0.81, "median_width": 584 },
    { "bin": "1600–1800", "n": 300, "mae": 155.3, "bias": -14.3, "coverage": 0.84, "median_width": 588 },
    { "bin": "1800–2000", "n": 300, "mae": 152.3, "bias": -71.8, "coverage": 0.85, "median_width": 560 },
    { "bin": "2000–2200", "n": 299, "mae": 143.5, "bias": -80.1, "coverage": 0.84, "median_width": 476 },
    { "bin": "2200–2400", "n": 299, "mae": 122.8, "bias": -79.8, "coverage": 0.72, "median_width": 302 }
  ]
}
```

`POST /v1/games:check`

```json
{
  "pool": "classical",
  "pgn": "[Event \"Rated Classical game\"]\n...",
  "subject": "SomeName"
}
```

```json
{
  "pool": "classical",
  "games_required": 8,
  "games": [
    {
      "index": 0,
      "accepted": true,
      "reason": "ok",
      "color": "white",
      "white": "SomeName",
      "black": "Opponent",
      "date": "2017.02.14",
      "opening": "Italian Game",
      "result": "1-0",
      "moves": 42
    },
    {
      "index": 1,
      "accepted": false,
      "reason": "wrong_pool",
      "color": null,
      "white": "SomeName",
      "black": "Opponent",
      "date": "2017.02.14",
      "opening": null,
      "result": "0-1",
      "moves": 31
    }
  ]
}
```

`POST /v1/estimates` returns `202`:

```json
{ "id": "job_01", "status": "queued" }
```

Body:

```json
{
  "pool": "classical",
  "pgn": "[Event \"Rated Classical game\"]\n...",
  "subject": "SomeName",
  "game_indexes": [0, 2, 3, 4, 5, 6, 7, 9]
}
```

`game_indexes` has length `games_required`, each index was `accepted`, and the `pgn` and `subject` are the same strings that were checked. The server checks the paste again. A wrong length is `wrong_count`. A repeated, out-of-range, or refused index is `bad_indexes`.

`GET /v1/estimates/job_01` while running:

```json
{ "id": "job_01", "status": "running" }
```

Done:

```json
{
  "id": "job_01",
  "status": "done",
  "estimate": {
    "pool": "classical",
    "revision": "classical8-v1",
    "ship_ready": false,
    "lab": true,
    "n_games": 8,
    "depth": 10,
    "q10": 1483,
    "q50": 1706,
    "q90": 1958,
    "drivers": [
      {
        "feature": "mistake_rate",
        "direction": "lower",
        "text": "Fewer serious mistakes than the typical game in this sample pulled the center up."
      },
      {
        "feature": "blunder_rate",
        "direction": "lower",
        "text": "Fewer large errors pulled the center up."
      },
      {
        "feature": "cpl_mean",
        "direction": "higher",
        "text": "Giving away more on a typical move pulled the center down."
      }
    ],
    "limits": {
      "typical_error": 124,
      "within_150": 0.68,
      "coverage": 0.80,
      "tail_note": null
    }
  }
}
```

That done payload displays as **1480–1960**, center **1710**, with the lab banner. For a tail fixture, set `q50` to `980` and `tail_note` to `Players this far below the middle were often guessed high.`

## Done when

- Pools, including a disabled blitz row, render from `GET /v1/pools`.
- The button stays off until eight accepted games are ticked, and it posts those indexes.
- A blitz game in a classical export shows `wrong_pool` and cannot be ticked.
- The result prints the rounded band, the lab banner, the server’s driver sentences, and the revision footer.
- `/method` matches both fixture cards, including the bias signs.
- Switching from classical to rapid re-checks the same paste, and a rapid game moves from `wrong_pool` to `ok`.
- Engine down disables the estimate and leaves the checklist usable.
- A 90 second poll and a cancel both return to the checklist with no band.
