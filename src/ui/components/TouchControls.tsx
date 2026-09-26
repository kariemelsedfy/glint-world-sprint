import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent } from 'react';

interface TouchControlsProps {
  onTouchAxis(x: number, z: number): void;
}

/** Landscape thumbstick. Emits normalized (x, z) axes and (0, 0) on release. */
export function TouchControls({ onTouchAxis }: TouchControlsProps) {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null);

  const STICK_RADIUS = 40; // Max displacement in pixels

  // Knob position is written straight to the DOM so drags never re-render React.
  const setKnobPos = (x: number, y: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
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

      setKnobPos(dx, dy);

      // Emits normalized X and Z values (-1 to +1)
      const normX = Number((dx / STICK_RADIUS).toFixed(2));
      const normZ = Number((dy / STICK_RADIUS).toFixed(2));
      onTouchAxis(normX, normZ);
    },
    [onTouchAxis]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
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
    (e: TouchEvent<HTMLDivElement>) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          setActiveTouchId(null);
          setKnobPos(0, 0);
          onTouchAxis(0, 0); // Clear input on cancel/release
          break;
        }
      }
    },
    [activeTouchId, onTouchAxis]
  );

  // Fallback mouse support for testing thumbstick on desktop preview
  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
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
        setKnobPos(0, 0);
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
    <div className="absolute inset-0 pointer-events-none flex justify-start items-end p-4 sm:px-6 pb-[88px] select-none z-30">
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
          role="application"
          aria-label="Virtual movement thumbstick"
        >
          {/* Base Crosshairs */}
          <div className="absolute w-full h-[1px] bg-white/20" />
          <div className="absolute h-full w-[1px] bg-white/20" />

          {/* Draggable Knob */}
          <div
            ref={knobRef}
            className="w-12 h-12 rounded-full bg-[#FFC857] border-2 border-[#12253B] shadow-[2px_2px_0px_0px_#12253B] flex items-center justify-center pointer-events-none transition-transform duration-75"
          >
            <div className="w-4 h-4 rounded-full bg-[#12253B]/30" />
          </div>
        </div>
        <span className="text-[10px] font-black text-white/80 bg-[#12253B]/70 px-2 py-0.5 rounded-full mt-1.5 backdrop-blur-sm">
          STEER
        </span>
      </div>

    </div>
  );
}
