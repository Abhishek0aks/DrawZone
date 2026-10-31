'use strict';
const { ROOM_CODE_ALPHABET } = require('./validation');
const { LIMITS } = require('./config');

// In-memory room store. Everything is lost when the server restarts (documented limitation).
class RoomStore {
  constructor(rng = Math.random) {
    this.rooms = new Map();
    this.rng = rng;
  }

  generateCode() {
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      let code = '';
      for (let i = 0; i < LIMITS.roomCodeLength; i += 1) {
        code += ROOM_CODE_ALPHABET[Math.floor(this.rng() * ROOM_CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code; // collision check
    }
    throw new Error('Could not generate a unique room code');
  }

  create(hostId, hostName) {
    const room = {
      code: this.generateCode(),
      hostId,
      players: new Map([[hostId, { id: hostId, name: hostName, score: 0 }]]),
      phase: 'lobby', // lobby | choosing | drawing | summary | final
      round: 0,
      queue: [],
      drawerId: null,
      drawerName: null,
      word: null,
      options: [],
      usedWords: new Set(),
      deadline: null,
      turnStartedAt: null,
      correct: new Map(), // playerId -> { id, name, points }
      drawerEarned: 0,
      summary: null,
      final: null,
      message: null,
      timer: null,
      chatSeq: 0,
    };
    this.rooms.set(room.code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(code) || null;
  }

  // Removes the room and stops its timer (prevents memory leaks).
  delete(code) {
    const room = this.rooms.get(code);
    if (room && room.timer) clearTimeout(room.timer);
    if (room) room.timer = null;
    this.rooms.delete(code);
  }

  closeAll() {
    for (const code of [...this.rooms.keys()]) this.delete(code);
  }

  get size() {
    return this.rooms.size;
  }
}

module.exports = { RoomStore };
