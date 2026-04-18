type Props = { color?: string; accent?: string; variant?: number };

export function ProductBlob({ color = '#FFC94A', accent = '#FF6A4D', variant = 0 }: Props) {
  const variants = [
    <g key="bunny">
      <ellipse cx="100" cy="155" rx="60" ry="45" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <ellipse cx="75" cy="100" rx="14" ry="38" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <ellipse cx="125" cy="100" rx="14" ry="38" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <circle cx="85" cy="150" r="4" fill="var(--ink)"/>
      <circle cx="115" cy="150" r="4" fill="var(--ink)"/>
      <path d="M95 168 Q100 174 105 168" stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <circle cx="60" cy="165" r="6" fill={accent} opacity="0.5"/>
      <circle cx="140" cy="165" r="6" fill={accent} opacity="0.5"/>
    </g>,
    <g key="whale">
      <path d="M40 130 Q 40 90, 100 90 Q 160 90, 160 130 Q 160 170, 100 170 Q 60 170, 50 160 L 30 170 L 40 150 Z"
        fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <circle cx="130" cy="120" r="5" fill="var(--ink)"/>
      <path d="M115 95 Q 115 75, 125 75 Q 125 85, 130 90" stroke="var(--ink)" strokeWidth="2.5" fill="none"/>
      <circle cx="125" cy="72" r="4" fill={accent}/>
      <circle cx="118" cy="68" r="3" fill={accent}/>
    </g>,
    <g key="dino">
      <path d="M50 160 Q 50 110, 90 105 L 100 70 L 110 105 Q 150 115, 155 160 L 135 165 L 130 150 L 120 160 L 110 150 L 100 160 L 90 150 L 80 160 L 70 150 L 65 165 Z"
        fill={color} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
      <circle cx="95" cy="95" r="3" fill="var(--ink)"/>
      <path d="M85 95 L 75 92" stroke="var(--ink)" strokeWidth="2.5"/>
    </g>,
    <g key="flower">
      <circle cx="100" cy="130" r="20" fill={accent} stroke="var(--ink)" strokeWidth="3"/>
      <ellipse cx="100" cy="90" rx="20" ry="28" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <ellipse cx="100" cy="170" rx="20" ry="28" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <ellipse cx="60" cy="130" rx="28" ry="20" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <ellipse cx="140" cy="130" rx="28" ry="20" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <circle cx="100" cy="130" r="10" fill="var(--sun)" stroke="var(--ink)" strokeWidth="2.5"/>
    </g>,
    <g key="rocket">
      <path d="M100 60 Q 130 90, 130 140 L 130 170 L 70 170 L 70 140 Q 70 90, 100 60 Z"
        fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <circle cx="100" cy="115" r="13" fill={accent} stroke="var(--ink)" strokeWidth="3"/>
      <path d="M70 150 L 50 175 L 70 170 Z M 130 150 L 150 175 L 130 170 Z"
        fill={accent} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M85 175 L 95 185 L 105 175 L 115 185" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round"/>
    </g>,
    <g key="cow">
      <ellipse cx="100" cy="140" rx="55" ry="40" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <ellipse cx="75" cy="125" rx="10" ry="16" fill="var(--ink)"/>
      <ellipse cx="130" cy="150" rx="14" ry="10" fill="var(--ink)"/>
      <circle cx="85" cy="135" r="3" fill="var(--ink)"/>
      <circle cx="115" cy="135" r="3" fill="var(--ink)"/>
      <ellipse cx="100" cy="155" rx="18" ry="12" fill={accent} stroke="var(--ink)" strokeWidth="2.5"/>
      <circle cx="95" cy="155" r="2" fill="var(--ink)"/>
      <circle cx="105" cy="155" r="2" fill="var(--ink)"/>
    </g>,
    <g key="robot">
      <rect x="60" y="80" width="80" height="80" rx="12" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <rect x="72" y="92" width="22" height="22" rx="5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5"/>
      <rect x="106" y="92" width="22" height="22" rx="5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5"/>
      <circle cx="83" cy="103" r="4" fill="var(--ink)"/>
      <circle cx="117" cy="103" r="4" fill="var(--ink)"/>
      <rect x="85" y="135" width="30" height="10" rx="3" fill={accent} stroke="var(--ink)" strokeWidth="2.5"/>
      <line x1="100" y1="80" x2="100" y2="65" stroke="var(--ink)" strokeWidth="3"/>
      <circle cx="100" cy="62" r="6" fill={accent} stroke="var(--ink)" strokeWidth="2.5"/>
    </g>,
    <g key="moon">
      <circle cx="105" cy="120" r="42" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <circle cx="125" cy="110" r="42" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3"/>
      <path d="M50 70 L55 80 L65 82 L57 90 L60 100 L50 95 L40 100 L43 90 L35 82 L45 80 Z" fill={accent} stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M160 155 L163 162 L170 163 L165 168 L167 175 L160 172 L153 175 L155 168 L150 163 L157 162 Z" fill={accent} stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round"/>
    </g>,
    <g key="cupcake">
      <path d="M60 120 L 70 175 L 130 175 L 140 120 Z" fill={color} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M55 125 L 70 80 Q 80 70, 100 80 Q 120 70, 130 80 Q 145 75, 145 95 Q 150 120, 145 125 Z"
        fill={accent} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
      <circle cx="100" cy="62" r="6" fill="var(--tomato)" stroke="var(--ink)" strokeWidth="2.5"/>
      <line x1="70" y1="135" x2="130" y2="135" stroke="var(--ink)" strokeWidth="2.5"/>
      <line x1="85" y1="145" x2="85" y2="170" stroke="var(--ink)" strokeWidth="2"/>
      <line x1="115" y1="145" x2="115" y2="170" stroke="var(--ink)" strokeWidth="2"/>
    </g>,
    <g key="shell">
      <path d="M50 170 Q 40 90, 100 60 Q 160 90, 150 170 Z" fill={color} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M100 60 Q 90 120, 75 170" stroke="var(--ink)" strokeWidth="2.5" fill="none"/>
      <path d="M100 60 Q 110 120, 125 170" stroke="var(--ink)" strokeWidth="2.5" fill="none"/>
      <path d="M100 60 Q 70 110, 50 170" stroke="var(--ink)" strokeWidth="2.5" fill="none"/>
      <path d="M100 60 Q 130 110, 150 170" stroke="var(--ink)" strokeWidth="2.5" fill="none"/>
      <circle cx="100" cy="95" r="8" fill={accent} stroke="var(--ink)" strokeWidth="2.5"/>
    </g>,
    <g key="truck">
      <rect x="50" y="100" width="70" height="50" rx="6" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <path d="M120 115 L 150 115 L 160 135 L 160 150 L 120 150 Z" fill={accent} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
      <rect x="128" y="122" width="22" height="14" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2"/>
      <circle cx="75" cy="155" r="12" fill="var(--ink)"/>
      <circle cx="75" cy="155" r="5" fill={color}/>
      <circle cx="140" cy="155" r="12" fill="var(--ink)"/>
      <circle cx="140" cy="155" r="5" fill={color}/>
    </g>,
    <g key="unicorn">
      <ellipse cx="100" cy="140" rx="50" ry="35" fill={color} stroke="var(--ink)" strokeWidth="3"/>
      <path d="M70 120 Q 70 95, 90 90 L 95 105" fill={color} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M82 92 L 88 72 L 75 88 Z" fill={accent} stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round"/>
      <circle cx="78" cy="110" r="3" fill="var(--ink)"/>
      <path d="M120 130 Q 150 125, 155 155 Q 145 150, 145 165" stroke="var(--ink)" strokeWidth="3" fill="none" strokeLinecap="round"/>
    </g>,
  ];
  return (
    <svg viewBox="0 0 200 240" style={{ width: '100%', height: '100%' }}>
      {variants[variant % variants.length]}
    </svg>
  );
}
