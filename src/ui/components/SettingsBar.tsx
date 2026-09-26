import { useState } from 'react';
import type { Settings } from '@/shared/contracts';
import { SettingsIcon, SoundOffIcon, SoundOnIcon } from './Icons';

interface SettingsBarProps {
  settings: Settings;
  onSettings(patch: Partial<Settings>): void;
  className?: string;
  variant?: 'floating' | 'inline';
}

const TOGGLE =
  'min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none';

export function SettingsBar({ settings, onSettings, className = '', variant = 'floating' }: SettingsBarProps) {
  const [open, setOpen] = useState(false);

  const toggleMuted = () => onSettings({ muted: !settings.muted });
  const toggleMotion = () => onSettings({ reducedMotion: !settings.reducedMotion });
  const toggleQuality = () => onSettings({ quality: settings.quality === 'standard' ? 'low' : 'standard' });

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap items-center gap-2 pointer-events-auto ${className}`}>
        <button
          type="button"
          onClick={toggleMuted}
          aria-pressed={settings.muted}
          className={`${TOGGLE} inline-flex items-center gap-1.5 bg-[#FFF6E5] text-[#12253B] border-[#12253B]/30 hover:bg-white`}
        >
          {settings.muted ? (
            <SoundOffIcon size={16} className="text-[#FF655B]" />
          ) : (
            <SoundOnIcon size={16} className="text-[#19A7A0]" />
          )}
          <span>{settings.muted ? 'Muted' : 'Sound on'}</span>
        </button>
        <button
          type="button"
          onClick={toggleMotion}
          aria-pressed={settings.reducedMotion}
          className={`${TOGGLE} ${
            settings.reducedMotion
              ? 'bg-[#12253B] text-white border-[#12253B]'
              : 'bg-[#FFF6E5] text-[#12253B] border-[#12253B]/30 hover:bg-white'
          }`}
        >
          Motion: {settings.reducedMotion ? 'Reduced' : 'Full'}
        </button>
        <button
          type="button"
          onClick={toggleQuality}
          aria-pressed={settings.quality === 'low'}
          className={`${TOGGLE} ${
            settings.quality === 'low'
              ? 'bg-[#FFC857] text-[#12253B] border-[#12253B]'
              : 'bg-[#FFF6E5] text-[#12253B] border-[#12253B]/30 hover:bg-white'
          }`}
        >
          Quality: {settings.quality === 'standard' ? 'Standard' : 'Low'}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative pointer-events-auto ${className}`}>
      <div className="flex items-center gap-1 bg-[#12253B]/90 backdrop-blur-md text-[#FFF6E5] p-1 rounded-full border border-white/20 shadow-lg">
        <button
          type="button"
          onClick={toggleMuted}
          className="min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-colors flex items-center justify-center"
          title={settings.muted ? 'Unmute sound' : 'Mute sound'}
          aria-label={settings.muted ? 'Unmute sound' : 'Mute sound'}
          aria-pressed={settings.muted}
        >
          {settings.muted ? (
            <SoundOffIcon size={18} className="text-[#FF655B]" />
          ) : (
            <SoundOnIcon size={18} className="text-[#78D896]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-colors flex items-center justify-center ${
            open ? 'bg-white/20 text-[#FFC857]' : ''
          }`}
          title="Settings"
          aria-label="Settings"
          aria-expanded={open}
        >
          <SettingsIcon size={18} />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Game settings"
          className="glint-fade-in absolute right-0 top-full mt-2 w-64 bg-[#12253B] text-[#FFF6E5] rounded-xl p-3 border-2 border-white/20 shadow-2xl z-50 text-xs space-y-2"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-bold tracking-wider text-[11px] uppercase text-[#FFC857]">
            <span>Preferences</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[32px] min-w-[32px] hover:text-white px-1 py-0.5 rounded text-sm leading-none focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <SettingRow label="Sound" onClick={toggleMuted} active={!settings.muted} activeClass="bg-[#78D896]">
            {settings.muted ? 'Muted' : 'On'}
          </SettingRow>
          <SettingRow label="Reduced motion" onClick={toggleMotion} active={settings.reducedMotion} activeClass="bg-[#FFC857]">
            {settings.reducedMotion ? 'On' : 'Off'}
          </SettingRow>
          <SettingRow
            label="3D quality"
            onClick={toggleQuality}
            active={settings.quality === 'standard'}
            activeClass="bg-[#24B8E8]"
          >
            {settings.quality === 'standard' ? 'Standard' : 'Low'}
          </SettingRow>
        </div>
      )}
    </div>
  );
}

function SettingRow({
  label,
  onClick,
  active,
  activeClass,
  children,
}: {
  label: string;
  onClick(): void;
  active: boolean;
  activeClass: string;
  children: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium">{label}</span>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={`${label}: ${children}`}
        className={`min-h-[36px] min-w-[64px] px-2.5 py-1 rounded font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none ${
          active ? `${activeClass} text-[#12253B]` : 'bg-white/20 text-white/80'
        }`}
      >
        {children}
      </button>
    </div>
  );
}
