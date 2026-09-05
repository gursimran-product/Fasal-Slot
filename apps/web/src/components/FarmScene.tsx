export function FarmScene() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="h-full w-full"
      role="img"
      aria-label="Illustration of a farm field at sunrise"
    >
      <rect width="400" height="400" fill="#FFF7E6" />
      <circle cx="320" cy="80" r="50" fill="#F5A623" />
      <rect x="0" y="240" width="400" height="160" fill="#8BC34A" />
      <rect x="0" y="220" width="400" height="30" fill="#AED581" />
      {Array.from({ length: 10 }).map((_, row) =>
        Array.from({ length: 14 }).map((_, col) => (
          <line
            key={`${row}-${col}`}
            x1={20 + col * 28}
            y1={270 + row * 13}
            x2={20 + col * 28}
            y2={290 + row * 13}
            stroke="#4C7A2A"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))
      )}
      <rect x="60" y="140" width="70" height="60" fill="#C9622A" />
      <polygon points="55,140 95,105 135,140" fill="#8D4A1E" />
      <rect x="82" y="160" width="20" height="40" fill="#5A3418" />
    </svg>
  );
}
