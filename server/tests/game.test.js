'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, sleep } = require('./helpers/fakeIO');
const { EVENTS: E } = require('../src/events');

// Creates a room with `count` players. sockets[0] is the host.
async function setup(h, count) {
  const sockets = [];
  const first = h.connect();
  const created = await first.call(E.CREATE_ROOM, { name: 'Player1' });
  assert.equal(created.ok, true);
  sockets.push(first);
  for (let i = 2; i <= count; i += 1) {
    const s = h.connect();
    const joined = await s.call(E.JOIN_ROOM, { name: `Player${i}`, code: created.room.code });
    assert.equal(joined.ok, true);
    sockets.push(s);
  }
  return { sockets, code: created.room.code, room: h.store.get(created.room.code) };
}

// Starts the game and lets the drawer (Player1) choose the first option. Returns the secret word.
async function startAndChoose(ctx) {
  const [host, ...others] = ctx.sockets;
  const started = await host.call(E.START_GAME, {});
  assert.equal(started.ok, true, started.error);
  const options = host.last(E.WORD_OPTIONS).options;
  const chosen = await host.call(E.SELECT_WORD, { word: options[0] });
  assert.equal(chosen.ok, true, chosen.error);
  assert.ok(others.length >= 1);
  return options[0];
}

// ---------------- create / join ----------------
test('create room: acknowledges with a room view, creator is host in the lobby', async () => {
  const h = createHarness();
  const s = h.connect();
  const res = await s.call(E.CREATE_ROOM, { name: '  Riya ' });
  assert.equal(res.ok, true);
  assert.match(res.room.code, /^[A-Z0-9]{5}$/);
  assert.equal(res.room.hostId, s.id);
  assert.equal(res.room.phase, 'lobby');
  assert.equal(res.room.players[0].name, 'Riya');
  assert.equal(h.store.size, 1);
  h.cleanup();
});

test('create room: invalid nickname and malformed payloads are rejected, server survives', async () => {
  const h = createHarness();
  const s = h.connect();
  for (const bad of [undefined, null, {}, { name: '' }, { name: 'A' }, { name: 42 }, 'text']) {
    const res = await s.call(E.CREATE_ROOM, bad);
    assert.equal(res.ok, false);
    assert.equal(typeof res.error, 'string');
  }
  assert.equal(h.store.size, 0);
  h.cleanup();
});

test('a socket cannot create or join a second room while already in one', async () => {
  const h = createHarness();
  const s = h.connect();
  const a = await s.call(E.CREATE_ROOM, { name: 'Riya' });
  const again = await s.call(E.CREATE_ROOM, { name: 'Riya' });
  assert.equal(again.ok, false);
  const join = await s.call(E.JOIN_ROOM, { name: 'Riya', code: a.room.code });
  assert.equal(join.ok, false);
  assert.equal(h.store.get(a.room.code).players.size, 1);
  h.cleanup();
});

test('join room: success updates every member; code is case-insensitive', async () => {
  const h = createHarness();
  const host = h.connect();
  const created = await host.call(E.CREATE_ROOM, { name: 'Host' });
  host.clear();
  const guest = h.connect();
  const res = await guest.call(E.JOIN_ROOM, { name: 'Guest', code: created.room.code.toLowerCase() });
  assert.equal(res.ok, true);
  assert.equal(res.room.players.length, 2);
  const update = host.last(E.ROOM_UPDATED);
  assert.equal(update.players.length, 2);
  h.cleanup();
});

test('join room: invalid code, unknown room, duplicate nickname, full room', async () => {
  const h = createHarness({ maxPlayers: 2 });
  const host = h.connect();
  const created = await host.call(E.CREATE_ROOM, { name: 'Host' });
  const g = h.connect();
  assert.equal((await g.call(E.JOIN_ROOM, { name: 'Guest', code: '' })).ok, false);
  assert.equal((await g.call(E.JOIN_ROOM, { name: 'Guest', code: 'abc' })).ok, false);
  const missing = await g.call(E.JOIN_ROOM, { name: 'Guest', code: 'ZZZZZ' });
  assert.equal(missing.ok, false);
  assert.match(missing.error, /not found/i);
  const dup = await g.call(E.JOIN_ROOM, { name: 'HOST', code: created.room.code });
  assert.equal(dup.ok, false);
  assert.match(dup.error, /nickname/i);
  assert.equal((await g.call(E.JOIN_ROOM, { name: 'Guest', code: created.room.code })).ok, true);
  const g3 = h.connect();
  const full = await g3.call(E.JOIN_ROOM, { name: 'Third', code: created.room.code });
  assert.equal(full.ok, false);
  assert.match(full.error, /full/i);
  h.cleanup();
});

