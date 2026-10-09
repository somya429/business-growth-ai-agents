import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

export const CinematicIntro: React.FC = () => {
  const { hasSeenIntro, setHasSeenIntro } = useAppStore();

  useEffect(() => {
    if (!hasSeenIntro) {
      const timer = setTimeout(() => {
        setHasSeenIntro(true);
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [hasSeenIntro, setHasSeenIntro]);

  if (hasSeenIntro) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="cinematic-overlay"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[100] bg-[#0A0C10] flex flex-col items-center justify-center select-none cursor-pointer"
        onClick={() => setHasSeenIntro(true)}
      >
        {/* Subtle radial center gold illumination */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(201,169,110,0.08)_0%,transparent_70%)] pointer-events-none filter blur-2xl" />

        <div className="relative text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="font-serif text-5xl sm:text-7xl font-light tracking-[-0.03em] text-[#ECEEF3]">
              Verity
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4"
          >
            <p className="text-sm sm:text-base font-light tracking-[0.25em] text-[#C9A96E] uppercase">
              Growth, verified
            </p>
            <p className="text-xs text-[#8C93A5] tracking-widest mt-3 font-normal">
              WHERE NOTHING LEAVES UNVERIFIED
            </p>
          </motion.div>
        </div>

        {/* Skip button in bottom right */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setHasSeenIntro(true);
          }}
          className="absolute bottom-8 right-8 text-xs font-mono tracking-wider text-[#5B6272] hover:text-[#ECEEF3] px-3 py-1.5 rounded border border-[#232834] transition-colors"
        >
          SKIP [ESC]
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
