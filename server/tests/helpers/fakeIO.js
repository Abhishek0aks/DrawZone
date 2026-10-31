'use strict';
// A minimal in-memory stand-in for Socket.IO so game logic can be tested without a network.
const { RoomStore } = require('../../src/rooms');
const { GameService } = require('../../src/game');
const { registerHandlers } = require('../../src/handlers');
const { DEFAULT_SETTINGS } = require('../../src/config');

class FakeSocket {
  constructor(io, id) {
    this.io = io;
    this.id = id;
    this.data = {};
    this.rooms = new Set([id]); // like real Socket.IO: every socket is in a room named after its id
    this.handlers = {};
    this.received = [];
    io.sockets.set(id, this);
  }
  join(room) { this.rooms.add(room); }
  leave(room) { this.rooms.delete(room); }
  on(event, fn) { this.handlers[event] = fn; }
  to(room) {
    return {
      emit: (event, payload) => {
        for (const s of this.io.sockets.values()) {
          if (s !== this && s.rooms.has(room)) s.received.push({ event, payload });
        }
      },
    };
  }
  // ---- helpers that act like the client ----
  call(event, payload) {
    return new Promise((resolve) => this.handlers[event](payload, resolve));
  }
  fire(event, payload) {
    this.handlers[event](payload); // no ack (like drawing events)
  }
  events(name) { return this.received.filter((r) => r.event === name).map((r) => r.payload); }
  last(name) { const all = this.events(name); return all[all.length - 1]; }
  clear() { this.received = []; }
  disconnect() {
    if (this.handlers.disconnect) this.handlers.disconnect();
    this.io.sockets.delete(this.id);
  }
}

class FakeIO {
  constructor() { this.sockets = new Map(); }
  to(target) {
    return {
      emit: (event, payload) => {
        for (const s of this.sockets.values()) {
          if (s.rooms.has(target)) s.received.push({ event, payload });
        }
      },
    };
  }
}

// Builds a full server-side stack (store + game + handlers) on top of FakeIO.
function createHarness(settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const io = new FakeIO();
  const store = new RoomStore();
  const game = new GameService({ io, store, settings: config });
  let counter = 0;
  function connect(id) {
    counter += 1;
    const socket = new FakeSocket(io, id || `sock${counter}`);
    registerHandlers({ io, socket, store, game, settings: config });
    return socket;
  }
  function cleanup() { store.closeAll(); }
  return { io, store, game, config, connect, cleanup };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { createHarness, sleep };