test('join room: refused once the game has started', async () => {
  const h = createHarness();
  const ctx = await setup(h, 2);
  await ctx.sockets[0].call(E.START_GAME, {});
  const late = h.connect();
  const res = await late.call(E.JOIN_ROOM, { name: 'Late', code: ctx.code });
  assert.equal(res.ok, false);
  assert.match(res.error, /already started/i);
  h.cleanup();
});

// ---------------- host rules ----------------
test('start game: non-host and too few players are rejected', async () => {
  const h = createHarness();
  const host = h.connect();
  const created = await host.call(E.CREATE_ROOM, { name: 'Host' });
  const alone = await host.call(E.START_GAME, {});
  assert.equal(alone.ok, false);
  assert.match(alone.error, /at least 2/i);

  const guest = h.connect();
  await guest.call(E.JOIN_ROOM, { name: 'Guest', code: created.room.code });
  const notHost = await guest.call(E.START_GAME, {});
  assert.equal(notHost.ok, false);
  assert.match(notHost.error, /host/i);
  assert.equal(h.store.get(created.room.code).phase, 'lobby');

  assert.equal((await host.call(E.START_GAME, {})).ok, true);
  assert.equal((await host.call(E.START_GAME, {})).ok, false); // cannot start twice
  h.cleanup();
});

test('events from a socket that is not in a room are rejected', async () => {
  const h = createHarness();
  const s = h.connect();
  for (const ev of [E.START_GAME, E.SELECT_WORD, E.SUBMIT_GUESS, E.PLAY_AGAIN, E.CLEAR_CANVAS]) {
    const res = await s.call(ev, { word: 'x', text: 'x' });
    assert.equal(res.ok, false, ev);
  }
  h.cleanup();
});

// ---------------- secrecy ----------------
test('only the drawer receives word options; the secret word is never sent to guessers', async () => {
  const h = createHarness();
  const ctx = await setup(h, 3);
  const [drawer, g1, g2] = ctx.sockets;
  await drawer.call(E.START_GAME, {});

  assert.equal(drawer.events(E.WORD_OPTIONS).length, 1);
  assert.equal(drawer.last(E.WORD_OPTIONS).options.length, 3);
  assert.equal(g1.events(E.WORD_OPTIONS).length, 0);
  assert.equal(g2.events(E.WORD_OPTIONS).length, 0);

  // a guesser cannot pick the word
  const options = drawer.last(E.WORD_OPTIONS).options;
  const cheat = await g1.call(E.SELECT_WORD, { word: options[0] });
  assert.equal(cheat.ok, false);
  // an invalid word is refused
  assert.equal((await drawer.call(E.SELECT_WORD, { word: 'not-an-option' })).ok, false);

  const word = options[1];
  assert.equal((await drawer.call(E.SELECT_WORD, { word })).ok, true);

  const everythingGuessersGot = JSON.stringify([...g1.received, ...g2.received]);
  assert.ok(!everythingGuessersGot.includes(word), 'secret word leaked to a guesser');
  for (const options2 of options) {
    assert.ok(!everythingGuessersGot.includes(`"${options2}"`), 'word option leaked to a guesser');
  }
  const guesserView = g1.last(E.ROOM_UPDATED);
  assert.equal(guesserView.word, null);
  assert.equal(guesserView.hint, '_'.repeat(word.length));
  assert.equal(drawer.last(E.ROOM_UPDATED).word, word); // drawer knows it
  h.cleanup();
});

test('word selection timeout picks a valid word automatically', async () => {
  const h = createHarness({ chooseSeconds: 0.05, drawSeconds: 5 });
  const ctx = await setup(h, 2);
  await ctx.sockets[0].call(E.START_GAME, {});
  const options = ctx.sockets[0].last(E.WORD_OPTIONS).options;
  await sleep(150);
  const room = ctx.room;
  assert.equal(room.phase, 'drawing');
  assert.ok(options.includes(room.word));
  h.cleanup();
});

