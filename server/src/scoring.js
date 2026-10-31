'use strict';

// guessPoints = max(min, floor(max * remaining / total)). An earlier correct guess earns more points.
function guessPoints(remainingMs, totalMs, settings) {
  const ratio = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
  return Math.max(settings.minGuessPoints, Math.floor(settings.maxGuessPoints * ratio));
}

// Highest score first. Players with equal scores share the same rank (1, 1, 3 ...).
function rankPlayers(players) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let lastScore = null;
  let lastRank = 0;
  return sorted.map((p, index) => {
    if (p.score !== lastScore) {
      lastRank = index + 1;
      lastScore = p.score;
    }
    return { id: p.id, name: p.name, score: p.score, rank: lastRank };
  });
}

module.exports = { guessPoints, rankPlayers };
