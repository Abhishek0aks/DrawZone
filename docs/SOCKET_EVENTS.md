# Socket.IO Event Reference

Event names live in `server/src/events.js` and are copied to `client/src/types/events.ts`.

## Acknowledgment format (all client-to-server events with an ack)

```
success: { ok: true, ...data }
failure: { ok: false, error: "safe human-readable message" }
```

The client helper `emitWithAck` (client/src/utils/emitWithAck.ts) adds a 5 second timeout and a "not connected" check, so a click never hangs silently.

**Identity:** the server uses `socket.id` as the player id and `socket.data.roomCode` for membership. Player ids, host ids, scores and room codes sent by the client are never trusted for authorization.

## Client to server

| Event | Payload | Validation | Authorization | Ack | State change | Recipients of side effects |
|---|---|---|---|---|---|---|
| `create_room` | `{ name }` | nickname 2-20 chars, trimmed, no control chars | socket must not be in a room | `{ ok, room }` (RoomView) | new room, caller is host | none (caller gets ack) |
| `join_room` | `{ name, code }` | nickname; code normalized to upper case, 5 chars from `A-HJ-NP-Z2-9` | not in a room; room exists; phase is `lobby`; not full; nickname unique in room (case-insensitive) | `{ ok, room }` | player added | `room_updated` to all members |
| `leave_room` | `{}` | - | - | `{ ok }` | player removed; host transferred; empty room deleted | `room_updated` (or game events) to the rest |
| `start_game` | `{}` | - | host only; phase `lobby`; players >= 2 | `{ ok }` | scores reset, first turn begins | `room_updated`, `word_options` (drawer only) |
| `select_word` | `{ word }` | must be one of the current options | current drawer only; phase `choosing` | `{ ok }` | phase `drawing`, timer starts | `clear_canvas`, `round_started`, `room_updated` to room |
| `submit_guess` | `{ text }` | 1-60 chars, trimmed | phase `drawing`; not the drawer; not already correct | `{ ok, correct: boolean }` | wrong: chat only. correct: score updates | `chat_message`, `correct_guess`, `room_updated` to room |
| `play_again` | `{}` | - | host only; phase `final` | `{ ok }` | scores reset, back to `lobby` | `room_updated` |
| `drawing_start` | `{ x, y, color, size }` | x,y numbers 0..1; color `#RRGGBB`; size 1..60 | current drawer, phase `drawing` | `{ ok }` (optional) | none | `drawing_start` to **other** members of the room |
| `drawing_move` | `{ points: [{x,y}, ...] }` | 1..64 points, each 0..1 | current drawer, phase `drawing` | `{ ok }` (optional) | none | `drawing_move` to other members |
| `drawing_end` | `{}` | - | current drawer, phase `drawing` | `{ ok }` (optional) | none | `drawing_end` to other members |
| `clear_canvas` | `{}` | - | current drawer, phase `drawing` | `{ ok }` | none | `clear_canvas` to other members |

Rate limits (per socket): `create_room` 5/10 s, `join_room` 8/10 s, `start_game` 5/5 s, `select_word` 5/5 s, `submit_guess` 6/3 s, `play_again` 3/5 s, drawing events 240/s, `clear_canvas` 10/2 s. Excess requests get `{ ok: false, error: "You are doing that too fast..." }`. Socket.IO also limits a single message to 100 KB.

## Server to client

| Event | Payload | Recipients |
|---|---|---|
| `room_updated` | `RoomView` (see `client/src/types/index.ts`). Built **per player**: the secret word is included only for the drawer while drawing; guessers get `hint` (underscores) | each member separately |
| `word_options` | `{ options: string[3], deadline }` | the drawer only |
| `round_started` | `{ drawerId, wordLength, deadline }` | whole room |
| `clear_canvas` | `{}` | whole room when drawing starts; other members when the drawer clears |
| `chat_message` | `{ id, kind: 'guess' \| 'correct', name?, text }` | whole room |
| `correct_guess` | `{ playerId, name }` | whole room (the client currently does not subscribe; the same information arrives as a chat message and in `room_updated`) |
| `room_error` | `{ message }` | defined and handled by the client, **not emitted by the current server** (reserved) |

Standard Socket.IO events used: `connect`, `disconnect`, `connect_error`.

## Differences from the suggested event list in the project brief

- `round_timer`, `round_ended`, `game_over`, `guess_result`: not separate events. The server sends a `deadline` (server timestamp) and the phase in `room_updated`; clients compute the countdown. Round end = `phase: 'summary'` with `summary`; game end = `phase: 'final'` with `final`. A guess result is the acknowledgment of `submit_guess`.
- Drawing is sent as `drawing_start` / `drawing_move` / `drawing_end` with coordinates normalized to 0..1, so different screen sizes show the same picture.

## RoomView phases

`lobby` > `choosing` > `drawing` > `summary` > (`choosing` again, or `final`) > `lobby` (rematch).
