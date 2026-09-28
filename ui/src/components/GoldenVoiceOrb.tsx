import React, { useEffect, useRef } from 'react';

export type OrbState = 'IDLE' | 'LISTENING' | 'SPEAKING' | 'WORKING' | 'ERROR';

interface GoldenVoiceOrbProps {
  state?: OrbState;
  size?: number;
  interactive?: boolean;
  onMicClick?: () => void;
  statusLabel?: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  color: string;
  alpha: number;
  speed: number;
  angle: number;
  ringRadius: number;
  isRingParticle: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  color: string;
}

export const GoldenVoiceOrb: React.FC<GoldenVoiceOrbProps> = ({
  state = 'IDLE',
  size = 320,
  interactive = true,
  onMicClick,
  statusLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; isHovering: boolean }>({ x: 0, y: 0, isHovering: false });
  const rotationRef = useRef<{ rx: number; ry: number; targetRx: number; targetRy: number }>({
    rx: 0,
    ry: 0,
    targetRx: 0,
    targetRy: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = size;
    const height = size;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const radius = size * 0.34;
    const numSphereParticles = 650;
    const numRingParticles = 250;
    const particles: Particle[] = [];
    const sparks: Spark[] = [];

    // Gold & Celestial Palette
    const goldPalette = [
      '#f59e0b', // Amber
      '#fbbf24', // Gold light
      '#d97706', // Gold deep
      '#fef08a', // Radiant yellow
      '#38bdf8', // Cyan sparkle highlight
      '#e0e7ff', // Diamond white
    ];

    // 1. Generate Fibonacci 3D Sphere Particles
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
    for (let i = 0; i < numSphereParticles; i++) {
      const y = 1 - (i / (numSphereParticles - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y); // radius at y
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const color = goldPalette[Math.floor(Math.random() * goldPalette.length)];
      particles.push({
        x: x * radius,
        y: y * radius,
        z: z * radius,
        baseX: x * radius,
        baseY: y * radius,
        baseZ: z * radius,
        size: Math.random() * 1.8 + 0.8,
        color,
        alpha: Math.random() * 0.6 + 0.4,
        speed: Math.random() * 0.02 + 0.005,
        angle: Math.random() * Math.PI * 2,
        ringRadius: 0,
        isRingParticle: false,
      });
    }

    // 2. Generate Swirling Orbital Rings Particles
    for (let i = 0; i < numRingParticles; i++) {
      const angle = (i / numRingParticles) * Math.PI * 2;
      const ringRadius = radius * (1.15 + Math.random() * 0.35);
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;
      const y = (Math.random() - 0.5) * 16;

      const color = goldPalette[Math.floor(Math.random() * goldPalette.length)];
      particles.push({
        x,
        y,
        z,
        baseX: x,
        baseY: y,
        baseZ: z,
        size: Math.random() * 2.2 + 1.0,
        color,
        alpha: Math.random() * 0.7 + 0.3,
        speed: (Math.random() * 0.015 + 0.01) * (i % 2 === 0 ? 1 : -1),
        angle,
        ringRadius,
        isRingParticle: true,
      });
    }

    let animationId: number;
    let time = 0;

    const render = () => {
      time += 0.025;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Smooth Rotation Physics & Mouse Inertia
      const speedMultiplier = state === 'SPEAKING' ? 2.2 : state === 'LISTENING' ? 1.6 : state === 'WORKING' ? 3.0 : 1.0;
      rotationRef.current.targetRy += 0.008 * speedMultiplier;

      if (mouseRef.current.isHovering) {
        rotationRef.current.targetRx = (mouseRef.current.y - centerY) * 0.0012;
      } else {
        rotationRef.current.targetRx = Math.sin(time * 0.5) * 0.15;
      }

      rotationRef.current.rx += (rotationRef.current.targetRx - rotationRef.current.rx) * 0.06;
      rotationRef.current.ry += (rotationRef.current.targetRy - rotationRef.current.ry) * 0.08;

      const cosRx = Math.cos(rotationRef.current.rx);
      const sinRx = Math.sin(rotationRef.current.rx);
      const cosRy = Math.cos(rotationRef.current.ry);
      const sinRy = Math.sin(rotationRef.current.ry);

      // Pulse & Audio Displacement Factor
      let pulse = 1.0;
      let waveAmp = 0;
      if (state === 'LISTENING') {
        pulse = 1.0 + Math.sin(time * 6) * 0.06 + Math.cos(time * 9) * 0.04;
        waveAmp = 14;
      } else if (state === 'SPEAKING') {
        pulse = 1.0 + Math.sin(time * 8) * 0.12 + Math.sin(time * 14) * 0.08;
        waveAmp = 22;
      } else if (state === 'WORKING') {
        pulse = 1.0 + Math.sin(time * 12) * 0.08;
        waveAmp = 10;
      } else {
        pulse = 1.0 + Math.sin(time * 2) * 0.03;
        waveAmp = 4;
      }

      // 1. Draw Deep Nebula Glow Background
      const radialGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.1,
        centerX,
        centerY,
        radius * 1.5 * pulse
      );
      if (state === 'LISTENING') {
        radialGlow.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
        radialGlow.addColorStop(0.4, 'rgba(245, 158, 11, 0.25)');
        radialGlow.addColorStop(0.8, 'rgba(15, 23, 42, 0.0)');
      } else if (state === 'SPEAKING') {
        radialGlow.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
        radialGlow.addColorStop(0.35, 'rgba(217, 119, 6, 0.35)');
        radialGlow.addColorStop(0.75, 'rgba(56, 189, 248, 0.15)');
        radialGlow.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
      } else if (state === 'WORKING') {
        radialGlow.addColorStop(0, 'rgba(6, 182, 212, 0.5)');
        radialGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
        radialGlow.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
      } else {
        radialGlow.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
        radialGlow.addColorStop(0.45, 'rgba(217, 119, 6, 0.18)');
        radialGlow.addColorStop(0.85, 'rgba(15, 23, 42, 0.0)');
      }

      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.5 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Luminous Spherical Core Ring
      ctx.save();
      ctx.strokeStyle = state === 'SPEAKING' ? 'rgba(251, 191, 36, 0.8)' : state === 'LISTENING' ? 'rgba(168, 85, 247, 0.8)' : 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = state === 'SPEAKING' ? '#fbbf24' : state === 'LISTENING' ? '#a855f7' : '#f59e0b';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.88 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3. Transform & Project 3D Particles
      const projected: Array<{ x: number; y: number; z: number; size: number; alpha: number; color: string }> = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        let curX = p.baseX;
        let curY = p.baseY;
        let curZ = p.baseZ;

        if (p.isRingParticle) {
          p.angle += p.speed * speedMultiplier;
          curX = Math.cos(p.angle) * p.ringRadius * pulse;
          curZ = Math.sin(p.angle) * p.ringRadius * pulse;
          curY = p.baseY + Math.sin(p.angle * 3 + time * 4) * 10;
        } else {
          // Add audio procedural harmonic distortion
          const dist = Math.sin(p.baseX * 0.05 + time * 3) * Math.cos(p.baseY * 0.05 + time * 3);
          const displacement = dist * waveAmp;
          curX = (p.baseX + (p.baseX / radius) * displacement) * pulse;
          curY = (p.baseY + (p.baseY / radius) * displacement) * pulse;
          curZ = (p.baseZ + (p.baseZ / radius) * displacement) * pulse;
        }

        // 3D Rotation Math (Ry then Rx)
        const x1 = curX * cosRy + curZ * sinRy;
        const z1 = -curX * sinRy + curZ * cosRy;

        const y2 = curY * cosRx - z1 * sinRx;
        const z2 = curY * sinRx + z1 * cosRx;

        // Perspective projection
        const fov = 340;
        const scale = fov / (fov + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;

        // Depth-based opacity & size
        const depthAlpha = Math.max(0.12, (z2 + radius) / (2 * radius));
        const finalAlpha = Math.min(1.0, p.alpha * depthAlpha * (scale * 1.2));
        const finalSize = Math.max(0.6, p.size * scale * (z2 > 0 ? 1.3 : 0.85));

        projected.push({
          x: projX,
          y: projY,
          z: z2,
          size: finalSize,
          alpha: finalAlpha,
          color: p.color,
        });
      }

      // Sort by depth (Z-buffer painter's algorithm)
      projected.sort((a, b) => a.z - b.z);

      // Render Particles
      for (const p of projected) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.size > 1.6) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 3;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. Emit Sparks / Cosmic Flares during speech
      if ((state === 'SPEAKING' || state === 'LISTENING') && Math.random() < 0.4) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkDist = radius * 0.9;
        sparks.push({
          x: centerX + Math.cos(sparkAngle) * sparkDist,
          y: centerY + Math.sin(sparkAngle) * sparkDist,
          vx: Math.cos(sparkAngle) * (Math.random() * 2 + 1),
          vy: Math.sin(sparkAngle) * (Math.random() * 2 + 1),
          size: Math.random() * 2.4 + 1.0,
          alpha: 1.0,
          maxLife: Math.random() * 30 + 20,
          life: 0,
          color: goldPalette[Math.floor(Math.random() * goldPalette.length)],
        });
      }

      // Update & Render Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        s.alpha = 1 - s.life / s.maxLife;

        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.isHovering = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.isHovering = false;
    };

    if (interactive) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      cancelAnimationFrame(animationId);
      if (interactive) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [state, size, interactive]);

  const getStateColor = () => {
    switch (state) {
      case 'SPEAKING':
        return '#fbbf24';
      case 'LISTENING':
        return '#a855f7';
      case 'WORKING':
        return '#06b6d4';
      case 'ERROR':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const stateColor = getStateColor();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* 3D Cosmic Particle Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          cursor: interactive ? 'grab' : 'default',
        }}
      />

      {/* Center Holographic Brand Badge */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${size * 0.3}px`,
          height: `${size * 0.3}px`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(20, 14, 6, 0.85) 0%, rgba(10, 6, 2, 0.4) 80%)',
          boxShadow: `0 0 24px ${stateColor}66, inset 0 0 16px ${stateColor}44`,
          border: `1.5px solid ${stateColor}88`,
        }}
      >
        <img
          src="/assets/hrikesa_logo.png"
          alt="HṚṢĪKEŚA Holographic Feather"
          style={{
            width: '84%',
            height: '84%',
            objectFit: 'cover',
            objectPosition: 'center 46%',
            borderRadius: '50%',
            opacity: 0.92,
            filter: `drop-shadow(0 0 8px ${stateColor})`,
          }}
        />
      </div>

      {/* Floating Interactive Mic Button */}
      {onMicClick && (
        <button
          onClick={onMicClick}
          style={{
            marginTop: '-16px',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background:
              state === 'LISTENING'
                ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                : state === 'SPEAKING'
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            border: `2px solid ${stateColor}`,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: `0 0 24px ${stateColor}88, 0 4px 12px rgba(0,0,0,0.6)`,
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 10,
          }}
          title={state === 'LISTENING' ? 'Tap to pause microphone' : 'Tap to speak'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>
      )}

      {/* Status Label */}
      {statusLabel && (
        <div
          style={{
            marginTop: '12px',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.8px',
            color: stateColor,
            textShadow: `0 0 12px ${stateColor}aa`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: stateColor,
              boxShadow: `0 0 8px ${stateColor}`,
            }}
          />
          <span>{statusLabel}</span>
        </div>
      )}
    </div>
  );
};
