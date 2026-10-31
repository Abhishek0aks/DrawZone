'use strict';

// Single source of truth for event names (the client has a matching copy in client/src/types/events.ts).
const EVENTS = {
  // client -> server (with acknowledgment)
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  START_GAME: 'start_game',
  SELECT_WORD: 'select_word',
  SUBMIT_GUESS: 'submit_guess',
  PLAY_AGAIN: 'play_again',
  // drawing (client -> server, then relayed server -> other room members)
  DRAWING_START: 'drawing_start',
  DRAWING_MOVE: 'drawing_move',
  DRAWING_END: 'drawing_end',
  CLEAR_CANVAS: 'clear_canvas',
  // server -> client
  ROOM_UPDATED: 'room_updated',
  ROOM_ERROR: 'room_error',
  WORD_OPTIONS: 'word_options',
  ROUND_STARTED: 'round_started',
  CORRECT_GUESS: 'correct_guess',
  CHAT_MESSAGE: 'chat_message',
};

module.exports = { EVENTS };
