interface Props {
  seconds: number;
  label: string;
}

export default function Timer({ seconds, label }: Props) {
  const urgent = seconds <= 10;
  return (
    <div className={`timer${urgent ? ' timer-urgent' : ''}`} role="timer" aria-label={`${label}: ${seconds} seconds`}>
      <span className="timer-value">{seconds}</span>
      <span className="timer-unit">sec</span>
    </div>
  );
}
