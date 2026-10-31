# Architecture

## High-level view

```
 Browser (React + Vite)                    Node.js process (port 3001)
 +--------------------------+   WebSocket  +-----------------------------------+
 | pages / components       |<------------>| Express  (GET /health, 404, errors)|
 | useGame hook (state)     |  Socket.IO   | Socket.IO server                   |
 | one socket.ts instance   |              |   handlers.js  (validate + route)  |
 | DrawingBoard (canvas)    |              |   game.js      (rules, timers)     |
 +--------------------------+              |   rooms.js     (in-memory store)   |
                                           +-----------------------------------+
```

The **server is the single source of truth**. Clients send requests ("create room", "guess", "draw"); the server validates, updates state and sends back what each player is allowed to see.

## Frontend responsibilities

- `socket.ts`: one Socket.IO client for the whole app (URL = same host, port 3001, or `VITE_SERVER_URL`).
- `hooks/useGame.ts`: subscribes to server events (listeners removed on unmount), stores the latest `RoomView`, exposes actions (`createRoom`, `joinRoom`, `startGame`, `selectWord`, `submitGuess`, `leaveRoom`, `playAgain`).
- `utils/emitWithAck.ts`: promise wrapper with timeout and "not connected" handling.
- `App.tsx`: chooses the screen from `room.phase` (no router needed: the whole game is one flow driven by server state).
- Pages: Home, Lobby, Game (includes word selection overlay), Summary, Final.
- `DrawingBoard`: canvas with fixed logical size 800x600, pointer events, batching every 40 ms, remote stroke painting.
- `useCountdown`: countdown from a server `deadline` using the offset `serverNow - clientNow`.

## Backend responsibilities

| File | Responsibility |
|---|---|
| `server.js` | starts listening, port-in-use message, graceful shutdown |
| `src/createServer.js` | Express app, `/health`, 404 JSON, error handler, Socket.IO + CORS, wiring |
| `src/handlers.js` | registers every event; one wrapper does rate limit, error catching and the `{ok}` ack format; membership/host/drawer checks |
| `src/game.js` | `GameService`: phases, timers, drawer rotation, scoring, per-player views, leave handling |
| `src/rooms.js` | `RoomStore`: unique codes, create/get/delete, timer cleanup |
| `src/validation.js` | nickname, room code, guess, stroke validation |
| `src/scoring.js`, `src/words.js` | score formula, ranking with ties, word choice, hint masking |
| `src/rateLimit.js` | small fixed-window limiter |

`GameService` receives `io` as a parameter, so tests replace it with a fake (`tests/helpers/fakeIO.js`).

## State ownership

| State | Owner |
|---|---|
| rooms, players, scores, phase, word, timers | server only |
| what a player may see (`RoomView`) | built by the server per player |
| tool color/size, chat input text, copy-button state | client only |

## Room lifecycle

created (host joins) > players join (lobby only) > game starts > ... > final > rematch (back to lobby) > ... > last player leaves > room deleted.

## Game lifecycle (per turn)

`choosing` (15 s) > `drawing` (60 s, ends early if everybody guessed) > `summary` (6 s) > next drawer, or `final` after the last turn. One round = every player draws once; default 3 rounds.

Drawer rotation is the join order. Players who left are skipped.

## Error handling

- Every handler returns `{ ok: false, error }` for expected problems and a generic message for unexpected exceptions (logged on the server). Malformed payloads cannot crash the process.
- Timer callbacks are wrapped in try/catch.
- Client: connection status chip, "Server unavailable" banner on the Home page, ack timeout message, "Reconnecting" banner, notice toast.
- A disconnect removes the player from the room on the server. When the client reconnects it is a new socket, so the UI returns to Home with a notice.

## Deployment considerations

- Single process, in-memory state: fine for a class project, not for scaling out.
- Set `CLIENT_ORIGINS` on the server to the real website origin(s). Without it only localhost and private LAN addresses are accepted (development default).
- Serve the client build (`npm run build` > `dist/`) from any static host; set `VITE_SERVER_URL` at build time.
- Use HTTPS in production (the clipboard API and many mobile features require a secure context).
