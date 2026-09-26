/**
 * Arcade primitives. Owner: A5. Presentation only — no rules, timers or store access.
 * Styles live in glint.css under .glint-ui (tokens: --ar-*).
 */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export type ArcadeTone = 'yellow' | 'pink' | 'cyan' | 'purple' | 'cream' | 'ink';
export type ArcadeSize = 'sm' | 'md' | 'lg';

interface ArcadeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ArcadeTone;
  size?: ArcadeSize;
  icon?: ReactNode;
  block?: boolean;
  square?: boolean;
}

export function ArcadeButton({
  tone = 'cream',
  size = 'md',
  icon,
  block = false,
  square = false,
  className = '',
  children,
  ...rest
}: ArcadeButtonProps) {
  return (
    <button
      type="button"
      className={`ar-btn ar-btn-${tone} ar-btn-${size} ${block ? 'ar-btn-block' : ''} ${square ? 'ar-btn-square' : ''} ${className}`}
      {...rest}
    >
      {icon && (
        <span className="ar-btn-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

interface ArcadePanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'cream' | 'ink' | 'lavender';
  pad?: 'none' | 'sm' | 'md' | 'lg';
}

export function ArcadePanel({ tone = 'cream', pad = 'md', className = '', children, ...rest }: ArcadePanelProps) {
  return (
    <div className={`ar-panel ar-panel-${tone} ar-pad-${pad} ${className}`} {...rest}>
      {children}
    </div>
  );
}

interface StatChipProps {
  label: string;
  value: ReactNode;
  tone?: ArcadeTone;
  icon?: ReactNode;
  className?: string;
  live?: boolean;
}

export function StatChip({ label, value, tone = 'ink', icon, className = '', live = false }: StatChipProps) {
  return (
    <div className={`ar-chip ar-chip-${tone} ${className}`} aria-live={live ? 'polite' : undefined}>
      {icon && (
        <span className="ar-chip-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ar-chip-label">{label}</span>
      <span className="ar-chip-value glint-tabular">{value}</span>
    </div>
  );
}

interface PhotoCardProps {
  src: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  collected?: boolean;
  selected?: boolean;
  caption?: ReactNode;
  className?: string;
}

/** Polaroid-style target photo. Images come from the view model only; nothing is fetched here. */
export function PhotoCard({ src, alt, size = 'md', collected = false, selected = false, caption, className = '' }: PhotoCardProps) {
  return (
    <figure
      className={`ar-photo ar-photo-${size} ${collected ? 'ar-photo-collected' : ''} ${selected ? 'ar-photo-selected' : ''} ${className}`}
    >
      <div className="ar-photo-frame">
        <img src={src} alt={alt} draggable={false} loading="eager" decoding="async" />
        {collected && (
          <span className="ar-photo-stamp" aria-hidden="true">
            FOUND
          </span>
        )}
      </div>
      {caption && <figcaption className="ar-photo-caption">{caption}</figcaption>}
    </figure>
  );
}

/** Small ink keycap; only render for keys that really work. */
export function Keycap({ children }: { children: ReactNode }) {
  return <kbd className="ar-keycap">{children}</kbd>;
}
