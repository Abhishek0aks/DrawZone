'use strict';

const WORDS = [
  'apple', 'banana', 'bicycle', 'bridge', 'butterfly', 'camera', 'candle', 'castle', 'chair', 'clock',
  'cloud', 'computer', 'cricket', 'dolphin', 'dragon', 'elephant', 'envelope', 'flower', 'giraffe', 'guitar',
  'hammer', 'helicopter', 'island', 'jungle', 'kite', 'ladder', 'lighthouse', 'mountain', 'mushroom', 'notebook',
  'ocean', 'octopus', 'penguin', 'pencil', 'pizza', 'rainbow', 'robot', 'rocket', 'sandwich', 'scissors',
  'snowman', 'spider', 'sunglasses', 'teapot', 'telephone', 'tiger', 'train', 'umbrella', 'volcano', 'windmill',
];

// Pick `count` different words that were not used earlier in this game.
function pickWordOptions(used, count, rng = Math.random) {
  let pool = WORDS.filter((w) => !used.has(w));
  if (pool.length < count) {
    used.clear(); // every word was used: start over
    pool = WORDS.slice();
  }
  const options = [];
  while (options.length < count && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    options.push(pool.splice(i, 1)[0]);
  }
  return options;
}

// "apple" -> "_____" (guessers only learn the length)
function maskWord(word) {
  return typeof word === 'string' ? '_'.repeat(word.length) : null;
}

function normalizeGuess(text) {
  return String(text).trim().toLowerCase();
}

module.exports = { WORDS, pickWordOptions, maskWord, normalizeGuess };
