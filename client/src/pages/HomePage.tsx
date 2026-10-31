import { useState } from 'react';
import { validateNickname, validateRoomCode, ROOM_CODE_LENGTH, NICKNAME_MAX } from '../utils/validation';

interface Props {
  connected: boolean;
  connectError: string | null;
  busy: boolean;
  onCreate: (name: string) => Promise<string | null>;
  onJoin: (name: string, code: string) => Promise<string | null>;
}

export default function HomePage({ connected, connectError, busy, onCreate, onJoin }: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const checkName = () => {
    const r = validateNickname(name);
    setNameError(r.ok ? null : r.error);
    return r.ok ? r.value : null;
  };

  const create = async () => {
    setFormError(null);
    setCodeError(null);
    const nick = checkName();
    if (!nick) return;
    const err = await onCreate(nick);
    if (err) setFormError(err);
  };

  const join = async () => {
    setFormError(null);
    const nick = checkName();
    const c = validateRoomCode(code);
    setCodeError(c.ok ? null : c.error);
    if (!nick || !c.ok) return;
    const err = await onJoin(nick, c.value);
    if (err) setFormError(err);
  };

  const serverDown = !connected && connectError !== null;

  return (
    <div className="home">
      <section className="home-intro">
        <h1>Draw it. Guess it. Win it.</h1>
        <p className="lead">
          Create a private room, share the code with friends, and take turns drawing a secret word while everyone else
          races to guess it.
        </p>
        <ol className="how">
          <li>Pick a nickname and create a room.</li>
          <li>Friends join with your room code.</li>
          <li>The faster you guess, the more points you earn.</li>
        </ol>
      </section>

      <section className="panel home-card" aria-labelledby="home-card-title">
        <h2 id="home-card-title" className="panel-title">
          Start playing
        </h2>

        {serverDown && (
          <div className="banner banner-error" role="alert">
            Cannot reach the game server. Start the backend (<code>node server.js</code> in the server folder) and this
            page will connect automatically.
          </div>
        )}

        <div className="field">
          <label htmlFor="nickname">Nickname</label>
          <input
            id="nickname"
            className="input"
            value={name}
            maxLength={NICKNAME_MAX}
            autoComplete="nickname"
            placeholder="e.g. Riya"
            aria-invalid={nameError !== null}
            aria-describedby={nameError ? 'nickname-error' : undefined}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void (code.trim() ? join() : create())}
          />
          {nameError && (
            <p id="nickname-error" className="field-error">
              {nameError}
            </p>
          )}
        </div>

        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void create()}>
          {busy ? 'Please wait...' : 'Create room'}
        </button>

        <div className="divider" role="separator">
          <span>or join a friend</span>
        </div>

        <div className="field">
          <label htmlFor="room-code">Room code</label>
          <input
            id="room-code"
            className="input input-code"
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="ABC23"
            aria-invalid={codeError !== null}
            aria-describedby={codeError ? 'code-error' : undefined}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && void join()}
          />
          {codeError && (
            <p id="code-error" className="field-error">
              {codeError}
            </p>
          )}
        </div>

        <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => void join()}>
          {busy ? 'Please wait...' : 'Join room'}
        </button>

        <p className="field-error form-error" role="alert">
          {formError}
        </p>
      </section>
    </div>
  );
}
