// Same rules as the server (server/src/validation.js). The server still re-checks everything.
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;
export const ROOM_CODE_LENGTH = 5;

const ROOM_CODE_PATTERN = new RegExp(`^[A-HJ-NP-Z2-9]{${ROOM_CODE_LENGTH}}$`);

export type Validation = { ok: true; value: string } | { ok: false; error: string };

export function validateNickname(input: string): Validation {
  const value = input.trim().replace(/\s+/g, ' ');
  if (value.length < NICKNAME_MIN) return { ok: false, error: `Nickname must be at least ${NICKNAME_MIN} characters.` };
  if (value.length > NICKNAME_MAX) return { ok: false, error: `Nickname must be at most ${NICKNAME_MAX} characters.` };
  return { ok: true, value };
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase();
}

export function validateRoomCode(input: string): Validation {
  const value = normalizeRoomCode(input);
  if (!value) return { ok: false, error: 'Enter a room code.' };
  if (!ROOM_CODE_PATTERN.test(value)) {
    return { ok: false, error: `A room code has ${ROOM_CODE_LENGTH} letters or digits (no I, O, 0 or 1).` };
  }
  return { ok: true, value };
}
