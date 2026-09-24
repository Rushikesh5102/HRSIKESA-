import React from 'react';

interface IndianEmblemProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const IndianEmblem: React.FC<IndianEmblemProps> = ({
  size = 36,
  className = '',
  showText = true,
}) => {
  return (
    <div
      className={`indian-emblem ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--accent-saffron) 0%, var(--accent-gold) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px var(--accent-gold-glow)',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* Abstract Yantra Sacred Geometry Icon */}
        <svg
          width={size * 0.65}
          height={size * 0.65}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0F0D0A"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Outer diamond */}
          <polygon points="12 2 22 12 12 22 2 12" />
          {/* Inner square */}
          <rect x="7" y="7" width="10" height="10" rx="1" />
          {/* Central core dot */}
          <circle cx="12" cy="12" r="2" fill="#0F0D0A" />
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '0.16em',
              color: 'var(--color-gold)',
              fontFamily: 'var(--font-display)',
              lineHeight: 1.15,
            }}
          >
            HṚṢĪKEŚA
          </span>

          <span
            style={{
              fontSize: '8px',
              color: 'var(--color-border-bright)',
              letterSpacing: '0.12em',
              fontFamily: 'var(--font-body)',
              textTransform: 'uppercase',
              marginTop: '1px',
            }}
          >
            Sovereign Authority
          </span>
        </div>
      )}
    </div>
  );
};
