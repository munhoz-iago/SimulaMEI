export function Pill({
  children,
  color = 'var(--text3)',
  style,
}: {
  children: React.ReactNode
  color?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 28,
        padding: '6px 9px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        color,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
