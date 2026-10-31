export default function Brand() {
  return (
    <div className="brand" aria-label="DrawZone">
      <svg className="brand-mark" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="8" fill="#6C5CE7" />
        <path d="M7 21c4-9 7 4 10-4s5-3 8-8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="brand-name">DrawZone</span>
    </div>
  );
}
