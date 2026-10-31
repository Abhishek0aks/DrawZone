export const COLORS: { value: string; name: string }[] = [
  { value: '#172033', name: 'Navy' },
  { value: '#D9485F', name: 'Red' },
  { value: '#F59E0B', name: 'Orange' },
  { value: '#EAB308', name: 'Yellow' },
  { value: '#16845F', name: 'Green' },
  { value: '#2F80ED', name: 'Blue' },
  { value: '#6C5CE7', name: 'Violet' },
  { value: '#8A5A3C', name: 'Brown' },
];
export const SIZES: { value: number; name: string }[] = [
  { value: 4, name: 'Thin' },
  { value: 8, name: 'Medium' },
  { value: 16, name: 'Thick' },
];

interface Props {
  color: string;
  size: number;
  eraser: boolean;
  onColor: (c: string) => void;
  onSize: (s: number) => void;
  onEraser: (on: boolean) => void;
  onClear: () => void;
}

export default function DrawingToolbar({ color, size, eraser, onColor, onSize, onEraser, onClear }: Props) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Drawing tools">
      <div className="tool-group" role="group" aria-label="Brush color">
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`swatch${!eraser && color === c.value ? ' is-active' : ''}`}
            style={{ backgroundColor: c.value }}
            aria-label={c.name}
            aria-pressed={!eraser && color === c.value}
            onClick={() => {
              onColor(c.value);
              onEraser(false);
            }}
          />
        ))}
      </div>
      <div className="tool-group" role="group" aria-label="Brush size">
        {SIZES.map((s) => (
          <button
            key={s.value}
            type="button"
            className={`btn btn-tool${size === s.value ? ' is-active' : ''}`}
            aria-pressed={size === s.value}
            onClick={() => onSize(s.value)}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="tool-group">
        <button type="button" className={`btn btn-tool${eraser ? ' is-active' : ''}`} aria-pressed={eraser} onClick={() => onEraser(!eraser)}>
          Eraser
        </button>
        <button type="button" className="btn btn-tool" onClick={onClear}>
          Clear canvas
        </button>
      </div>
    </div>
  );
}