// ---------------- drawing ----------------
test('drawing: only the drawer can draw, only the same room receives strokes', async () => {
  const h = createHarness();
  const ctx = await setup(h, 3);
  const [drawer, g1, g2] = ctx.sockets;
  const outsiderRoom = h.connect();
  await outsiderRoom.call(E.CREATE_ROOM, { name: 'Other' });
  const stranger = h.connect(); // not in any room
  await startAndChoose(ctx);
  [drawer, g1, g2, outsiderRoom, stranger].forEach((s) => s.clear());

  drawer.fire(E.DRAWING_START, { x: 0.1, y: 0.2, color: '#000000', size: 6 });
  drawer.fire(E.DRAWING_MOVE, { points: [{ x: 0.2, y: 0.3 }, { x: 0.3, y: 0.4 }] });
  drawer.fire(E.DRAWING_END, {});
  assert.equal(g1.events(E.DRAWING_START).length, 1);
  assert.equal(g2.events(E.DRAWING_MOVE)[0].points.length, 2);
  assert.equal(g1.events(E.DRAWING_END).length, 1);
  assert.equal(drawer.events(E.DRAWING_START).length, 0); // not echoed to the drawer
  assert.equal(outsiderRoom.received.length, 0);
  assert.equal(stranger.received.length, 0);

  // guesser tries to draw -> nothing is relayed
  g1.clear(); g2.clear(); drawer.clear();
  const res = await g1.call(E.DRAWING_START, { x: 0.1, y: 0.1, color: '#000000', size: 4 });
  assert.equal(res.ok, false);
  g1.fire(E.DRAWING_MOVE, { points: [{ x: 0.1, y: 0.1 }] });
  assert.equal(drawer.received.length, 0);
  assert.equal(g2.received.length, 0);
  h.cleanup();
});

test('drawing: malformed payloads are refused and do not crash the server', async () => {
  const h = createHarness();
  const ctx = await setup(h, 2);
  await startAndChoose(ctx);
  const [drawer, guest] = ctx.sockets;
  guest.clear();
  const bad = [undefined, null, 5, 'x', {}, { x: 5, y: 5, color: '#000000', size: 4 }, { x: 0, y: 0, color: 'red', size: 4 },
    { x: 0, y: 0, color: '#000000', size: 9999 }, { points: 'no' }, { points: [{ x: 'a', y: 1 }] }];
  for (const payload of bad) {
    assert.equal((await drawer.call(E.DRAWING_START, payload)).ok, false);
    assert.equal((await drawer.call(E.DRAWING_MOVE, payload)).ok, false);
  }
  assert.equal(guest.received.length, 0);
  // still works afterwards
  assert.equal((await drawer.call(E.CLEAR_CANVAS, {})).ok, true);
  assert.equal(guest.events(E.CLEAR_CANVAS).length, 1);
  h.cleanup();
});

test('drawing: flooding is rate limited', async () => {
  const h = createHarness();
  const ctx = await setup(h, 2);
  await startAndChoose(ctx);
  const [drawer, guest] = ctx.sockets;
  guest.clear();
  let rejected = 0;
  for (let i = 0; i < 400; i += 1) {
    const res = await drawer.call(E.DRAWING_MOVE, { points: [{ x: 0.5, y: 0.5 }] });
    if (!res.ok) rejected += 1;
  }
  assert.ok(rejected > 100, `expected rate limiting, rejected=${rejected}`);
  assert.ok(guest.events(E.DRAWING_MOVE).length <= 240);
  h.cleanup();
});

test('drawing is refused when the round is not in the drawing phase', async () => {
  const h = createHarness();
  const ctx = await setup(h, 2);
  const drawer = ctx.sockets[0];
  await drawer.call(E.START_GAME, {}); // phase = choosing
  const res = await drawer.call(E.DRAWING_START, { x: 0.1, y: 0.1, color: '#000000', size: 4 });
  assert.equal(res.ok, false);
  h.cleanup();
});

// ---------------- guessing & scoring ----------------
test('wrong guess: no points, message is shown to the room', async () => {
  const h = createHarness();
  const ctx = await setup(h, 3);
  const word = await startAndChoose(ctx);
  const [drawer, g1, g2] = ctx.sockets;
  g2.clear();
  const res = await g1.call(E.SUBMIT_GUESS, { text: word === 'apple' ? 'banana' : 'apple' });
  assert.deepEqual(res, { ok: true, correct: false });
  assert.equal(ctx.room.players.get(g1.id).score, 0);
  assert.equal(g2.events(E.CHAT_MESSAGE)[0].kind, 'guess');
  assert.equal(drawer.events(E.CHAT_MESSAGE).length >= 1, true);
  h.cleanup();
});

