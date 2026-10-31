interface Props {
  connected: boolean;
  error: string | null;
}

export default function ConnectionStatus({ connected, error }: Props) {
  const label = connected ? 'Connected' : error ? 'Server unavailable' : 'Connecting...';
  const state = connected ? 'ok' : error ? 'bad' : 'wait';
  return (
    <div className={`status status-${state}`} role="status" aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      {label}
    </div>
  );
}
