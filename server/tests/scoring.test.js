'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { guessPoints, rankPlayers } = require('../src/scoring');
const { DEFAULT_SETTINGS: S } = require('../src/config');
const { pickWordOptions, maskWord } = require('../src/words');

test('guessPoints: full time = 100, half time = 50, never below 10', () => {
  assert.equal(guessPoints(60000, 60000, S), 100);
  assert.equal(guessPoints(30000, 60000, S), 50);
  assert.equal(guessPoints(1000, 60000, S), 10);
  assert.equal(guessPoints(0, 60000, S), 10);
  assert.equal(guessPoints(-5000, 60000, S), 10);
  assert.equal(guessPoints(999999, 60000, S), 100); // clamped
});

test('guessPoints: earlier guess always earns at least as much as a later one', () => {
  let previous = Infinity;
  for (let remaining = 60000; remaining >= 0; remaining -= 1000) {
    const pts = guessPoints(remaining, 60000, S);
    assert.ok(pts <= previous);
    previous = pts;
  }
});

test('rankPlayers: sorts by score and gives ties the same rank', () => {
  const ranked = rankPlayers([
    { id: 'a', name: 'Asha', score: 50 },
    { id: 'b', name: 'Bala', score: 120 },
    { id: 'c', name: 'Chitra', score: 50 },
    { id: 'd', name: 'Dev', score: 10 },
  ]);
  assert.deepEqual(ranked.map((p) => [p.name, p.rank]), [['Bala', 1], ['Asha', 2], ['Chitra', 2], ['Dev', 4]]);
});

test('word options: unique, requested amount, not reused in the same game', () => {
  const used = new Set();
  const first = pickWordOptions(used, 3);
  assert.equal(new Set(first).size, 3);
  first.forEach((w) => used.add(w));
  const second = pickWordOptions(used, 3);
  second.forEach((w) => assert.ok(!first.includes(w)));
});

test('maskWord reveals only the length', () => {
  assert.equal(maskWord('apple'), '_____');
  assert.equal(maskWord(null), null);
});
