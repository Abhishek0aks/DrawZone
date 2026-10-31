import type { GameApi } from '../hooks/useGame';
import { useCountdown } from '../hooks/useCountdown';
import type { RoomView } from '../types';

interface Props {
  game: GameApi;
  room: RoomView;
}

const REASONS: Record<string, string> = {
  time: 'Time ran out.',
  all_guessed: 'Everyone guessed the word.',
  drawer_left: 'The drawer left the game.',
};

export default function SummaryPage({ game, room }: Props) {
  const seconds = useCountdown(room.deadline, game.clockOffset);
  const s = room.summary;
  if (!s) return null;

  return (
    <div className="summary">
      <section className="panel" aria-labelledby="summary-title">
        <p className="muted small">
          Round {s.round} of {s.totalRounds}
        </p>
        <h1 id="summary-title" className="summary-word">
          {s.word ? (
            <>
              The word was <span className="secret-word">{s.word}</span>
            </>
          ) : (
            'No word was chosen'
          )}
        </h1>
        <p className="muted">{REASONS[s.reason]}</p>

        <dl className="facts">
          <div>
            <dt>Drawer</dt>
            <dd>
              {s.drawerName} (+{s.drawerPoints} points)
            </dd>
          </div>
          <div>
            <dt>Drawing time used</dt>
            <dd>{s.durationSeconds} seconds</dd>
          </div>
        </dl>

        <h2 className="panel-title">Correct guesses</h2>
        {s.guessers.length === 0 ? (
          <p className="empty">Nobody guessed it this time.</p>
        ) : (
          <ul className="plain-list">
            {s.guessers.map((g) => (
              <li key={g.id}>
                {g.name} <strong>+{g.points}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-label="Scores after this round">
        <h2 className="panel-title">Scores</h2>
        <ol className="rank-list">
          {s.scores.map((p) => (
            <li key={p.id} className="rank-row">
              <span className="rank-pos">{p.rank}</span>
              <span className="player-name">
                {p.name}
                {p.id === room.youId && <span className="muted"> (you)</span>}
              </span>
              <span className="player-score">{p.score}</span>
            </li>
          ))}
        </ol>
        <p className="banner" role="status">
          {s.isLastTurn ? 'Final results in' : 'Next turn in'} {seconds}s
        </p>
      </section>
    </div>
  );
}
