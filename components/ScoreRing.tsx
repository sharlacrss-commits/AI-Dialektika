export function ScoreRing({
  value,
  size = 160,
}: {
  value: number;
  size?: number;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(10, Math.max(0, value)) / 10;
  const offset = c * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#ccfbf1"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#14b8a6"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <span className="font-display text-4xl font-bold text-primary-press">
            {value}
          </span>
          <span className="font-display text-xl font-bold text-muted">/10</span>
        </div>
      </div>
    </div>
  );
}
