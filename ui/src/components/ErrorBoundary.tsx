import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('HṚṢĪKEŚA Sovereign UI Caught Exception:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = 'home';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            width: '100%',
            background: 'radial-gradient(circle at 50% 30%, #15110D 0%, #0A0806 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'var(--font-inter, sans-serif)',
            color: '#F7F3EA',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              background: 'rgba(20, 15, 10, 0.92)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.15)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(242, 184, 75, 0.15)',
                border: '1px solid rgba(242, 184, 75, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#E5A823',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-cinzel, serif)',
                fontSize: '22px',
                fontWeight: 700,
                color: '#D4AF37',
                marginBottom: '10px',
                letterSpacing: '1px',
              }}
            >
              SOVEREIGN RUNTIME RECOVERY
            </h2>

            <p style={{ fontSize: '13.5px', color: '#A39B8F', lineHeight: 1.6, marginBottom: '20px' }}>
              The control plane caught an isolated component issue. All database storage, background workers, and memory tiers remain intact.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  color: '#FF6B6B',
                  marginBottom: '24px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '99px',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                  border: 'none',
                  color: '#0A0908',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(212,175,55,0.3)',
                }}
              >
                <RefreshCw size={15} /> Reload Workspace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
