'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../src/validation');

test('nickname: trims, collapses spaces and enforces 2-20 characters', () => {
  assert.deepEqual(v.validateNickname('  Aman   Kumar '), { ok: true, value: 'Aman Kumar' });
  assert.equal(v.validateNickname('A').ok, false);
  assert.equal(v.validateNickname('   ').ok, false);
  assert.equal(v.validateNickname('x'.repeat(21)).ok, false);
  assert.equal(v.validateNickname('x'.repeat(20)).ok, true);
  assert.equal(v.validateNickname(123).ok, false);
  assert.equal(v.validateNickname(null).ok, false);
  assert.equal(v.validateNickname('bad\u0000name').ok, false);
});

test('room code: normalizes to upper case and checks pattern', () => {
  assert.equal(v.normalizeRoomCode('  ab3de '), 'AB3DE');
  assert.equal(v.validateRoomCode('ab3de').value, 'AB3DE');
  assert.equal(v.validateRoomCode('').ok, false);
  assert.equal(v.validateRoomCode('ABC').ok, false);
  assert.equal(v.validateRoomCode('ABCDE1').ok, false);
  assert.equal(v.validateRoomCode('ABCI0').ok, false); // I and 0 are not in the alphabet
  assert.equal(v.validateRoomCode(undefined).ok, false);
});

test('guess: required, trimmed and length limited', () => {
  assert.equal(v.validateGuess('  Apple ').value, 'Apple');
  assert.equal(v.validateGuess('').ok, false);
  assert.equal(v.validateGuess('x'.repeat(61)).ok, false);
  assert.equal(v.validateGuess({}).ok, false);
});

test('stroke start: validates coordinates, color and size', () => {
  const good = { x: 0.5, y: 0.2, color: '#FF00aa', size: 8 };
  assert.deepEqual(v.validateStrokeStart(good), good);
  assert.equal(v.validateStrokeStart({ ...good, x: 1.2 }), null);
  assert.equal(v.validateStrokeStart({ ...good, y: -0.1 }), null);
  assert.equal(v.validateStrokeStart({ ...good, x: NaN }), null);
  assert.equal(v.validateStrokeStart({ ...good, color: 'red' }), null);
  assert.equal(v.validateStrokeStart({ ...good, size: 0 }), null);
  assert.equal(v.validateStrokeStart({ ...good, size: 500 }), null);
  assert.equal(v.validateStrokeStart(null), null);
  assert.equal(v.validateStrokeStart('hello'), null);
});

test('stroke move: validates batch size and every point', () => {
  assert.deepEqual(v.validateStrokeMove({ points: [{ x: 0, y: 1 }] }), { points: [{ x: 0, y: 1 }] });
  assert.equal(v.validateStrokeMove({ points: [] }), null);
  assert.equal(v.validateStrokeMove({ points: new Array(65).fill({ x: 0, y: 0 }) }), null);
  assert.equal(v.validateStrokeMove({ points: [{ x: 0, y: 0 }, { x: 2, y: 0 }] }), null);
  assert.equal(v.validateStrokeMove({ points: 'x' }), null);
  assert.equal(v.validateStrokeMove(undefined), null);
});
