# Workflow (step by step)

1. **Initial load.** The browser loads the Vite app. `socket.ts` creates one Socket.IO connection to port 3001. `ConnectionStatus` shows Connecting / Connected / Server unavailable. The Home page shows an error banner if the connection fails.
2. **Creating a room.** The player enters a nickname. The client validates it (2-20 chars) and calls `emitWithAck('create_room', { name })`. If the socket is not connected or the server is silent for 5 s, an error is shown. The server validates again, creates a room with a unique code, makes the caller host, and acknowledges with the room view. The client stores it and shows the Lobby.
3. **Joining.** Nickname + code (normalized to upper case). The server checks: valid code, room exists, still in lobby, not full, nickname not taken. Everyone in the room receives `room_updated`.
4. **Lobby.** Shows code, copy button, players with Host badge. Host sees Start game (disabled with an explanation until 2 players). Others see "Waiting for the host". If the host leaves, the next player in join order becomes host.
5. **Starting.** Only the host can send `start_game` (checked on the server). Scores reset; the first drawer is the first player.
6. **Word selection.** Server picks 3 unused words and sends them only to the drawer (`word_options`). The drawer chooses with `select_word` (must be one of the options). After 15 s the server picks one automatically. Others see "X is choosing a word".
7. **Drawing.** Phase becomes `drawing`, canvases are cleared, a 60 s deadline starts. The drawer's pointer moves become `drawing_start` / batched `drawing_move` / `drawing_end` with coordinates in 0..1. The server validates and relays to the other members of the same room.
8. **Guessing.** Guessers see `_ _ _ _` (length only). `submit_guess` is compared on the server (case and surrounding spaces ignored). Wrong guesses appear in the chat. A correct guess is not shown as text; the room sees "X guessed the word!".
9. **Scoring.** `points = max(10, floor(100 * remainingTime / drawTime))` using the server clock. Each player can score once per turn. The drawer gets 20 per correct guesser.
10. **Ending a round.** When time runs out, or every guesser has guessed, or the drawer leaves, the server creates a summary (word, drawer, duration, correct guessers and points, scores) and moves to `summary` for 6 s.
11. **Next round / turn.** After the summary the next player draws. When every player has drawn in every round, the game moves to `final`.
12. **Final leaderboard.** Ranking with shared ranks for ties; all top scorers are winners. Drawing and guessing are refused in this phase.
13. **Rematch.** Host presses Play again: scores reset and everyone returns to the lobby; host starts the next game. Return to home leaves the room.
14. **Disconnection.** A closed tab or lost connection removes the player (see Architecture). If the drawer leaves, the turn ends. If fewer than 2 players remain during a game, the game ends with the final screen and a message.
15. **Server restart.** All rooms are lost. Clients receive a disconnect, return to Home with a notice, and must create a new room.
