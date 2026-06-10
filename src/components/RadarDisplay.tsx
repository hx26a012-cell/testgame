import React, { useRef, useEffect } from 'react';
import { Player, Enemy, Item } from '../types';

interface RadarDisplayProps {
  player: Player;
  enemies: Enemy[];
  items: Item[];
  radarRange: number;
  sweepAngle: number;
}

export const RadarDisplay: React.FC<RadarDisplayProps> = ({
  player,
  enemies,
  items,
  radarRange,
  sweepAngle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = cx - 15; // padding for labels

    // Clear with dark greenish-black space background
    ctx.fillStyle = '#030d08';
    ctx.fillRect(0, 0, width, height);

    // Grid concentric circles
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.lineWidth = 1;
    for (let r = 0.2; r <= 1.0; r += 0.2) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius * r, 0, Math.PI * 2);
      ctx.stroke();

      // Range text
      if (r > 0.3) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.font = '8px monospace';
        ctx.fillText(`${Math.round(radarRange * r)}m`, cx + 2, cy - maxRadius * r + 8);
      }
    }

    // Crosshairs lines
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.beginPath();
    ctx.moveTo(cx - maxRadius, cy);
    ctx.lineTo(cx + maxRadius, cy);
    ctx.moveTo(cx, cy - maxRadius);
    ctx.lineTo(cx, cy + maxRadius);
    ctx.stroke();

    // Radar scanner sweeps
    const scanGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
    scanGradient.addColorStop(0, 'rgba(16, 185, 129, 0)');
    scanGradient.addColorStop(0.8, 'rgba(16, 185, 129, 0.03)');
    scanGradient.addColorStop(1, 'rgba(16, 185, 129, 0.08)');

    ctx.fillStyle = scanGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
    ctx.fill();

    // Sweep Line (radial arm)
    const sweepX = cx + Math.cos(sweepAngle) * maxRadius;
    const sweepY = cy + Math.sin(sweepAngle) * maxRadius;

    // Drawing sweep fade trail
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sweepX, sweepY);
    ctx.stroke();

    // Soft gradient tail for sweep
    ctx.shadowBlur = 0; // Reset
    ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxRadius, sweepAngle - 0.25, sweepAngle, false);
    ctx.closePath();
    ctx.fill();

    // Draw Items on Radar (cyan colored small pips)
    items.forEach((item) => {
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radarRange) {
        const rRatio = dist / radarRange;
        const angle = Math.atan2(dy, dx);

        const rx = cx + Math.cos(angle) * maxRadius * rRatio;
        const ry = cy + Math.sin(angle) * maxRadius * rRatio;

        ctx.fillStyle = '#06b6d4'; // Cyan
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Targets (enemeies) on Radar (Red/Orange with different icons or blips based on depth)
    enemies.forEach((enemy) => {
      if (enemy.isDead) return;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radarRange) {
        const rRatio = dist / radarRange;
        const angle = Math.atan2(dy, dx);

        const rx = cx + Math.cos(angle) * maxRadius * rRatio;
        const ry = cy + Math.sin(angle) * maxRadius * rRatio;

        // Visual design for dots based on depth:
        // Depth 0 (surface) = Red, solid, flashing solid
        // Depth 1 (submerged) = Medium green/orange, outline
        // Depth 2 (deep sea) = Faint flashing red outline, difficult to observe unless scan hits
        
        let color = '#ef4444'; // Red for surface
        let radius = 3.5;
        let style: 'filled' | 'outline' = 'filled';

        if (enemy.depth === 1) {
          color = '#f97316'; // Orange
          style = 'outline';
        } else if (enemy.depth === 2) {
          color = '#ec4899'; // Deep Pink / Purple
          style = 'outline';
          radius = 2.5;
        }

        // Check angle proximity to sweep line for radar flare intensity (persistence)
        // Sweep angle is 0 to 2PI. Target angle relative to center is relative to player coordinates.
        // We match them!
        let sweepTargetDiff = Math.abs(sweepAngle - (angle < 0 ? angle + Math.PI * 2 : angle));
        if (sweepTargetDiff > Math.PI) {
          sweepTargetDiff = Math.PI * 2 - sweepTargetDiff;
        }

        if (sweepTargetDiff < 0.2) {
          enemy.detectedAlpha = 1.0; // Recharge detect flare
        } else {
          enemy.detectedAlpha = Math.max(0.15, enemy.detectedAlpha - 0.005); // Fade slowly
        }

        ctx.save();
        ctx.globalAlpha = enemy.detectedAlpha;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;

        if (style === 'filled') {
          ctx.beginPath();
          ctx.arc(rx, ry, radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(rx, ry, radius, 0, Math.PI * 2);
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Small cross inside outline
          ctx.beginPath();
          ctx.moveTo(rx - 1, ry);
          ctx.lineTo(rx + 1, ry);
          ctx.moveTo(rx, ry - 1);
          ctx.lineTo(rx, ry + 1);
          ctx.stroke();
        }

        // Proximity indicator
        if (dist < 400 && Date.now() % 500 < 250) {
          // Warning box around dangerous hostile directly near player
          ctx.strokeStyle = '#f43f5e';
          ctx.strokeRect(rx - 6, ry - 6, 12, 12);
        }

        // Labels for big creatures
        if (enemy.type === 'squid' || enemy.type === 'leviathan') {
          ctx.fillStyle = color;
          ctx.font = 'semibold 8px Courier New';
          ctx.fillText(
            `${enemy.name.substring(0, 4)}[D:${enemy.depth === 0 ? 'SRF' : enemy.depth === 1 ? 'SUB' : 'DEP'}]`,
            rx + 6,
            ry - 2
          );
        }

        ctx.restore();
      }
    });

    // Draw active flight heading of player at center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.angle);

    // Airplane schematic chevron icon symbol
    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9); // Nose
    ctx.lineTo(6, 6);   // Right wing tip
    ctx.lineTo(2, 4);   // Right wing root
    ctx.lineTo(0, 8);   // Tail
    ctx.lineTo(-2, 4);  // Left wing root
    ctx.lineTo(-6, 6);  // Left wing tip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Radar cone forward sweep headlight (representing flight vision)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 45, -Math.PI / 4 - Math.PI / 2, Math.PI / 4 - Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Tactical Radar UI decorations
    ctx.fillStyle = '#10b981';
    ctx.font = '700 9px monospace';
    ctx.fillText('TACTICAL SONAR/RADAR L22', 10, 15);

    // Active Status lights
    ctx.fillStyle = Date.now() % 1000 < 600 ? '#10b981' : '#047857';
    ctx.beginPath();
    ctx.arc(width - 15, 11, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
    ctx.font = '7px monospace';
    ctx.fillText('SCAN ACTIVE', width - 68, 13);

  }, [player, enemies, items, radarRange, sweepAngle]);

  return (
    <div id="radar-panel" className="relative flex flex-col items-center border border-emerald-950/60 bg-[#020a06]/90 p-3 rounded-lg shadow-inner shadow-emerald-950/40">
      <div className="absolute top-1.5 left-3 text-[9px] font-mono tracking-wider text-emerald-500/70 select-none">
        PROXIMITY SYSTEM
      </div>
      <canvas
        id="sonar-radar-canvas"
        ref={canvasRef}
        width={190}
        height={190}
        className="border border-emerald-500/30 rounded-full select-none"
      />
      <div className="mt-2.5 w-full text-center text-[10px] font-mono select-none flex justify-between px-2 text-emerald-300">
        <div>COORDS: {Math.round(player.x)}, {Math.round(player.y)}</div>
        <div className="text-cyan-400">PBLIPS: {enemies.filter(e => !e.isDead && Math.hypot(e.x - player.x, e.y - player.y) <= radarRange).length}</div>
      </div>
    </div>
  );
};
