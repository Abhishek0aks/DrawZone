# Database and State

**No database is used.** All state is held in the memory of the Node.js server process (`RoomStore` in `server/src/rooms.js`, a `Map` from room code to room object).

## Room object (server)

| Field | Meaning |
|---|---|
| `code` | 5-character room code (alphabet without I, O, 0, 1; collision-checked) |
| `hostId` | socket id of the host |
| `players` | `Map<socketId, { id, name, score }>` (insertion order = join order) |
| `phase` | `lobby`, `choosing`, `drawing`, `summary`, `final` |
| `round`, `queue` | current round (1..3) and the players who still have to draw in it |
| `drawerId`, `drawerName` | current drawer |
| `word`, `options`, `usedWords` | secret word, the 3 offered words, words already used this game |
| `deadline`, `turnStartedAt` | server timestamps (ms) |
| `correct` | `Map<playerId, { id, name, points }>` for this turn (prevents double scoring) |
| `drawerEarned` | points the drawer earned this turn |
| `summary`, `final`, `message` | data shown on the summary/final screens |
| `timer` | the single active `setTimeout` handle for the room |

Strokes are **not stored**; they are relayed live. Therefore a client that connects later does not receive old strokes. This is consistent because joining is not allowed while a game is running.

## Lifecycle and cleanup

- Created by `create_room`.
- Players are removed on `leave_room` or socket `disconnect`.
- When the last player leaves, `RoomStore.delete` removes the room and clears its timer.
- Every phase change replaces the room's single timer (`schedule`/`clearTimer`), so timers do not pile up.
- `createServer().close()` clears all rooms.

## Client state

`useGame` (client/src/hooks/useGame.ts) keeps the latest `RoomView`, the word options (drawer only), chat messages (max 200) and connection info in React state. The client never calculates scores or phases itself.

## Limitations

- Restarting the server deletes every room and game.
- One process only. Running two server instances would give each its own rooms; sharing state would need Redis or a database (out of scope).
- Scores exist only for the length of a room; there are no accounts or history.
