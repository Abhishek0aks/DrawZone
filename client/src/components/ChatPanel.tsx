import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  disabledReason: string | null; // why the player cannot guess right now (null = can guess)
  onGuess: (text: string) => Promise<string | null>;
}

export default function ChatPanel({ messages, disabledReason, onGuess }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (sending || disabledReason) return;
    if (!text.trim()) {
      setError('Type your guess first.');
      return;
    }
    setSending(true);
    const result = await onGuess(text);
    setSending(false);
    if (result) setError(result);
    else {
      setError(null);
      setText('');
    }
  };

  return (
    <section className="panel chat" aria-label="Guesses">
      <h2 className="panel-title">Guesses</h2>
      <ul className="chat-list" ref={listRef} aria-live="polite">
        {messages.length === 0 && <li className="empty">No guesses yet. Be the first!</li>}
        {messages.map((m) => (
          <li key={m.id} className={`chat-msg chat-${m.kind}`}>
            {m.kind === 'guess' ? (
              <>
                <strong>{m.name}:</strong> {m.text}
              </>
            ) : (
              m.text
            )}
          </li>
        ))}
      </ul>
      <div className="chat-input">
        <label htmlFor="guess-input" className="sr-only">
          Your guess
        </label>
        <input
          id="guess-input"
          className="input"
          value={text}
          maxLength={60}
          autoComplete="off"
          placeholder={disabledReason ?? 'Type your guess'}
          disabled={disabledReason !== null}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
        />
        <button className="btn btn-primary" type="button" disabled={disabledReason !== null || sending} onClick={() => void send()}>
          Guess
        </button>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
