export function Squiggle({ color = 'var(--ink)', height = 14 }: { color?: string; height?: number }) {
  return (
    <svg width="100%" height={height} viewBox="0 0 300 14" preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d="M0 7 Q 15 0, 30 7 T 60 7 T 90 7 T 120 7 T 150 7 T 180 7 T 210 7 T 240 7 T 270 7 T 300 7"
        stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
