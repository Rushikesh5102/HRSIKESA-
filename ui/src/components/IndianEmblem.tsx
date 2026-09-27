import React from 'react';

export interface IndianEmblemProps {
  size?: number;
  className?: string;
  showText?: boolean;
  variant?: 'crest' | 'feather' | 'glow';
  subtitle?: string;
}

export const IndianEmblem: React.FC<IndianEmblemProps> = ({
  size = 38,
  className = '',
  showText = true,
  variant = 'crest',
  subtitle = 'Sovereign Authority',
}) => {
  // Master brand logo asset
  const getAssetSrc = () => {
    return '/assets/hrikesa_logo.png';
  };

  return (
    <div
      className={`indian-emblem ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        userSelect: 'none',
        textDecoration: 'none',
      }}
    >
      {/* Brand Logo Circular Medallion with Natural Background Blended */}
      <div
        className="brand-emblem-badge"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          border: `${size >= 36 ? '1.5px' : '1px'} solid rgba(212, 168, 55, 0.75)`,
          boxShadow: '0 0 12px rgba(212, 168, 55, 0.35), 0 2px 8px rgba(0, 0, 0, 0.75), inset 0 0 6px rgba(18, 10, 4, 0.45)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease',
          background: '#FFF6EE',
        }}
      >
        {/* Master Brand Feather with Intact Background */}
        <img
          src={getAssetSrc()}
          alt="HṚṢĪKEŚA Sovereign Emblem"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 46%',
            borderRadius: '50%',
            display: 'block',
          }}
          loading="eager"
        />

        {/* Ambient Radial Blend Overlay that smoothly fades parchment edges into the golden rim */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle at center, rgba(255, 246, 238, 0) 55%, rgba(200, 146, 14, 0.12) 78%, rgba(14, 8, 4, 0.45) 100%)',
            boxShadow: 'inset 0 0 6px rgba(14, 8, 4, 0.5)',
          }}
        />
      </div>

      {/* Brand Identity Typography */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: size >= 40 ? '16px' : '14.5px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                background: 'linear-gradient(135deg, #FFF0CA 0%, #D4A837 55%, #F0DCA0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'var(--font-cinzel), Cinzel, "Cinzel Decorative", serif',
                lineHeight: 1.15,
                textShadow: '0 0 20px rgba(212, 168, 55, 0.3)',
              }}
            >
              HṚṢĪKEŚA
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#00c4a8',
                boxShadow: '0 0 6px #00c4a8',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: '8.5px',
                color: 'var(--color-border-bright, #8a6a3a)',
                letterSpacing: '0.12em',
                fontFamily: 'var(--font-mono), monospace',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {subtitle}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
