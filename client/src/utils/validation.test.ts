import { describe, expect, it } from 'vitest';
import { normalizeRoomCode, validateNickname, validateRoomCode } from './validation';

describe('validateNickname', () => {
  it('trims and collapses spaces', () => {
    expect(validateNickname('  Aman   K ')).toEqual({ ok: true, value: 'Aman K' });
  });
  it('rejects too short and too long names', () => {
    expect(validateNickname(' a ').ok).toBe(false);
    expect(validateNickname('x'.repeat(21)).ok).toBe(false);
    expect(validateNickname('x'.repeat(20)).ok).toBe(true);
  });
});

describe('room codes', () => {
  it('normalizes to upper case', () => {
    expect(normalizeRoomCode(' ab3de ')).toBe('AB3DE');
  });
  it('accepts only valid codes', () => {
    expect(validateRoomCode('ab3de')).toEqual({ ok: true, value: 'AB3DE' });
    expect(validateRoomCode('').ok).toBe(false);
    expect(validateRoomCode('ABC').ok).toBe(false);
    expect(validateRoomCode('ABCI0').ok).toBe(false);
  });
});