test('correct guess: server awards points once, duplicates earn nothing, word is not broadcast', async () => {
  const h = createHarness({ drawSeconds: 60 });
  const ctx = await setup(h, 3);
  const word = await startAndChoose(ctx);
  const [drawer, g1, g2] = ctx.sockets;
  g2.clear();

  const res = await g1.call(E.SUBMIT_GUESS, { text: `  ${word.toUpperCase()} ` }); // case/space insensitive
  assert.equal(res.ok, true);
  assert.equal(res.correct, true);
  const earned = ctx.room.players.get(g1.id).score;
  assert.ok(earned >= 90 && earned <= 100, `points=${earned}`);
  assert.equal(ctx.room.players.get(drawer.id).score, 20); // drawer reward

  const again = await g1.call(E.SUBMIT_GUESS, { text: word });
  assert.equal(again.ok, false);
  assert.equal(ctx.room.players.get(g1.id).score, earned); // no double scoring
  assert.equal(ctx.room.players.get(drawer.id).score, 20);

  const seenByG2 = JSON.stringify(g2.received);
  assert.ok(!seenByG2.includes(word), 'correct word leaked in broadcast');
  assert.equal(ctx.room.phase, 'drawing'); // g2 has not guessed yet
  assert.equal(g2.last(E.ROOM_UPDATED).players.find((p) => p.id === g1.id).hasGuessed, true);
  h.cleanup();
});

test('the drawer cannot guess; guessing outside the drawing phase is refused', async () => {
  const h = createHarness();
  const ctx = await setup(h, 2);
  const [drawer, guest] = ctx.sockets;
  await drawer.call(E.START_GAME, {});
  assert.equal((await guest.call(E.SUBMIT_GUESS, { text: 'apple' })).ok, false); // still choosing
  const word = drawer.last(E.WORD_OPTIONS).options[0];
  await drawer.call(E.SELECT_WORD, { word });
  const own = await drawer.call(E.SUBMIT_GUESS, { text: word });
  assert.equal(own.ok, false);
  assert.equal(ctx.room.players.get(drawer.id).score, 0);
  h.cleanup();
});

test('all players guessed: turn ends early with a correct summary', async () => {
  const h = createHarness();
  const ctx = await setup(h, 3);
  const word = await startAndChoose(ctx);
  const [drawer, g1, g2] = ctx.sockets;
  await g1.call(E.SUBMIT_GUESS, { text: word });
  await g2.call(E.SUBMIT_GUESS, { text: word });
  assert.equal(ctx.room.phase, 'summary');
  const summary = g1.last(E.ROOM_UPDATED).summary;
  assert.equal(summary.word, word);
  assert.equal(summary.drawerName, 'Player1');
  assert.equal(summary.guessers.length, 2);
  assert.equal(summary.drawerPoints, 40);
  assert.equal(summary.scores[0].rank, 1);
  // after the round ends nobody can guess or draw
  assert.equal((await g1.call(E.SUBMIT_GUESS, { text: word })).ok, false);
  assert.equal((await drawer.call(E.DRAWING_START, { x: 0, y: 0, color: '#000000', size: 4 })).ok, false);
  h.cleanup();
});

test('drawing time runs out: round ends by timer with no points', async () => {
  const h = createHarness({ drawSeconds: 0.1, summarySeconds: 5 });
  const ctx = await setup(h, 2);
  await startAndChoose(ctx);
  await sleep(250);
  assert.equal(ctx.room.phase, 'summary');
  assert.equal(ctx.room.summary.reason, 'time');
  assert.equal(ctx.room.summary.guessers.length, 0);
  h.cleanup();
});

