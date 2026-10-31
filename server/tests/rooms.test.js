'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomStore } = require('../src/rooms');
const { validateRoomCode } = require('../src/validation');

test('room codes are valid and unique', () => {
  const store = new RoomStore();
  const codes = new Set();
  for (let i = 0; i < 500; i += 1) {
    const room = store.create(`s${i}`, `Player${i}`);
    assert.equal(validateRoomCode(room.code).ok, true);
    codes.add(room.code);
  }
  assert.equal(codes.size, 500);
  assert.equal(store.size, 500);
});

test('code generation retries on collision', () => {
  // A rigged random generator that first repeats the same code, then changes.
  let calls = 0;
  const rng = () => (calls++ < 10 ? 0 : 0.5);
  const store = new RoomStore(rng);
  const a = store.create('s1', 'Aa');
  const b = store.create('s2', 'Bb');
  assert.notEqual(a.code, b.code);
});

test('create sets host and player; delete removes the room and stops its timer', () => {
  const store = new RoomStore();
  const room = store.create('host1', 'Hosty');
  assert.equal(room.hostId, 'host1');
  assert.equal(room.players.size, 1);
  assert.equal(room.phase, 'lobby');
  room.timer = setTimeout(() => {}, 100000);
  store.delete(room.code);
  assert.equal(store.get(room.code), null);
  assert.equal(room.timer, null);
});
