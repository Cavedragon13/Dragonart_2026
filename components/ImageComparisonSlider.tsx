import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImageComparisonSliderProps {
  beforeSrc: string;
  afterSrc: string;
}

export const ImageComparisonSlider: React.FC<ImageComparisonSliderProps> = ({ beforeSrc, afterSrc }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handlePointerUp = useCallback((e: PointerEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none group"
      onPointerDown={(e) => {
        handleMove(e.clientX); // Allow click to set position
      }}
    >
      <img
        src={afterSrc}
        alt=""
        className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
      />
      <div
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeSrc}
          alt=""
          className="absolute top-0 left-0 w-full h-full object-contain"
        />
      </div>
      <div
        className="absolute top-0 h-full w-1 bg-white cursor-ew-resize opacity-80 group-hover:opacity-100 transition-opacity"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-2xl transition-transform duration-200 group-hover:scale-110"
          onPointerDown={handlePointerDown}
        >
          <svg className="w-6 h-6 text-gray-700 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
          </svg>
        </div>
      </div>
    </div>
  );
};