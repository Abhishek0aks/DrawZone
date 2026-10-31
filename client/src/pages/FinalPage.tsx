import type { GameApi } from '../hooks/useGame';
import type { RoomView } from '../types';

interface Props {
  game: GameApi;
  room: RoomView;
}

export default function FinalPage({ game, room }: Props) {
  const result = room.final;
  if (!result) return null;
  const isHost = room.hostId === room.youId;
  const tie = result.winners.length > 1;

  return (
    <div className="final">
      <section className="panel" aria-labelledby="final-title">
        <h1 id="final-title">{tie ? 'It is a tie!' : `${result.winners[0]} wins!`}</h1>
        {tie && <p className="lead">Winners: {result.winners.join(', ')}</p>}
        {room.message && (
          <p className="banner banner-error" role="status">
            {room.message}
          </p>
        )}

        <h2 className="panel-title">Final ranking</h2>
        <ol className="rank-list">
          {result.ranking.map((p) => (
            <li key={p.id} className={`rank-row${p.rank === 1 ? ' rank-first' : ''}`}>
              <span className="rank-pos">{p.rank}</span>
              <span className="player-name">
                {p.name}
                {p.id === room.youId && <span className="muted"> (you)</span>}
              </span>
              <span className="player-score">{p.score}</span>
            </li>
          ))}
        </ol>

        <div className="row">
          {isHost ? (
            <button type="button" className="btn btn-primary" onClick={() => void game.playAgain()}>
              Play again
            </button>
          ) : (
            <p className="muted" role="status">
              Waiting for the host to start a rematch...
            </p>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => void game.leaveRoom()}>
            Return to home
          </button>
        </div>
      </section>
    </div>
  );
}
