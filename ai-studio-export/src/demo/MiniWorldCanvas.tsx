import React, { useRef, useEffect } from 'react';
import { Phase, CityId } from '@/contracts/game';

interface MiniWorldCanvasProps {
  phase: Phase;
  cityId: CityId | null;
  playerPos: [number, number];
  onSelectCity?: (city: CityId) => void;
  reducedMotion?: boolean;
}

export function MiniWorldCanvas({
  phase,
  cityId,
  playerPos,
  onSelectCity,
  reducedMotion = false,
}: MiniWorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (!reducedMotion) {
        rotRef.current += 0.008;
      }

      ctx.clearRect(0, 0, w, h);

      // State-specific rendering
      if (phase === 'menu' || phase === 'briefing' || phase === 'globe') {
        // --- 3D TOY GLOBE VIEW ---
        // Sky backdrop
        const grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h));
        grad.addColorStop(0, '#1B3552');
        grad.addColorStop(1, '#0F1E30');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Stars
        ctx.fillStyle = 'rgba(255, 246, 229, 0.4)';
        for (let i = 0; i < 40; i++) {
          const sx = (Math.sin(i * 99 + 1) * 0.5 + 0.5) * w;
          const sy = (Math.cos(i * 33 + 2) * 0.5 + 0.5) * h;
          ctx.beginPath();
          ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2);
          ctx.fill();
        }

        // Toy Globe
        const globeRadius = Math.min(w, h) * 0.28;
        const cx = w / 2;
        const cy = h / 2 + 10;

        // Globe sphere shadow
        ctx.beginPath();
        ctx.arc(cx + 8, cy + 12, globeRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10, 18, 28, 0.5)';
        ctx.fill();

        // Globe ocean sphere
        const oceanGrad = ctx.createRadialGradient(cx - globeRadius * 0.3, cy - globeRadius * 0.3, globeRadius * 0.1, cx, cy, globeRadius);
        oceanGrad.addColorStop(0, '#38CCF8');
        oceanGrad.addColorStop(0.7, '#1EA5D6');
        oceanGrad.addColorStop(1, '#11658E');
        ctx.fillStyle = oceanGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, globeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#12253B';
        ctx.stroke();

        // Globe grid rings (latitude / longitude)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.5;
        for (let lat = -2; lat <= 2; lat++) {
          ctx.beginPath();
          const rLat = Math.cos((lat * Math.PI) / 6) * globeRadius;
          const yOffset = Math.sin((lat * Math.PI) / 6) * globeRadius * 0.6;
          ctx.ellipse(cx, cy + yOffset, rLat, rLat * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Continents / Toy Landmasses
        const angle = rotRef.current;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, globeRadius - 2, 0, Math.PI * 2);
        ctx.clip();

        // Draw rolling stylized land patches
        for (let i = 0; i < 4; i++) {
          const landAngle = angle + (i * Math.PI) / 2;
          const lx = cx + Math.sin(landAngle) * (globeRadius * 0.85);
          const ly = cy + (i % 2 === 0 ? -globeRadius * 0.2 : globeRadius * 0.2);
          const visible = Math.cos(landAngle) > -0.2;
          if (visible) {
            ctx.fillStyle = i % 2 === 0 ? '#78D896' : '#59BE77';
            ctx.strokeStyle = '#12253B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(lx, ly, globeRadius * 0.38, globeRadius * 0.25, landAngle * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        // Toy Pin: Paris
        const parisAngle = angle + 0.5;
        const parisX = cx + Math.sin(parisAngle) * (globeRadius * 0.72);
        const parisY = cy - globeRadius * 0.35;
        const parisVis = Math.cos(parisAngle) > -0.1;

        if (parisVis) {
          ctx.fillStyle = '#FFC857';
          ctx.strokeStyle = '#12253B';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(parisX, parisY - 14, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(parisX, parisY);
          ctx.lineTo(parisX, parisY - 8);
          ctx.stroke();
          ctx.fillStyle = '#FFF6E5';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText('PARIS', parisX - 16, parisY - 25);
        }

        // Toy Pin: Giza
        const gizaAngle = angle + 1.8;
        const gizaX = cx + Math.sin(gizaAngle) * (globeRadius * 0.72);
        const gizaY = cy + globeRadius * 0.05;
        const gizaVis = Math.cos(gizaAngle) > -0.1;

        if (gizaVis) {
          ctx.fillStyle = '#FF655B';
          ctx.strokeStyle = '#12253B';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(gizaX, gizaY - 14, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(gizaX, gizaY);
          ctx.lineTo(gizaX, gizaY - 8);
          ctx.stroke();
          ctx.fillStyle = '#FFF6E5';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText('GIZA', gizaX - 14, gizaY - 25);
        }

        ctx.restore();

        // Toy Clouds floating above globe
        ctx.fillStyle = 'rgba(255, 246, 229, 0.85)';
        ctx.beginPath();
        const cloudX = cx + Math.sin(angle * 0.6) * (globeRadius * 1.15);
        const cloudY = cy - globeRadius * 0.6;
        ctx.arc(cloudX, cloudY, 14, 0, Math.PI * 2);
        ctx.arc(cloudX + 12, cloudY - 4, 18, 0, Math.PI * 2);
        ctx.arc(cloudX + 26, cloudY, 12, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // --- 3D MINIATURE CITY VIEW (PARIS or GIZA) ---
        const isParis = cityId === 'paris' || cityId === null;

        // Ground base
        ctx.fillStyle = isParis ? '#F2EDE2' : '#FDE8C0'; // Cobblestone cream vs Sahara sand
        ctx.fillRect(0, 0, w, h);

        // Cobblestone / street grid
        ctx.strokeStyle = isParis ? '#DFD5C2' : '#E8CE99';
        ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x < w; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Roads
        ctx.fillStyle = isParis ? '#D9D0BE' : '#E0C18B';
        ctx.fillRect(0, h / 2 - 25, w, 50);
        ctx.fillRect(w / 2 - 25, 0, 50, h);

        // Buildings / Blockers (Toy blocks)
        const buildings = isParis
          ? [
              { x: w * 0.2, y: h * 0.25, bw: 90, bh: 70, color: '#C6BBA6', label: 'Eiffel Tower', icon: '🗼' },
              { x: w * 0.72, y: h * 0.25, bw: 100, bh: 80, color: '#D4C4AE', label: 'Louvre', icon: '🏛️' },
              { x: w * 0.22, y: h * 0.75, bw: 85, bh: 65, color: '#BDB09A', label: 'Montmartre', icon: '⛪' },
              { x: w * 0.75, y: h * 0.75, bw: 90, bh: 75, color: '#C9BEAC', label: 'Seine Docks', icon: '⛵' },
            ]
          : [
              { x: w * 0.22, y: h * 0.25, bw: 100, bh: 90, color: '#E8B966', label: 'Great Pyramid', icon: '▲' },
              { x: w * 0.72, y: h * 0.25, bw: 90, bh: 75, color: '#DEAB54', label: 'Sphinx Temple', icon: '🦁' },
              { x: w * 0.22, y: h * 0.75, bw: 80, bh: 70, color: '#D6A149', label: 'Papyrus Bazaar', icon: '🏺' },
              { x: w * 0.75, y: h * 0.75, bw: 95, bh: 80, color: '#E0AE5A', label: 'Valley Causeway', icon: '☀️' },
            ];

        buildings.forEach((b) => {
          // Shadow
          ctx.fillStyle = 'rgba(18, 37, 59, 0.18)';
          ctx.fillRect(b.x - b.bw / 2 + 6, b.y - b.bh / 2 + 8, b.bw, b.bh);

          // Building Block
          ctx.fillStyle = b.color;
          ctx.strokeStyle = '#12253B';
          ctx.lineWidth = 2.5;
          ctx.fillRect(b.x - b.bw / 2, b.y - b.bh / 2, b.bw, b.bh);
          ctx.strokeRect(b.x - b.bw / 2, b.y - b.bh / 2, b.bw, b.bh);

          // Label
          ctx.fillStyle = '#12253B';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(b.icon + ' ' + b.label, b.x, b.y + 4);
        });

        // Golden Collectible / Target replica hovering
        const bob = Math.sin(rotRef.current * 3) * 6;
        const targetX = w * 0.28;
        const targetY = h * 0.38 + bob;

        // Shadow under replica
        ctx.fillStyle = 'rgba(18, 37, 59, 0.25)';
        ctx.beginPath();
        ctx.ellipse(targetX, h * 0.38 + 18, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Spinning golden jewel
        ctx.fillStyle = '#FFC857';
        ctx.strokeStyle = '#12253B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#12253B';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('★ REPLICA', targetX, targetY - 18);

        // Player Miniature Explorer
        // Map playerPos (-72..72) to canvas coordinates
        const px = w / 2 + (playerPos[0] / 72) * (w * 0.4);
        const py = h / 2 + (playerPos[1] / 72) * (h * 0.4);

        // Player shadow
        ctx.fillStyle = 'rgba(18, 37, 59, 0.35)';
        ctx.beginPath();
        ctx.ellipse(px + 3, py + 5, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Player Explorer Body
        ctx.fillStyle = '#24B8E8';
        ctx.strokeStyle = '#12253B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Direction visor
        ctx.fillStyle = '#FFC857';
        ctx.beginPath();
        ctx.arc(px + 4, py - 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // Center dot
        ctx.fillStyle = '#FFF6E5';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [phase, cityId, playerPos, reducedMotion]);

  // Click handler on canvas (verifying pointer-events pass-through)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase === 'globe' || phase === 'menu') {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (clickX < rect.width / 2) {
        onSelectCity?.('paris');
      } else {
        onSelectCity?.('giza');
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      aria-label="3D World Canvas"
    />
  );
}
