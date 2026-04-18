export function Star({ size = 32, color = 'var(--sun)', rotate = 0 }: { size?: number; color?: string; rotate?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M16 3 L19.5 12 L29 12.5 L21.5 18.5 L24 28 L16 22.5 L8 28 L10.5 18.5 L3 12.5 L12.5 12 Z"
        fill={color} stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
