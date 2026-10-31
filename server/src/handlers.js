'use strict';
const { EVENTS } = require('./events');
const {
  validateNickname,
  validateRoomCode,
  validateGuess,
  validateStrokeStart,
  validateStrokeMove,
} = require('./validation');
const { allow } = require('./rateLimit');

// An error whose message is safe to show to the user.
class UserError extends Error {}

function registerHandlers({ socket, store, game, settings }) {
  // Wrap every handler: finds the ack callback, applies rate limit, catches errors,
  // and ALWAYS answers in the same format: { ok: true, ... } or { ok: false, error }.
  function handle(event, limit, fn) {
    socket.on(event, (...args) => {
      const ack = typeof args[args.length - 1] === 'function' ? args.pop() : null;
      const payload = args[0];
      let response;
      try {
        if (limit && !allow(socket, event, limit.max, limit.windowMs)) {
          throw new UserError('You are doing that too fast. Slow down a little.');
        }
        response = { ok: true, ...(fn(payload) || {}) };
      } catch (err) {
        if (err instanceof UserError) {
          response = { ok: false, error: err.message };
        } else {
          console.error(`Handler "${event}" failed:`, err);
          response = { ok: false, error: 'Unexpected server error. Please try again.' };
        }
      }
      if (ack) ack(response);
    });
  }

  function currentRoom() {
    const room = socket.data.roomCode ? store.get(socket.data.roomCode) : null;
    if (!room || !room.players.has(socket.id)) throw new UserError('You are not in a room.');
    return room;
  }

  function requireHost(room) {
    if (room.hostId !== socket.id) throw new UserError('Only the host can do that.');
  }

  function requireDrawer(room) {
    if (room.phase !== 'drawing') throw new UserError('Drawing is not active.');
    if (room.drawerId !== socket.id) throw new UserError('Only the current drawer can draw.');
  }

  function leaveCurrentRoom() {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = store.get(code);
    socket.leave(code);
    socket.data.roomCode = null;
    if (room) game.removePlayer(room, socket.id);
  }

  handle(EVENTS.CREATE_ROOM, { max: 5, windowMs: 10000 }, (payload) => {
    if (socket.data.roomCode) throw new UserError('You are already in a room. Leave it first.');
    const nick = validateNickname(payload && payload.name);
    if (!nick.ok) throw new UserError(nick.error);

    const room = store.create(socket.id, nick.value);
    socket.join(room.code);
    socket.data.roomCode = room.code;
    return { room: game.viewFor(room, socket.id) };
  });

  handle(EVENTS.JOIN_ROOM, { max: 8, windowMs: 10000 }, (payload) => {
    if (socket.data.roomCode) throw new UserError('You are already in a room. Leave it first.');
    const nick = validateNickname(payload && payload.name);
    if (!nick.ok) throw new UserError(nick.error);
    const code = validateRoomCode(payload && payload.code);
    if (!code.ok) throw new UserError(code.error);

    const room = store.get(code.value);
    if (!room) throw new UserError('Room not found. Check the code and try again.');
    if (room.players.has(socket.id)) throw new UserError('You are already in this room.');
    if (room.phase !== 'lobby') throw new UserError('This game has already started. Wait for the next game.');
    if (room.players.size >= settings.maxPlayers) throw new UserError('This room is full.');
    const taken = [...room.players.values()].some((p) => p.name.toLowerCase() === nick.value.toLowerCase());
    if (taken) throw new UserError('That nickname is already used in this room. Choose another one.');

    room.players.set(socket.id, { id: socket.id, name: nick.value, score: 0 });
    socket.join(room.code);
    socket.data.roomCode = room.code;
    game.broadcast(room);
    return { room: game.viewFor(room, socket.id) };
  });

  handle(EVENTS.LEAVE_ROOM, null, () => {
    leaveCurrentRoom();
  });

  handle(EVENTS.START_GAME, { max: 5, windowMs: 5000 }, () => {
    const room = currentRoom();
    requireHost(room);
    if (room.phase !== 'lobby') throw new UserError('The game has already started.');
    if (room.players.size < settings.minPlayers) {
      throw new UserError(`At least ${settings.minPlayers} players are needed to start.`);
    }
    game.startGame(room);
  });

  handle(EVENTS.SELECT_WORD, { max: 5, windowMs: 5000 }, (payload) => {
    const room = currentRoom();
    if (room.phase !== 'choosing') throw new UserError('Word selection is not active.');
    if (room.drawerId !== socket.id) throw new UserError('Only the drawer can choose the word.');
    const word = payload && payload.word;
    if (typeof word !== 'string' || !game.chooseWord(room, word)) throw new UserError('Invalid word choice.');
  });

  handle(EVENTS.SUBMIT_GUESS, { max: 6, windowMs: 3000 }, (payload) => {
    const room = currentRoom();
    const guess = validateGuess(payload && payload.text);
    if (!guess.ok) throw new UserError(guess.error);
    if (room.phase !== 'drawing') throw new UserError('Guessing is not active right now.');
    if (room.drawerId === socket.id) throw new UserError('The drawer cannot guess.');
    if (room.correct.has(socket.id)) throw new UserError('You already guessed the word.');
    const result = game.submitGuess(room, socket.id, guess.value);
    if (!result) throw new UserError('Guess not accepted.');
    return { correct: result.correct };
  });

  handle(EVENTS.PLAY_AGAIN, { max: 3, windowMs: 5000 }, () => {
    const room = currentRoom();
    requireHost(room);
    if (!game.playAgain(room)) throw new UserError('A rematch is only possible after the game is over.');
  });

  // ----- drawing: validate, then relay to the OTHER members of the same room only -----
  const DRAW_LIMIT = { max: 240, windowMs: 1000 };

  handle(EVENTS.DRAWING_START, DRAW_LIMIT, (payload) => {
    const room = currentRoom();
    requireDrawer(room);
    const clean = validateStrokeStart(payload);
    if (!clean) throw new UserError('Invalid drawing data.');
    socket.to(room.code).emit(EVENTS.DRAWING_START, clean);
  });

  handle(EVENTS.DRAWING_MOVE, DRAW_LIMIT, (payload) => {
    const room = currentRoom();
    requireDrawer(room);
    const clean = validateStrokeMove(payload);
    if (!clean) throw new UserError('Invalid drawing data.');
    socket.to(room.code).emit(EVENTS.DRAWING_MOVE, clean);
  });

  handle(EVENTS.DRAWING_END, DRAW_LIMIT, () => {
    const room = currentRoom();
    requireDrawer(room);
    socket.to(room.code).emit(EVENTS.DRAWING_END, {});
  });

  handle(EVENTS.CLEAR_CANVAS, { max: 10, windowMs: 2000 }, () => {
    const room = currentRoom();
    requireDrawer(room);
    socket.to(room.code).emit(EVENTS.CLEAR_CANVAS, {});
  });

  socket.on('disconnect', () => {
    try {
      leaveCurrentRoom();
    } catch (err) {
      console.error('Disconnect cleanup failed:', err);
    }
  });
}

module.exports = { registerHandlers, UserError };
