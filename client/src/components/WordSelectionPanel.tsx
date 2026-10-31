import Timer from './Timer';

interface Props {
  options: string[];
  seconds: number;
  onSelect: (word: string) => void;
}

export default function WordSelectionPanel({ options, seconds, onSelect }: Props) {
  return (
    <div className="overlay">
      <div className="overlay-card">
        <h2>Choose a word to draw</h2>
        <p className="muted">If you do not choose in time, a word is picked for you.</p>
        <Timer seconds={seconds} label="Time to choose" />
        <div className="word-options">
          {options.map((w) => (
            <button key={w} type="button" className="btn btn-secondary btn-lg" onClick={() => onSelect(w)}>
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
