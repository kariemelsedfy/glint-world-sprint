import React, { useRef, useState, useCallback, useEffect } from 'react';
import { TargetCollectibleIcon, MapIcon, SparkleHintIcon } from './Icons';

interface TouchControlsProps {
  onTouchAxis(x: number, z: number): void;
  onMapClick(): void;
  onHintClick(): void;
  onActionClick(): void;
  hasAvailableHint?: boolean;
}

export function TouchControls({
  onTouchAxis,
  onMapClick,
  onHintClick,
  onActionClick,
  hasAvailableHint = true,
}: TouchControlsProps) {
  const stickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null);

  const STICK_RADIUS = 40; // Max displacement in pixels

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (activeTouchId !== null) return;
    const touch = e.changedTouches[0];
    setActiveTouchId(touch.identifier);
    updateKnob(touch.clientX, touch.clientY);
  };

  const updateKnob = useCallback(
    (clientX: number, clientY: number) => {
      if (!stickRef.current) return;
      const rect = stickRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > STICK_RADIUS) {
        dx = (dx / dist) * STICK_RADIUS;
        dy = (dy / dist) * STICK_RADIUS;
      }

      setKnobPos({ x: dx, y: dy });

      // Emits normalized X and Z values (-1 to +1)
      const normX = Number((dx / STICK_RADIUS).toFixed(2));
      const normZ = Number((dy / STICK_RADIUS).toFixed(2));
      onTouchAxis(normX, normZ);
    },
    [onTouchAxis]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          updateKnob(touch.clientX, touch.clientY);
          break;
        }
      }
    },
    [activeTouchId, updateKnob]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          setActiveTouchId(null);
          setKnobPos({ x: 0, y: 0 });
          onTouchAxis(0, 0); // Clear input on cancel/release
          break;
        }
      }
    },
    [activeTouchId, onTouchAxis]
  );

  // Fallback mouse support for testing thumbstick on desktop preview
  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsMouseDown(true);
    updateKnob(e.clientX, e.clientY);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isMouseDown) updateKnob(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      if (isMouseDown) {
        setIsMouseDown(false);
        setKnobPos({ x: 0, y: 0 });
        onTouchAxis(0, 0);
      }
    };
    if (isMouseDown) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isMouseDown, updateKnob, onTouchAxis]);

  return (
    <div className="absolute inset-0 pointer-events-none flex justify-between items-end p-4 sm:p-6 select-none z-30">
      {/* Lower-left Virtual Thumbstick */}
      <div className="pointer-events-auto flex flex-col items-center">
        <div
          ref={stickRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onMouseDown={handleMouseDown}
          className="relative w-28 h-28 rounded-full bg-[#12253B]/50 backdrop-blur-md border-3 border-white/40 shadow-xl flex items-center justify-center touch-none cursor-pointer"
          style={{ touchAction: 'none' }}
          role="slider"
          aria-label="Virtual movement thumbstick"
          aria-valuenow={knobPos.x}
        >
          {/* Base Crosshairs */}
          <div className="absolute w-full h-[1px] bg-white/20" />
          <div className="absolute h-full w-[1px] bg-white/20" />

          {/* Draggable Knob */}
          <div
            className="w-12 h-12 rounded-full bg-[#FFC857] border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] flex items-center justify-center pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-[#12253B]/30" />
          </div>
        </div>
        <span className="text-[10px] font-black text-white/80 bg-[#12253B]/70 px-2 py-0.5 rounded-full mt-1.5 backdrop-blur-sm">
          STEER
        </span>
      </div>

      {/* Right-side 44px-or-larger Action Buttons */}
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {/* Map and Hint secondary quick buttons */}
        <div className="flex items-center gap-2">
          {hasAvailableHint && (
            <button
              type="button"
              onClick={onHintClick}
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full bg-[#FFF6E5] active:scale-95 text-[#12253B] border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
              title="View Hint"
              aria-label="View Hint"
            >
              <SparkleHintIcon size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={onMapClick}
            className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full bg-[#24B8E8] active:scale-95 text-[#12253B] border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
            title="Open Map"
            aria-label="Open Map"
          >
            <MapIcon size={20} />
          </button>
        </div>

        {/* Primary Action / Collect Button (>= 56px) */}
        <button
          type="button"
          onClick={onActionClick}
          className="w-16 h-16 min-w-[56px] min-h-[56px] rounded-full bg-[#78D896] hover:bg-[#6ed38c] active:scale-90 text-[#12253B] font-black text-xs border-3 border-[#12253B] shadow-[3px_3px_0px_0px_#12253B] flex flex-col items-center justify-center leading-none focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none cursor-pointer"
          title="Collect / Action"
          aria-label="Collect or Interact"
        >
          <span className="text-base font-black">★</span>
          <span className="text-[10px] uppercase font-black">Collect</span>
        </button>
      </div>
    </div>
  );
}
