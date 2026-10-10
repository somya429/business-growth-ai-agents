import React from 'react';
import w360 from '../assets/mascot-360.webp';
import w720 from '../assets/mascot-720.webp';
import png from '../assets/mascot-720.png';

interface MascotProps {
  mood?: 'idle' | 'working' | 'happy' | 'still' | string;
  size?: number;
  className?: string;
}

// mood: 'idle' (slow float) | 'working' (quick bob) | 'happy' (one pop) | 'still' (no motion)
// size: width in px. Decorative mascot is hidden from screen readers.
export const Mascot: React.FC<MascotProps> = ({ mood = 'idle', size = 120, className = '' }) => {
  return (
    <picture>
      <source type="image/webp" srcSet={`${w360} 360w, ${w720} 720w`} sizes={`${size}px`} />
      <img
        className={`mascot mascot--${mood} ${className}`}
        src={png}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </picture>
  );
};

export default Mascot;
