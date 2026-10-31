import type { ReactNode } from 'react';
import Brand from './components/Brand';
import ConnectionStatus from './components/ConnectionStatus';
import { useGame } from './hooks/useGame';
import FinalPage from './pages/FinalPage';
import GamePage from './pages/GamePage';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import SummaryPage from './pages/SummaryPage';
import './App.css';

export default function App() {
  const game = useGame();
  const { room } = game;

  let page: ReactNode;
  if (!room) {
    page = (
      <HomePage
        connected={game.connected}
        connectError={game.connectError}
        busy={game.busy}
        onCreate={game.createRoom}
        onJoin={game.joinRoom}
      />
    );
  } else if (room.phase === 'lobby') {
    page = <LobbyPage game={game} room={room} />;
  } else if (room.phase === 'choosing' || room.phase === 'drawing') {
    page = <GamePage game={game} room={room} />;
  } else if (room.phase === 'summary') {
    page = <SummaryPage game={game} room={room} />;
  } else {
    page = <FinalPage game={game} room={room} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <Brand />
        <ConnectionStatus connected={game.connected} error={game.connectError} />
      </header>

      {room && !game.connected && (
        <div className="banner banner-error" role="alert">
          Reconnecting to the server...
        </div>
      )}
      {game.notice && (
        <div className="toast" role="alert">
          <span>{game.notice}</span>
          <button type="button" className="btn btn-ghost" onClick={game.clearNotice}>
            Dismiss
          </button>
        </div>
      )}

      <main className="content">{page}</main>
    </div>
  );
}
