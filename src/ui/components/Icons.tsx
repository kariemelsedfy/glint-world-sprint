import type { SVGProps } from 'react';
interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export function CompassIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
      <polygon points="12,4 15,12 12,10 9,12" fill="#FF655B" />
      <polygon points="12,20 15,12 12,14 9,12" fill="#12253B" opacity="0.6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

export function GlobeIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function TimerIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M10 2h4" />
      <path d="M12 2v3" />
    </svg>
  );
}

export function MapIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

export function SparkleHintIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="11,7 12.2,9.8 15,11 12.2,12.2 11,15 9.8,12.2 7,11 9.8,9.8" fill="#FFC857" />
    </svg>
  );
}

export function TargetCollectibleIcon({ kind, size = 32, className = '' }: { kind?: string; size?: number; className?: string }) {
  switch (kind) {
    case 'tower-token':
    case 'paris-iron':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="#24B8E8" stroke="#12253B" strokeWidth="2" />
          <path d="M16 6 L12 24 H20 Z" fill="#FFC857" stroke="#12253B" strokeWidth="1.5" />
          <line x1="13.5" y1="16" x2="18.5" y2="16" stroke="#12253B" strokeWidth="1.5" />
          <path d="M14 24 C14 20 18 20 18 24" fill="#12253B" />
        </svg>
      );
    case 'portrait':
    case 'paris-smile':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="5" y="4" width="22" height="24" rx="3" fill="#FFF6E5" stroke="#12253B" strokeWidth="2" />
          <rect x="8" y="7" width="16" height="18" rx="1.5" fill="#78D896" stroke="#12253B" strokeWidth="1" />
          <circle cx="16" cy="13" r="3.5" fill="#12253B" />
          <path d="M12 22 C12 18 20 18 20 22" fill="#12253B" />
        </svg>
      );
    case 'croissant':
    case 'paris-crescent':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="#FFF6E5" stroke="#12253B" strokeWidth="2" />
          <path d="M8 18 C9 12 14 9 18 10 C22 11 25 15 24 19 C23 20 20 19 16 16 C12 13 9 17 8 18 Z" fill="#FFC857" stroke="#12253B" strokeWidth="1.5" />
          <path d="M13 11 C15 15 17 17 19 19" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'pyramidion':
    case 'giza-crown':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <polygon points="16,5 5,25 27,25" fill="#FFC857" stroke="#12253B" strokeWidth="2" />
          <polygon points="16,5 21,25 27,25" fill="#D97706" stroke="#12253B" strokeWidth="1.5" />
          <polygon points="16,5 11,15 21,15" fill="#FEF08A" stroke="#12253B" strokeWidth="1" />
        </svg>
      );
    case 'giza-guardian':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="#FFF6E5" stroke="#12253B" strokeWidth="2" />
          <rect x="7" y="15" width="18" height="10" rx="3" fill="#FFC857" stroke="#12253B" strokeWidth="1.5" />
          <circle cx="13" cy="11" r="5" fill="#FFC857" stroke="#12253B" strokeWidth="1.5" />
          <path d="M10 8 L16 8 L15 13 L11 13 Z" fill="#24B8E8" />
        </svg>
      );
    case 'scarab':
    case 'giza-beetle':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="#19A7A0" stroke="#12253B" strokeWidth="2" />
          <ellipse cx="16" cy="17" rx="6" ry="8" fill="#FFC857" stroke="#12253B" strokeWidth="1.5" />
          <circle cx="16" cy="8" r="3" fill="#FF655B" stroke="#12253B" strokeWidth="1" />
          <line x1="16" y1="9" x2="16" y2="25" stroke="#12253B" strokeWidth="1.5" />
          <path d="M10 13 L6 11 M22 13 L26 11 M10 20 L6 22 M22 20 L26 22" stroke="#12253B" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="#FFC857" stroke="#12253B" strokeWidth="2" />
          <polygon points="16,8 18.5,13.5 24,14.5 20,18.5 21,24 16,21 11,24 12,18.5 8,14.5 13.5,13.5" fill="#FFF6E5" stroke="#12253B" strokeWidth="1.5" />
        </svg>
      );
  }
}

export function MedalBadge({ medal, size = 48, className = '' }: { medal: 'gold' | 'silver' | 'bronze' | 'complete'; size?: number; className?: string }) {
  const colors = {
    gold: { main: '#FFC857', rim: '#B45309', ribbon: '#DC2626', label: '1ST' },
    silver: { main: '#E2E8F0', rim: '#64748B', ribbon: '#2563EB', label: '2ND' },
    bronze: { main: '#FDBA74', rim: '#9A3412', ribbon: '#059669', label: '3RD' },
    complete: { main: '#78D896', rim: '#047857', ribbon: '#12253B', label: 'CLEAR' },
  }[medal];

  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 48 60" fill="none" className={className} aria-label={`${medal} medal`}>
      {/* Ribbon */}
      <polygon points="16,0 24,20 20,0" fill={colors.ribbon} />
      <polygon points="32,0 24,20 28,0" fill={colors.ribbon} opacity="0.85" />
      <polygon points="16,0 32,0 24,18" fill={colors.ribbon} opacity="0.95" />
      {/* Medal disc */}
      <circle cx="24" cy="36" r="20" fill={colors.main} stroke="#12253B" strokeWidth="3" />
      <circle cx="24" cy="36" r="15" fill="none" stroke={colors.rim} strokeWidth="2" strokeDasharray="3 2" />
      <text x="24" y="41" textAnchor="middle" fill="#12253B" fontSize="11" fontWeight="900" fontFamily="sans-serif">
        {colors.label}
      </text>
    </svg>
  );
}

export function SoundOnIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function SoundOffIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export function RotateDeviceIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="2" width="16" height="12" rx="2" />
      <path d="M12 18v4" />
      <path d="M8 22h8" />
      <path d="M20 7l2 2-2 2" />
    </svg>
  );
}

export function SettingsIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function CheckIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function PauseIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}
