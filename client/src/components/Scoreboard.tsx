import type { PlayerView } from '../types';

interface Props {
  players: PlayerView[];
  youId: string;
  title?: string;
}

// Ranked by score. Status is shown with text badges (not only colour).
export default function Scoreboard({ players, youId, title = 'Players' }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <section className="panel" aria-label={title}>
      <h2 className="panel-title">
        {title} <span className="muted">({players.length})</span>
      </h2>
      <ul className="player-list">
        {sorted.map((p) => (
          <li key={p.id} className="player-row">
            <span className="avatar" aria-hidden="true">
              {p.name.charAt(0).toUpperCase()}
            </span>
            <span className="player-name">
              {p.name}
              {p.id === youId && <span className="muted"> (you)</span>}
            </span>
            {p.isHost && <span className="badge badge-host">Host</span>}
            {p.isDrawer && <span className="badge badge-draw">Drawing</span>}
            {p.hasGuessed && <span className="badge badge-ok">Guessed</span>}
            <span className="player-score">{p.score}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
