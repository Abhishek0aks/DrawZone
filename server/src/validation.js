'use strict';
const { LIMITS } = require('./config');

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 (confusing)
const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${LIMITS.roomCodeLength}}$`);
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function validateNickname(input) {
  if (typeof input !== 'string') return { ok: false, error: 'Nickname is required.' };
  const value = input.trim().replace(/\s+/g, ' ');
  if (CONTROL_CHARS.test(value)) return { ok: false, error: 'Nickname contains invalid characters.' };
  if (value.length < LIMITS.nicknameMin) {
    return { ok: false, error: `Nickname must be at least ${LIMITS.nicknameMin} characters.` };
  }
  if (value.length > LIMITS.nicknameMax) {
    return { ok: false, error: `Nickname must be at most ${LIMITS.nicknameMax} characters.` };
  }
  return { ok: true, value };
}

function normalizeRoomCode(input) {
  return typeof input === 'string' ? input.trim().toUpperCase() : '';
}

function validateRoomCode(input) {
  const value = normalizeRoomCode(input);
  if (!value) return { ok: false, error: 'Room code is required.' };
  if (!ROOM_CODE_PATTERN.test(value)) {
    return { ok: false, error: `Room code must be ${LIMITS.roomCodeLength} letters or digits.` };
  }
  return { ok: true, value };
}

function validateGuess(input) {
  if (typeof input !== 'string') return { ok: false, error: 'Message is required.' };
  const value = input.trim().replace(/\s+/g, ' ');
  if (!value) return { ok: false, error: 'Message cannot be empty.' };
  if (value.length > LIMITS.guessMax) return { ok: false, error: `Message must be at most ${LIMITS.guessMax} characters.` };
  if (CONTROL_CHARS.test(value)) return { ok: false, error: 'Message contains invalid characters.' };
  return { ok: true, value };
}

function isUnit(n) {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
}

function validatePoint(p) {
  if (!p || typeof p !== 'object' || !isUnit(p.x) || !isUnit(p.y)) return null;
  return { x: p.x, y: p.y };
}

// Stroke start: normalized coordinates (0..1), hex color, brush size.
function validateStrokeStart(p) {
  const point = validatePoint(p);
  if (!point) return null;
  if (typeof p.color !== 'string' || !COLOR_PATTERN.test(p.color)) return null;
  if (typeof p.size !== 'number' || !Number.isFinite(p.size) || p.size < 1 || p.size > LIMITS.maxBrushSize) return null;
  return { x: point.x, y: point.y, color: p.color, size: p.size };
}

// Stroke move: a small batch of points.
function validateStrokeMove(p) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.points)) return null;
  if (p.points.length < 1 || p.points.length > LIMITS.maxStrokePoints) return null;
  const points = [];
  for (const raw of p.points) {
    const point = validatePoint(raw);
    if (!point) return null;
    points.push(point);
  }
  return { points };
}

module.exports = {
  ROOM_CODE_ALPHABET,
  validateNickname,
  normalizeRoomCode,
  validateRoomCode,
  validateGuess,
  validateStrokeStart,
  validateStrokeMove,
};
