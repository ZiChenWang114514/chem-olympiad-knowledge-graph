export function DifficultyDots({ value, max = 5 }: { value: number; max?: number }) {
  const n = Math.max(0, Math.min(max, value))
  return (
    <span className="difficulty" aria-label={`难度 ${n}/${max}`}>
      <span className="difficulty-dots" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <i key={i} className={i < n ? 'on' : ''} />
        ))}
      </span>
      <span className="difficulty-text">
        难度 {n}/{max}
      </span>
    </span>
  )
}
