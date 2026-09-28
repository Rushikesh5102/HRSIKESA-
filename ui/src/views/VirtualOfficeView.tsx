import React, { useState, useRef } from 'react';
import { Maximize2, Minimize2, ExternalLink, RefreshCw } from 'lucide-react';

export const VirtualOfficeView: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = '/agents-office/index.html';
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : 'calc(100vh - 100px)',
        margin: '0 auto',
        borderRadius: isFullscreen ? '0' : '12px',
        overflow: 'hidden',
        border: isFullscreen ? 'none' : '1px solid rgba(212, 175, 55, 0.28)',
        boxShadow: isFullscreen ? 'none' : '0 8px 30px rgba(0,0,0,0.5)',
        background: '#160E08',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Quick Action Floating Controls */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '18px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(34, 22, 14, 0.92)',
          backdropFilter: 'blur(10px)',
          padding: '5px 10px',
          borderRadius: '20px',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.45)'
        }}
      >
        <button
          onClick={handleRefresh}
          title="Reload 3D Canvas"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#F3C05A',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}
        >
          <RefreshCw size={14} />
        </button>

        <a
          href="/agents-office/index.html"
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Dedicated Tab"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#F3C05A',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            textDecoration: 'none'
          }}
        >
          <ExternalLink size={14} />
        </a>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#F3C05A',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* Embedded Original Agents Office 3D Canvas Application */}
      <iframe
        ref={iframeRef}
        src="/agents-office/index.html"
        title="HṚṢĪKEŚA Sovereign Office"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          background: '#160E08'
        }}
      />
    </div>
  );
};
