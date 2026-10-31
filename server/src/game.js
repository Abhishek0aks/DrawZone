'use strict';
const { EVENTS } = require('./events');
const { pickWordOptions, maskWord, normalizeGuess } = require('./words');
const { guessPoints, rankPlayers } = require('./scoring');

const ACTIVE_TURN = new Set(['choosing', 'drawing']);
const IN_GAME = new Set(['choosing', 'drawing', 'summary']);

// GameService owns ALL game rules: phases, timers, drawer rotation and scoring.
// The server is the only authority; clients just display what they receive.
class GameService {
  constructor({ io, store, settings, now = Date.now, rng = Math.random }) {
    this.io = io;
    this.store = store;
    this.settings = settings;
    this.now = now;
    this.rng = rng;
  }

  // ---------- helpers ----------
  ms(seconds) {
    return Math.round(seconds * 1000);
  }

  schedule(room, delayMs, fn) {
    this.clearTimer(room);
    room.timer = setTimeout(() => {
      room.timer = null;
      try {
        fn();
      } catch (err) {
        console.error('Timer callback failed:', err);
      }
    }, delayMs);
  }

  clearTimer(room) {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
  }

  toRoom(room, event, payload) {
    this.io.to(room.code).emit(event, payload);
  }

  chat(room, message) {
    room.chatSeq += 1;
    this.toRoom(room, EVENTS.CHAT_MESSAGE, { id: room.chatSeq, ...message });
  }

