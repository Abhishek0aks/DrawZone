import { useState } from 'react';
import type { GameApi } from '../hooks/useGame';
import type { RoomView } from '../types';
import Scoreboard from '../components/Scoreboard';
import ConfirmDialog from '../components/ConfirmDialog';

interface Props {
  game: GameApi;
  room: RoomView;
}

export default function LobbyPage({ game, room }: Props) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const isHost = room.hostId === room.youId;
  const enough = room.players.length >= room.settings.minPlayers;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied('done');
    } catch {
      setCopied('failed'); // clipboard can be blocked on non-HTTPS pages (e.g. LAN IP)
    }
    window.setTimeout(() => setCopied('idle'), 2500);
  };

  return (
    <div className="lobby">
      <section className="panel room-card" aria-label="Room">
        <p className="muted">Room code</p>
        <p className="room-code" aria-label={`Room code ${room.code.split('').join(' ')}`}>
          {room.code}
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
          {copied === 'done' ? 'Copied!' : copied === 'failed' ? 'Copy failed. Select the code by hand' : 'Copy room code'}
        </button>
        <p className="muted small">
          Invite friends: open DrawZone, enter a nickname, type this code and press Join room.
        </p>
      </section>

      <div className="lobby-side">
        <Scoreboard players={room.players} youId={room.youId} title="Players in the room" />
        <p className="muted small">
          {room.players.length} of {room.settings.maxPlayers} players. {room.totalRounds} rounds, {room.settings.drawSeconds} seconds per
          drawing.
        </p>

        {isHost ? (
          <>
            <button type="button" className="btn btn-primary btn-block" disabled={!enough} onClick={() => void game.startGame()}>
              Start game
            </button>
            {!enough && (
              <p className="muted small" role="status">
                Waiting for at least {room.settings.minPlayers} players to start.
              </p>
            )}
          </>
        ) : (
          <p className="banner" role="status">
            Waiting for the host to start the game...
          </p>
        )}

        <button type="button" className="btn btn-ghost btn-block" onClick={() => setConfirmLeave(true)}>
          Leave room
        </button>
      </div>

      {confirmLeave && (
        <ConfirmDialog
          title="Leave this room?"
          message={isHost ? 'You are the host. Another player will become the host.' : 'You can rejoin later with the same code.'}
          confirmLabel="Leave room"
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() => void game.leaveRoom()}
        />
      )}
    </div>
  );
}
