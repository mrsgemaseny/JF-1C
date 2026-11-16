import logoPng from '@/shared/assets/icons/logo.png';

interface BrandLogoProps {
  variant?: 'default' | 'inverted' | 'landing' | 'square';
  className?: string;
}

export function BrandLogo({ variant = 'default', className = 'h-8 w-auto' }: BrandLogoProps) {
  const isDark = variant === 'inverted';

  if (!isDark) {
    return (
      <img
        src={logoPng}
        alt="ЖАН FINANCE"
        className={className}
        loading="eager"
        decoding="async"
      />
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      className={className}
      aria-label="ЖАН FINANCE"
    >
      <text
        x="250"
        y="230"
        style={{
          fontFamily: '"a_Simpler", sans-serif',
          fontWeight: 900,
          fontSize: '170px',
          fill: '#F5F5DC',
          textAnchor: 'middle',
        }}
      >
        ЖАН
      </text>
      <text
        x="250"
        y="330"
        style={{
          fontFamily: '"a_Simpler", sans-serif',
          fontWeight: 900,
          fontSize: '92px',
          fill: '#FFFFFF',
          textAnchor: 'middle',
        }}
      >
        FINANCE
      </text>
      <line
        x1="75"
        y1="360"
        x2="425"
        y2="360"
        stroke="#F5F5DC"
        strokeWidth="7"
        strokeLinecap="butt"
      />
      <text
        x="250"
        y="405"
        style={{
          fontFamily: '"a_Simpler", sans-serif',
          fontWeight: 900,
          fontSize: '27.5px',
          fill: 'rgba(245,245,220,0.85)',
          textAnchor: 'middle',
        }}
      >
        БУХГАЛТЕРЛIK КОМПАНИЯ
      </text>
    </svg>
  );
}


