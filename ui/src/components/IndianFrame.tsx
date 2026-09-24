import React from 'react';

interface IndianFrameProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'accent' | 'stone' | 'glow';
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
}

export const IndianFrame: React.FC<IndianFrameProps> = ({
  children,
  className = '',
  style = {},
  variant = 'default',
  title,
  subtitle,
  badge,
}) => {
  return (
    <div
      className={`indian-frame ${className}`}
      style={{
        background: variant === 'stone' ? 'var(--bg-secondary)' : 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '20px 22px',
        position: 'relative',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: variant === 'glow' ? 'var(--shadow-ai-glow)' : 'var(--shadow-sm)',
        overflow: 'hidden',
        transition: 'all 0.22s ease',
        ...style,
      }}
    >
      {/* Top subtle golden arch filigree */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '15%',
          right: '15%',
          height: '1.5px',
          background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
          opacity: 0.8,
        }}
      />

      {/* Header if specified */}
      {(title || badge) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.2px',
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {badge && <div>{badge}</div>}
        </div>
      )}

      {children}
    </div>
  );
};
