import { useState } from 'react';
import type { ReactNode } from 'react';
import type { GameApi } from '../hooks/useGame';
import { useCountdown } from '../hooks/useCountdown';
import type { RoomView } from '../types';
import ChatPanel from '../components/ChatPanel';
import ConfirmDialog from '../components/ConfirmDialog';
import DrawingBoard from '../components/DrawingBoard';
import Scoreboard from '../components/Scoreboard';
import Timer from '../components/Timer';
import WordSelectionPanel from '../components/WordSelectionPanel';

interface Props {
  game: GameApi;
  room: RoomView;
}

export default function GamePage({ game, room }: Props) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const seconds = useCountdown(room.deadline, game.clockOffset);
  const isDrawer = room.drawerId === room.youId;
  const me = room.players.find((p) => p.id === room.youId);
  const drawing = room.phase === 'drawing';
  const choosing = room.phase === 'choosing';

  let disabledReason: string | null = null;
  if (isDrawer) disabledReason = 'You are drawing. Guessers cannot see your word.';
  else if (!drawing) disabledReason = 'Waiting for the drawer to pick a word...';
  else if (me?.hasGuessed) disabledReason = 'You guessed it! Wait for the others.';

  let status: ReactNode;
  if (choosing) {
    status = isDrawer ? 'Choose your word' : `${room.drawerName} is choosing a word...`;
  } else if (isDrawer) {
    status = (
      <>
        Draw this: <strong className="secret-word">{room.word}</strong>
      </>
    );
  } else {
    status = (
      <>
        <span className="muted">{room.drawerName} is drawing:</span>{' '}
        <strong className="hint" aria-label={`Word has ${room.hint?.length ?? 0} letters`}>
          {room.hint}
        </strong>
      </>
    );
  }

  return (
    <div className="game">
      <header className="game-bar">
        <div>
          <p className="muted small">
            Round {room.round} of {room.totalRounds} &middot; Room {room.code}
          </p>
          <p className="status-line" role="status">
            {status}
          </p>
        </div>
        <Timer seconds={seconds} label={choosing ? 'Time to choose' : 'Time left'} />
      </header>

      <div className="game-main">
        <div className="board-wrap">
          <DrawingBoard canDraw={isDrawer && drawing} />
          {choosing && isDrawer && game.wordOptions && (
            <WordSelectionPanel options={game.wordOptions} seconds={seconds} onSelect={(w) => void game.selectWord(w)} />
          )}
          {choosing && isDrawer && !game.wordOptions && (
            <div className="overlay">
              <div className="overlay-card">
                <h2>Getting your words...</h2>
              </div>
            </div>
          )}
          {choosing && !isDrawer && (
            <div className="overlay">
              <div className="overlay-card">
                <h2>{room.drawerName} is choosing a word</h2>
                <p className="muted">Get ready to guess.</p>
              </div>
            </div>
          )}
        </div>

        <aside className="game-side">
          <Scoreboard players={room.players} youId={room.youId} title="Scores" />
          <ChatPanel messages={game.messages} disabledReason={disabledReason} onGuess={game.submitGuess} />
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setConfirmLeave(true)}>
            Leave game
          </button>
        </aside>
      </div>

      {confirmLeave && (
        <ConfirmDialog
          title="Leave the game?"
          message="You will lose your place and cannot rejoin until this game is finished."
          confirmLabel="Leave game"
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() => void game.leaveRoom()}
        />
      )}
    </div>
  );
}
