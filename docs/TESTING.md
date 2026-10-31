# Testing

## What was actually run, and what was not

| Test area | Status | Notes |
|---|---|---|
| Server unit + game-logic tests (39) | **PASSED** (run during development with Node 22) | use an in-memory fake of Socket.IO (`server/tests/helpers/fakeIO.js`), so they exercise the real handlers, rules and timers but not the network layer |
| Real-socket integration tests (`server/tests/integration.test.js`) | **NOT RUN** | need `npm install` (express, socket.io, socket.io-client); the build environment had no internet. Syntax was checked only |
| Client unit tests (`client/src/utils/validation.test.ts`) | **NOT RUN with Vitest** | the same functions were executed once directly in Node and returned the expected values; type-checked in isolation |
| Client TypeScript compile (`npm run build`) | **NOT RUN** | the files pass a syntax check and a stub-based type check (React types were stubbed, so this is only a partial check) |
| Manual browser multiplayer tests | **NOT RUN** | checklist below |
| Responsive / accessibility checks | **NOT RUN** | checklist below |
| Windows PowerShell setup | **NOT RUN** | commands follow your earlier environment description |

## How to run the automated tests

```powershell
cd C:\game_project\server
npm.cmd install
npm.cmd run test:unit      # the 39 tests below (no network needed)
npm.cmd test               # all tests including the real-socket integration test

cd C:\game_project\client
npm.cmd install
npm.cmd test               # Vitest
npm.cmd run build          # TypeScript check + production build
```

Expected: `pass 39 / fail 0` for `test:unit`.

## Actual results: server (`npm run test:unit`)

```
✔ create room: acknowledges with a room view, creator is host in the lobby
✔ create room: invalid nickname and malformed payloads are rejected, server survives
✔ a socket cannot create or join a second room while already in one
✔ join room: success updates every member; code is case-insensitive
✔ join room: invalid code, unknown room, duplicate nickname, full room
✔ join room: refused once the game has started
✔ start game: non-host and too few players are rejected
✔ events from a socket that is not in a room are rejected
✔ only the drawer receives word options; the secret word is never sent to guessers
✔ word selection timeout picks a valid word automatically
✔ drawing: only the drawer can draw, only the same room receives strokes
✔ drawing: malformed payloads are refused and do not crash the server
✔ drawing: flooding is rate limited
✔ drawing is refused when the round is not in the drawing phase
✔ wrong guess: no points, message is shown to the room
✔ correct guess: server awards points once, duplicates earn nothing, word is not broadcast
✔ the drawer cannot guess; guessing outside the drawing phase is refused
✔ all players guessed: turn ends early with a correct summary
✔ drawing time runs out: round ends by timer with no points
✔ full game: drawers rotate, rounds finish, final ranking and rematch work
✔ tie at the end: every top-scoring player is a winner
✔ lobby: host leaves -> next player becomes host; room is deleted when empty
✔ leaving frees the socket to join another room
✔ drawer disconnects mid-round: turn ends, game continues with enough players
✔ too few players left: game ends with the final screen
✔ last unguessed player leaves: round ends because everyone remaining has guessed
✔ room codes are valid and unique
✔ code generation retries on collision
✔ create sets host and player; delete removes the room and stops its timer
✔ guessPoints: full time = 100, half time = 50, never below 10
✔ guessPoints: earlier guess always earns at least as much as a later one
✔ rankPlayers: sorts by score and gives ties the same rank
✔ word options: unique, requested amount, not reused in the same game
✔ maskWord reveals only the length
✔ nickname: trims, collapses spaces and enforces 2-20 characters
✔ room code: normalizes to upper case and checks pattern
✔ guess: required, trimmed and length limited
✔ stroke start: validates coordinates, color and size
✔ stroke move: validates batch size and every point
ℹ tests 39
ℹ pass 39
ℹ fail 0
```

Mapping to the requirements:

- Nickname/room code validation, stroke validation: `validation.test.js`
- Score calculation, ranking and ties, word options, hint masking: `scoring.test.js`
- Room code uniqueness/collision, host, cleanup: `rooms.test.js`
- Create/join/full/duplicate name/started game, host authorization, secret word protection, word timeout, drawing authorization and relay isolation, malformed payloads, flood limiting, correct/incorrect guess, duplicate scoring prevention, round end by all-guessed and by timer, full game with rotation, final results, rematch, host transfer, room removal, drawer disconnect, too-few-players: `game.test.js`
- Health endpoint, real-socket create/join/draw/guess: `integration.test.js` (not run yet)

## Bugs and issues found while testing

| # | What | Cause | Resolution |
|---|---|---|---|
| 1 | `node --test tests/` failed with `Cannot find module .../tests` on Node 22 | Node 22 treats the argument as a file, not a folder | `npm test` now runs `node --test` (auto-discovers `*.test.js`) |
| 2 | One test failed: expected `final`, got `summary` | The test expectation was wrong (with 2 players left and everyone remaining having guessed, ending the round is the intended behavior). The game code was correct | Test corrected |
| 3 | A failing test left room timers running and the test run hung | Cleanup was skipped after the failed assertion | Found and fixed by correcting #2; use `--test-timeout` if you add tests |

No defect in the game rules was found by the 39 tests, which does not prove the absence of defects; the browser tests below are the next step.

## Manual browser test checklist (status: NOT RUN)

Use two or three tabs with different nicknames. Mark each as Pass/Fail when you run it.

| # | Test | Expected result | Result |
|---|---|---|---|
| 1 | Open Home with backend stopped | "Server unavailable" status and banner | |
| 2 | Start backend; refresh | Status becomes Connected | |
| 3 | Create room without nickname | Inline error, nothing sent | |
| 4 | Create room "Asha" | Lobby with code, Host badge | |
| 5 | Tab 2: join with the code in lower case | Both tabs show 2 players | |
| 6 | Join with a wrong code | "Room not found" message | |
| 7 | Non-host tab | No Start button, waiting message | |
| 8 | Host starts | Drawer sees 3 words, guesser sees "X is choosing" | |
| 9 | Drawer picks a word, draws | Strokes appear in the other tab in near real time | |
| 10 | Guesser sees only underscores | Word not visible anywhere (also check DevTools > Network > WS frames) | |
| 11 | Wrong guess, then right guess | Chat shows wrong guess; right guess gives points; "guessed the word" message | |
| 12 | Same correct word again | Rejected, score unchanged | |
| 13 | Round summary appears, next drawer is Player 2 | Yes | |
| 14 | Let timers run out | Round ends by itself, no points | |
| 15 | Final ranking, tie handling | Correct | |
| 16 | Play again (host) | Lobby with scores 0 | |
| 17 | Close the drawer's tab mid-round | Round ends or game ends with message | |
| 18 | Stop and restart the backend while in a room | Clients return to Home with a notice | |
| 19 | Phone on Wi-Fi: draw with a finger | Page does not scroll while drawing; strokes sync | |
| 20 | Resize to 360 px wide | No horizontal scroll | |
| 21 | Tab through the Home page with the keyboard | Visible focus ring on every control | |
| 22 | Open the browser console during a game | No red errors | |
