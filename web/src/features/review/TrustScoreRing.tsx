import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrustVerdict } from '../../api/types';

interface TrustScoreRingProps {
  score: number;
  verdict: TrustVerdict;
  size?: number;
}

export const TrustScoreRing: React.FC<TrustScoreRingProps> = ({
  score,
  verdict,
  size = 148,
}) => {
  const [displayScore, setDisplayScore] = useState(score);

  // Smooth count-up tween
  useEffect(() => {
    let start = displayScore;
    const end = score;
    const duration = 800;
    const startTime = performance.now();

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };

    requestAnimationFrame(animateCount);
  }, [score]);

  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * score) / 100;

  const gradientMap = {
    PASS: {
      gradStart: '#34D399',
      gradEnd: '#10B981',
      text: 'text-verified',
      glow: 'rgba(52, 211, 153, 0.25)',
      badgeBg: 'bg-verified/10 text-verified border-verified/30',
    },
    REVIEW: {
      gradStart: '#FDE047',
      gradEnd: '#F59E0B',
      text: 'text-warning',
      glow: 'rgba(245, 158, 11, 0.25)',
      badgeBg: 'bg-warning/10 text-warning border-warning/30',
    },
    FAIL: {
      gradStart: '#FB7185',
      gradEnd: '#E11D48',
      text: 'text-danger',
      glow: 'rgba(244, 63, 94, 0.25)',
      badgeBg: 'bg-danger/10 text-danger border-danger/30',
    },
  };

  const currentTheme = gradientMap[verdict] || gradientMap.REVIEW;

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Outer ambient blur halo */}
      <div
        className="absolute w-36 h-36 rounded-full filter blur-xl transition-all duration-700 pointer-events-none"
        style={{ backgroundColor: currentTheme.glow }}
      />

      <div
        className="relative flex items-center justify-center rounded-full bg-surface-2/70 border border-white/[0.06] shadow-xl p-1"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id={`ringGrad-${verdict}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={currentTheme.gradStart} />
              <stop offset="100%" stopColor={currentTheme.gradEnd} />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Animated Value Ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#ringGrad-${verdict})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${currentTheme.glow})`,
            }}
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span
            key={displayScore}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-text"
          >
            {displayScore}
          </motion.span>
          <span className="text-[9px] uppercase font-mono tracking-widest text-text-muted mt-0.5">
            TRUST INDEX
          </span>
        </div>
      </div>

      {/* Verdict Label */}
      <div className="mt-3.5 flex items-center gap-2">
        <span className="text-xs text-text-muted">Audited Verdict:</span>
        <span
          className={`font-mono text-xs uppercase px-2.5 py-0.5 rounded-full border font-semibold tracking-wider ${currentTheme.badgeBg}`}
        >
          {verdict}
        </span>
      </div>
    </div>
  );
};
