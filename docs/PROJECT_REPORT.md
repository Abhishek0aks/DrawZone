# DrawZone: Project Report

## 1. Introduction
DrawZone is a browser-based, real-time multiplayer drawing and guessing game. Players join a private room using a room code; one player draws a secret word on a shared canvas while the others guess it. Points are awarded for correct guesses and a final leaderboard shows the winner.

## 2. Problem statement
Casual multiplayer games need instant synchronization between many users (drawing, chat, timers, scores). Ordinary request/response web pages cannot push updates to players, and client-side game logic is easy to cheat. The project builds a game where the server coordinates every player in real time and owns all rules.

## 3. Proposed solution
A React single-page client and a Node.js/Express/Socket.IO server. The client displays state and sends player actions. The server validates actions, keeps game state in memory, runs timers and relays drawing data to the players of the same room.

## 4. Objectives
1. Real-time rooms with create/join by code.
2. Server-authoritative game flow: word selection, drawing, guessing, scoring, rounds, final results, rematch.
3. Synchronized shared canvas for mouse and touch.
4. Input validation, authorization, rate limiting and secret-word protection.
5. Responsive, accessible interface.
6. Automated tests and complete documentation.

## 5. Scope
**In scope:** the features above, in-memory state, local/LAN play.
**Out of scope:** accounts and login, database, persistent history, matchmaking, spectators, voice chat, deployment infrastructure, mobile apps.

## 6. Functional requirements
| ID | Requirement | Where implemented |
|---|---|---|
| F1 | Nickname validation (2-20) | `validation.js`, `utils/validation.ts` |
| F2 | Create room, unique code | `rooms.js`, `handlers.js` |
| F3 | Join room with checks (exists, not full, not started, unique name) | `handlers.js` |
| F4 | Lobby, host, host transfer, leave | `LobbyPage`, `game.js` |
| F5 | Only host starts, minimum 2 players | `handlers.js` |
| F6 | Word choice by drawer, timeout auto-pick | `game.js` |
| F7 | Drawing tools and real-time sync | `DrawingBoard`, `handlers.js` |
| F8 | Guessing and chat | `ChatPanel`, `game.js` |
| F9 | Server-side scoring, no duplicate scoring | `scoring.js`, `game.js` |
| F10 | Round summary, final ranking, ties, rematch | `SummaryPage`, `FinalPage`, `game.js` |
| F11 | Connection and error states | `ConnectionStatus`, `useGame`, `emitWithAck` |

## 7. Non-functional requirements
Responsiveness (CSS grid, fixed-ratio canvas), accessibility (labels, focus ring, text badges, reduced motion), security basics (validation, rate limit, room isolation, no HTML injection because React escapes text), maintainability (small modules, tests), performance (stroke batching, normalized coordinates).

## 8. Hardware and software requirements
- Hardware: any computer able to run a modern browser and Node.js; phones/tablets as clients.
- Software: Windows 10/11 (or macOS/Linux), Node.js 18+, npm, VS Code, a modern browser (Chrome, Edge, Firefox), Git (optional).

## 9. Feasibility
- **Technical:** all tools are free and mature. **Economic:** no paid services. **Operational:** runs with two commands; limited by single-process in-memory design. **Schedule:** suitable for an assignment.

## 10. Technology selection
React (component UI driven by state), TypeScript (type safety on shared data shapes), Vite (fast dev), Node.js and Express (same language on both sides, simple HTTP health check), Socket.IO (rooms, acknowledgments, reconnection, fallback transports). No Redux/database/Docker because the requirements do not need them.

## 11. Architecture
See `ARCHITECTURE.md`. Summary: the server owns state; the client renders a per-player view (`RoomView`) and sends intents.

## 12. Implementation overview
- Phases: lobby, choosing, drawing, summary, final. A single timer per room moves the game forward.
- Drawer rotation by join order, one round = every player draws once, default 3 rounds.
- Score: `max(10, floor(100 * remaining / total))`; drawer +20 per correct guess.
- Strokes are relayed as `drawing_start` / `drawing_move` (batches) / `drawing_end` with coordinates 0..1.
- Per-player views keep the secret word away from guessers.
- Rate limiter and payload validation protect the server.

## 13. Testing strategy
Unit and game-logic tests on the server with an in-memory Socket.IO fake; real-socket integration tests; client utility tests; manual multiplayer, responsive and accessibility checklists. Details in `TESTING.md`.

## 14. Results (based on tests actually run)
- 39 server tests passed (validation, scoring, rooms, full game logic including secret-word protection, authorization, rate limiting, disconnects, rematch).
- **Not yet run:** real-socket integration test, Vitest, `npm run build`, browser/mobile tests. These results must be added to `TESTING.md` after you run them.

## 15. Limitations
In-memory state; single process; no authentication (room code is not a secret); no automatic rejoin; no undo or spectators; 50 English words; no persistent scores; the client was not browser-tested by the package author.

## 16. Future enhancements
Persistent storage (Redis/database), reconnect tokens, undo with stroke history, late-join canvas replay, custom word lists and languages, moderation tools, sound, deployment with HTTPS.

## 17. Conclusion
DrawZone demonstrates a complete real-time client/server application with a clear separation of responsibilities, server-authoritative rules and testable game logic. The remaining step for the author is to run the browser-level tests, record the results and add screenshots.
