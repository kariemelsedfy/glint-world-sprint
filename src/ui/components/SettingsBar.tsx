import { useState } from 'react';
import type { Settings } from '@/shared/contracts';
import { ArcadeButton, ArcadePanel } from './Arcade';
import { SettingsIcon, SoundOffIcon, SoundOnIcon } from './Icons';

interface SettingsBarProps {
  settings: Settings;
  onSettings(patch: Partial<Settings>): void;
  className?: string;
  variant?: 'floating' | 'inline';
}

export function SettingsBar({ settings, onSettings, className = '', variant = 'floating' }: SettingsBarProps) {
  const [open, setOpen] = useState(false);

  const toggleMuted = () => onSettings({ muted: !settings.muted });
  const toggleMotion = () => onSettings({ reducedMotion: !settings.reducedMotion });
  const toggleQuality = () => onSettings({ quality: settings.quality === 'standard' ? 'low' : 'standard' });

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap items-center gap-3 pointer-events-auto ${className}`}>
        <ArcadeButton
          size="sm"
          tone={settings.muted ? 'cream' : 'cyan'}
          onClick={toggleMuted}
          aria-pressed={settings.muted}
          icon={settings.muted ? <SoundOffIcon size={16} /> : <SoundOnIcon size={16} />}
        >
          {settings.muted ? 'Muted' : 'Sound on'}
        </ArcadeButton>
        <ArcadeButton size="sm" tone={settings.reducedMotion ? 'purple' : 'cream'} onClick={toggleMotion} aria-pressed={settings.reducedMotion}>
          Motion: {settings.reducedMotion ? 'Reduced' : 'Full'}
        </ArcadeButton>
        <ArcadeButton size="sm" tone={settings.quality === 'low' ? 'yellow' : 'cream'} onClick={toggleQuality} aria-pressed={settings.quality === 'low'}>
          Quality: {settings.quality === 'standard' ? 'Standard' : 'Low'}
        </ArcadeButton>
      </div>
    );
  }

  return (
    <div className={`relative pointer-events-auto ${className}`}>
      <div className="flex items-center gap-2">
        <ArcadeButton
          square
          tone="ink"
          onClick={toggleMuted}
          title={settings.muted ? 'Unmute sound' : 'Mute sound'}
          aria-label={settings.muted ? 'Unmute sound' : 'Mute sound'}
          aria-pressed={settings.muted}
          icon={
            settings.muted ? (
              <SoundOffIcon size={18} className="text-[var(--ar-pink)]" />
            ) : (
              <SoundOnIcon size={18} className="text-[var(--ar-cyan)]" />
            )
          }
        />
        <ArcadeButton
          square
          tone="ink"
          onClick={() => setOpen((prev) => !prev)}
          title="Settings"
          aria-label="Settings"
          aria-expanded={open}
          icon={<SettingsIcon size={18} className={open ? 'text-[var(--ar-yellow)]' : undefined} />}
        />
      </div>

      {open && (
        <ArcadePanel
          tone="ink"
          pad="sm"
          role="dialog"
          aria-label="Game settings"
          className="glint-fade-in absolute right-0 top-full mt-3 w-64 z-50 text-xs space-y-2"
        >
          <div className="flex items-center justify-between pb-1.5 border-b-2 border-[var(--ar-purple)] ar-display text-sm text-[var(--ar-yellow)]">
            <span>Preferences</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[32px] min-w-[32px] hover:text-white px-1 rounded text-sm leading-none focus-visible:outline-3 focus-visible:outline-[var(--ar-cyan)] outline-none"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <SettingRow label="Sound" onClick={toggleMuted} active={!settings.muted} tone="cyan">
            {settings.muted ? 'Muted' : 'On'}
          </SettingRow>
          <SettingRow label="Reduced motion" onClick={toggleMotion} active={settings.reducedMotion} tone="yellow">
            {settings.reducedMotion ? 'On' : 'Off'}
          </SettingRow>
          <SettingRow label="3D quality" onClick={toggleQuality} active={settings.quality === 'standard'} tone="pink">
            {settings.quality === 'standard' ? 'Standard' : 'Low'}
          </SettingRow>
        </ArcadePanel>
      )}
    </div>
  );
}

function SettingRow({
  label,
  onClick,
  active,
  tone,
  children,
}: {
  label: string;
  onClick(): void;
  active: boolean;
  tone: 'cyan' | 'yellow' | 'pink';
  children: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-extrabold">{label}</span>
      <ArcadeButton size="sm" tone={active ? tone : 'cream'} onClick={onClick} aria-label={`${label}: ${children}`} className="min-w-[84px]">
        {children}
      </ArcadeButton>
    </div>
  );
}