  // What ONE player is allowed to see. The secret word is only included for the drawer
  // (while drawing) and for everyone after the turn ended (in the summary).
  viewFor(room, viewerId) {
    const isDrawing = room.phase === 'drawing';
    return {
      youId: viewerId,
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      round: room.round,
      totalRounds: this.settings.rounds,
      settings: {
        minPlayers: this.settings.minPlayers,
        maxPlayers: this.settings.maxPlayers,
        drawSeconds: this.settings.drawSeconds,
        chooseSeconds: this.settings.chooseSeconds,
      },
      players: [...room.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        isHost: p.id === room.hostId,
        isDrawer: p.id === room.drawerId && ACTIVE_TURN.has(room.phase),
        hasGuessed: room.correct.has(p.id),
      })),
      drawerId: ACTIVE_TURN.has(room.phase) ? room.drawerId : null,
      drawerName: ACTIVE_TURN.has(room.phase) ? room.drawerName : null,
      hint: isDrawing ? maskWord(room.word) : null,
      word: isDrawing && viewerId === room.drawerId ? room.word : null,
      deadline: room.deadline,
      serverNow: this.now(),
      summary: room.phase === 'summary' ? room.summary : null,
      final: room.phase === 'final' ? room.final : null,
      message: room.message,
    };
  }

  broadcast(room) {
    for (const id of room.players.keys()) {
      this.io.to(id).emit(EVENTS.ROOM_UPDATED, this.viewFor(room, id));
    }
  }

  allGuessed(room) {
    const guessers = [...room.players.keys()].filter((id) => id !== room.drawerId);
    return guessers.length > 0 && guessers.every((id) => room.correct.has(id));
  }

  // ---------- game flow ----------
  startGame(room) {
    if (room.phase !== 'lobby') return false;
    for (const p of room.players.values()) p.score = 0;
    room.round = 0;
    room.queue = [];
    room.usedWords = new Set();
    room.message = null;
    room.final = null;
    this.nextTurn(room);
    return true;
  }

  // Predictable rotation: in each round every player draws once, in join order.
  nextTurn(room) {
    if (room.queue.length === 0) {
      room.round += 1;
      if (room.round > this.settings.rounds) {
        this.finishGame(room, null);
        return;
      }
      room.queue = [...room.players.keys()];
    }
    while (room.queue.length > 0) {
      const id = room.queue.shift();
      if (room.players.has(id)) {
        this.beginChoosing(room, id);
        return;
      }
    }
    this.nextTurn(room); // everybody in this queue left: go to the next round
  }

  beginChoosing(room, drawerId) {
    room.phase = 'choosing';
    room.drawerId = drawerId;
    room.drawerName = room.players.get(drawerId).name;
    room.word = null;
    room.options = pickWordOptions(room.usedWords, this.settings.wordChoices, this.rng);
    room.correct = new Map();
    room.drawerEarned = 0;
    room.summary = null;
    room.turnStartedAt = null;
    room.deadline = this.now() + this.ms(this.settings.chooseSeconds);

    this.schedule(room, this.ms(this.settings.chooseSeconds), () => {
      // Drawer did not choose in time: pick a valid word automatically.
      if (room.phase === 'choosing') {
        const pick = room.options[Math.floor(this.rng() * room.options.length)];
        this.chooseWord(room, pick);
      }
    });

    this.broadcast(room);
    // Only the drawer receives the options.
    this.io.to(drawerId).emit(EVENTS.WORD_OPTIONS, { options: room.options, deadline: room.deadline });
  }

  chooseWord(room, word) {
    if (room.phase !== 'choosing' || !room.options.includes(word)) return false;
    room.word = word;
    room.usedWords.add(word);
    room.phase = 'drawing';
    room.turnStartedAt = this.now();
    room.deadline = room.turnStartedAt + this.ms(this.settings.drawSeconds);
    this.schedule(room, this.ms(this.settings.drawSeconds), () => this.endTurn(room, 'time'));

    this.toRoom(room, EVENTS.CLEAR_CANVAS, {});
    this.toRoom(room, EVENTS.ROUND_STARTED, {
      drawerId: room.drawerId,
      wordLength: word.length,
      deadline: room.deadline,
    });
    this.broadcast(room);
    return true;
  }

  // Returns { correct: boolean, points?: number }
  submitGuess(room, playerId, text) {
    const player = room.players.get(playerId);
    if (room.phase !== 'drawing' || !player || playerId === room.drawerId || room.correct.has(playerId)) {
      return null; // handler turns this into a friendly error
    }

    if (normalizeGuess(text) !== normalizeGuess(room.word)) {
      this.chat(room, { kind: 'guess', name: player.name, text });
      return { correct: false };
    }

    // Correct guess: points depend only on the SERVER clock.
    const remaining = room.deadline - this.now();
    const points = guessPoints(remaining, this.ms(this.settings.drawSeconds), this.settings);
    player.score += points;
    room.correct.set(playerId, { id: playerId, name: player.name, points });

    const drawer = room.players.get(room.drawerId);
    if (drawer) {
      drawer.score += this.settings.drawerPointsPerGuess;
      room.drawerEarned += this.settings.drawerPointsPerGuess;
    }

    // The word itself is never broadcast.
    this.chat(room, { kind: 'correct', name: player.name, text: `${player.name} guessed the word!` });
    this.toRoom(room, EVENTS.CORRECT_GUESS, { playerId, name: player.name });
    this.broadcast(room);

    if (this.allGuessed(room)) this.endTurn(room, 'all_guessed');
    return { correct: true, points };
  }

  endTurn(room, reason) {
    if (!ACTIVE_TURN.has(room.phase)) return; // protects against duplicate calls
    this.clearTimer(room);
    const elapsed = room.turnStartedAt ? Math.round((this.now() - room.turnStartedAt) / 1000) : 0;
    room.summary = {
      word: room.word,
      drawerId: room.drawerId,
      drawerName: room.drawerName,
      durationSeconds: elapsed,
      guessers: [...room.correct.values()],
      drawerPoints: room.drawerEarned,
      reason,
      scores: rankPlayers([...room.players.values()]),
      round: room.round,
      totalRounds: this.settings.rounds,
      isLastTurn: room.round >= this.settings.rounds && room.queue.every((id) => !room.players.has(id)),
    };
    room.phase = 'summary';
    room.deadline = this.now() + this.ms(this.settings.summarySeconds);
    this.schedule(room, this.ms(this.settings.summarySeconds), () => this.nextTurn(room));
    this.broadcast(room);
  }

  finishGame(room, message) {
    this.clearTimer(room);
    const ranking = rankPlayers([...room.players.values()]);
    const topScore = ranking.length > 0 ? ranking[0].score : 0;
    room.final = {
      ranking,
      // Tie rule: everybody with the top score is a winner.
      winners: ranking.filter((p) => p.score === topScore).map((p) => p.name),
    };
    room.phase = 'final';
    room.drawerId = null;
    room.drawerName = null;
    room.word = null;
    room.deadline = null;
    room.message = message;
    this.broadcast(room);
  }

  // Rematch: scores and round state reset, everybody returns to the lobby.
  playAgain(room) {
    if (room.phase !== 'final') return false;
    this.clearTimer(room);
    for (const p of room.players.values()) p.score = 0;
    room.phase = 'lobby';
    room.round = 0;
    room.queue = [];
    room.drawerId = null;
    room.drawerName = null;
    room.word = null;
    room.options = [];
    room.correct = new Map();
    room.summary = null;
    room.final = null;
    room.message = null;
    room.deadline = null;
    this.broadcast(room);
    return true;
  }

  // Called when a player leaves or disconnects.
  removePlayer(room, playerId) {
    if (!room.players.has(playerId)) return;
    const wasDrawer = playerId === room.drawerId;
    room.players.delete(playerId);
    room.correct.delete(playerId);

    if (room.players.size === 0) {
      this.store.delete(room.code); // empty room: remove it and its timers
      return;
    }
    if (room.hostId === playerId) {
      room.hostId = room.players.keys().next().value; // host transfer: longest-present player
    }

    if (!IN_GAME.has(room.phase)) {
      this.broadcast(room);
      return;
    }
    if (room.players.size < this.settings.minPlayers) {
      this.finishGame(room, 'Game ended because there are not enough players left.');
      return;
    }
    if (wasDrawer && ACTIVE_TURN.has(room.phase)) {
      this.endTurn(room, 'drawer_left');
      return;
    }
    if (room.phase === 'drawing' && this.allGuessed(room)) {
      this.endTurn(room, 'all_guessed');
      return;
    }
    this.broadcast(room);
  }
}

module.exports = { GameService };