// ---------------- full game, rematch ----------------
test('full game: drawers rotate, rounds finish, final ranking and rematch work', async () => {
  const h = createHarness({ rounds: 2, drawSeconds: 5, chooseSeconds: 5, summarySeconds: 0.05 });
  const ctx = await setup(h, 2);
  const [p1, p2] = ctx.sockets;
  await p1.call(E.START_GAME, {});
  const drawers = [];

  for (let turn = 0; turn < 4; turn += 1) { // 2 rounds x 2 players
    assert.equal(ctx.room.phase, 'choosing');
    const drawer = ctx.room.drawerId === p1.id ? p1 : p2;
    const guesser = drawer === p1 ? p2 : p1;
    drawers.push(ctx.room.drawerName);
    const options = drawer.last(E.WORD_OPTIONS).options;
    assert.equal((await drawer.call(E.SELECT_WORD, { word: options[0] })).ok, true);
    const res = await guesser.call(E.SUBMIT_GUESS, { text: options[0] });
    assert.equal(res.correct, true);
    assert.equal(ctx.room.phase, 'summary');
    await sleep(120); // summary timer -> next turn
  }
  assert.deepEqual(drawers, ['Player1', 'Player2', 'Player1', 'Player2']);
  assert.equal(ctx.room.phase, 'final');
  const final = p1.last(E.ROOM_UPDATED).final;
  assert.equal(final.ranking.length, 2);
  assert.ok(final.winners.length >= 1);
  assert.equal(final.ranking[0].rank, 1);

  // no guessing / drawing after the game is over
  assert.equal((await p2.call(E.SUBMIT_GUESS, { text: 'apple' })).ok, false);
  assert.equal((await p1.call(E.DRAWING_START, { x: 0, y: 0, color: '#000000', size: 4 })).ok, false);

  // rematch: only the host
  assert.equal((await p2.call(E.PLAY_AGAIN, {})).ok, false);
  assert.equal((await p1.call(E.PLAY_AGAIN, {})).ok, true);
  assert.equal(ctx.room.phase, 'lobby');
  assert.ok([...ctx.room.players.values()].every((p) => p.score === 0));
  assert.equal((await p1.call(E.START_GAME, {})).ok, true);
  assert.equal(ctx.room.phase, 'choosing');
  assert.equal(ctx.room.round, 1);
  h.cleanup();
});

test('tie at the end: every top-scoring player is a winner', async () => {
  const h = createHarness();
  const ctx = await setup(h, 2);
  h.game.finishGame(ctx.room, null); // both players have 0 points -> tie
  assert.deepEqual([...ctx.room.final.winners].sort(), ['Player1', 'Player2']);
  assert.deepEqual(ctx.room.final.ranking.map((p) => p.rank), [1, 1]);
  h.cleanup();
});

// ---------------- leaving / disconnecting ----------------
test('lobby: host leaves -> next player becomes host; room is deleted when empty', async () => {
  const h = createHarness();
  const ctx = await setup(h, 3);
  const [host, p2, p3] = ctx.sockets;
  assert.equal((await host.call(E.LEAVE_ROOM, {})).ok, true);
  assert.equal(ctx.room.hostId, p2.id);
  assert.equal(p3.last(E.ROOM_UPDATED).players.length, 2);
  assert.equal(p3.last(E.ROOM_UPDATED).hostId, p2.id);
  p2.disconnect();
  assert.equal(ctx.room.hostId, p3.id);
  p3.disconnect();
  assert.equal(h.store.size, 0);
  assert.equal(ctx.room.timer, null);
  h.cleanup();
});

test('leaving frees the socket to join another room', async () => {
  const h = createHarness();
  const ctx = await setup(h, 2);
  const s = ctx.sockets[1];
  await s.call(E.LEAVE_ROOM, {});
  const other = h.connect();
  const created = await other.call(E.CREATE_ROOM, { name: 'Other' });
  assert.equal((await s.call(E.JOIN_ROOM, { name: 'Player2', code: created.room.code })).ok, true);
  h.cleanup();
});

test('drawer disconnects mid-round: turn ends, game continues with enough players', async () => {
  const h = createHarness({ summarySeconds: 5 });
  const ctx = await setup(h, 3);
  await startAndChoose(ctx);
  const [drawer, g1] = ctx.sockets;
  drawer.disconnect();
  assert.equal(ctx.room.phase, 'summary');
  assert.equal(ctx.room.summary.reason, 'drawer_left');
  assert.equal(g1.last(E.ROOM_UPDATED).players.length, 2);
  h.cleanup();
});

test('too few players left: game ends with the final screen', async () => {
  const h = createHarness();
  const ctx = await setup(h, 2);
  await startAndChoose(ctx);
  ctx.sockets[1].disconnect();
  assert.equal(ctx.room.phase, 'final');
  assert.match(ctx.room.message, /not enough players/i);
  assert.equal(ctx.room.timer, null);
  h.cleanup();
});

test('last unguessed player leaves: round ends because everyone remaining has guessed', async () => {
  const h = createHarness({ summarySeconds: 5 });
  const ctx = await setup(h, 3);
  const word = await startAndChoose(ctx);
  const [, g1, g2] = ctx.sockets;
  await g1.call(E.SUBMIT_GUESS, { text: word });
  assert.equal(ctx.room.phase, 'drawing');
  g2.disconnect();
  // drawer + g1 remain (>= minPlayers) and every remaining guesser has guessed -> round ends early
  assert.equal(ctx.room.phase, 'summary');
  assert.equal(ctx.room.summary.reason, 'all_guessed');
  h.cleanup();
});
