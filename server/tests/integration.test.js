'use strict';
// Integration tests over REAL sockets. Needs: npm install (express, socket.io, socket.io-client).
const test = require('node:test');
const assert = require('node:assert/strict');
const { io: connectClient } = require('socket.io-client');
const { createServer } = require('../src/createServer');
const { EVENTS: E } = require('../src/events');

let app;
let url;
const clients = [];

test.before(async () => {
  app = createServer({ settings: { chooseSeconds: 5, drawSeconds: 5, summarySeconds: 5 } });
  await new Promise((resolve) => app.httpServer.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${app.httpServer.address().port}`;
});

test.after(async () => {
  clients.forEach((c) => c.disconnect());
  await app.close();
});

function client() {
  const c = connectClient(url, { transports: ['websocket'], forceNew: true });
  clients.push(c);
  c.log = [];
  c.onAny((event, payload) => c.log.push({ event, payload }));
  return new Promise((resolve, reject) => {
    c.on('connect', () => resolve(c));
    c.on('connect_error', reject);
  });
}

const call = (c, event, payload) => new Promise((resolve) => c.timeout(3000).emit(event, payload, (err, res) => resolve(err ? { ok: false, error: 'timeout' } : res)));
const waitFor = async (fn, ms = 2000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = fn(); if (v) return v; await new Promise((r) => setTimeout(r, 20)); }
  throw new Error('condition not met in time');
};

test('GET /health returns ok and unknown routes return JSON 404', async () => {
  const health = await fetch(`${url}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const missing = await fetch(`${url}/nope`);
  assert.equal(missing.status, 404);
});

test('two clients: create room, join, drawing relay and a correct guess over real sockets', async () => {
  const a = await client();
  const b = await client();
  const created = await call(a, E.CREATE_ROOM, { name: 'Anaya' });
  assert.equal(created.ok, true);

  const bad = await call(b, E.JOIN_ROOM, { name: 'Bela', code: 'ZZZZZ' });
  assert.equal(bad.ok, false);

  const joined = await call(b, E.JOIN_ROOM, { name: 'Bela', code: created.room.code });
  assert.equal(joined.ok, true);
  await waitFor(() => a.log.find((l) => l.event === E.ROOM_UPDATED && l.payload.players.length === 2));

  assert.equal((await call(b, E.START_GAME, {})).ok, false); // not the host
  assert.equal((await call(a, E.START_GAME, {})).ok, true);

  const opts = await waitFor(() => a.log.find((l) => l.event === E.WORD_OPTIONS));
  assert.equal(b.log.some((l) => l.event === E.WORD_OPTIONS), false);
  const word = opts.payload.options[0];
  assert.equal((await call(a, E.SELECT_WORD, { word })).ok, true);
  await waitFor(() => b.log.find((l) => l.event === E.ROUND_STARTED));

  a.emit(E.DRAWING_START, { x: 0.1, y: 0.1, color: '#000000', size: 6 });
  await waitFor(() => b.log.find((l) => l.event === E.DRAWING_START));

  const right = await call(b, E.SUBMIT_GUESS, { text: word });
  assert.equal(right.ok, true);
  assert.equal(right.correct, true);
  const summary = await waitFor(() => b.log.find((l) => l.event === E.ROOM_UPDATED && l.payload.phase === 'summary'));
  assert.equal(summary.payload.summary.word, word);
});
