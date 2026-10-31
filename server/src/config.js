'use strict';

// Default game rules. Every value can be overridden through createServer({ settings }).
const DEFAULT_SETTINGS = {
  minPlayers: 2,
  maxPlayers: 8,
  rounds: 3, // one "round" = every player draws once
  drawSeconds: 60,
  chooseSeconds: 15,
  summarySeconds: 6,
  wordChoices: 3,
  maxGuessPoints: 100,
  minGuessPoints: 10,
  drawerPointsPerGuess: 20,
};

const LIMITS = {
  nicknameMin: 2,
  nicknameMax: 20,
  guessMax: 60,
  roomCodeLength: 5,
  maxStrokePoints: 64,
  maxBrushSize: 60,
};

module.exports = { DEFAULT_SETTINGS, LIMITS };
