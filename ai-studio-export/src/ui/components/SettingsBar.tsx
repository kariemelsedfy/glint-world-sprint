import React, { useState } from 'react';
import { Settings } from '@/contracts/game';
import { SoundOnIcon, SoundOffIcon, SettingsIcon } from './Icons';

interface SettingsBarProps {
  settings: Settings;
  onSettings(patch: Partial<Settings>): void;
  className?: string;
  variant?: 'floating' | 'inline';
}

export function SettingsBar({ settings, onSettings, className = '', variant = 'floating' }: SettingsBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative pointer-events-auto ${className}`}>
      {variant === 'floating' ? (
        <div className="flex items-center gap-1 bg-[#12253B]/90 backdrop-blur-md text-[#FFF6E5] p-1.5 rounded-full border border-white/20 shadow-lg">
          <button
            type="button"
            onClick={() => onSettings({ muted: !settings.muted })}
            className="p-2 rounded-full hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-colors"
            title={settings.muted ? 'Unmute sound' : 'Mute sound'}
            aria-label={settings.muted ? 'Unmute sound' : 'Mute sound'}
          >
            {settings.muted ? <SoundOffIcon size={18} className="text-[#FF655B]" /> : <SoundOnIcon size={18} className="text-[#78D896]" />}
          </button>

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className={`p-2 rounded-full hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#FFC857] outline-none transition-colors ${open ? 'bg-white/20 text-[#FFC857]' : ''}`}
            title="Settings & Accessibility"
            aria-label="Settings & Accessibility"
            aria-expanded={open}
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSettings({ muted: !settings.muted })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#12253B]/20 text-xs font-semibold bg-[#FFF6E5] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#FFC857]"
          >
            {settings.muted ? <SoundOffIcon size={16} className="text-[#FF655B]" /> : <SoundOnIcon size={16} className="text-[#19A7A0]" />}
            <span>{settings.muted ? 'Muted' : 'Audio On'}</span>
          </button>
          <button
            type="button"
            onClick={() => onSettings({ reducedMotion: !settings.reducedMotion })}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#FFC857] ${
              settings.reducedMotion
                ? 'bg-[#12253B] text-white border-[#12253B]'
                : 'bg-[#FFF6E5] text-[#12253B] border-[#12253B]/20 hover:bg-white'
            }`}
          >
            Motion: {settings.reducedMotion ? 'Reduced' : 'Full'}
          </button>
          <button
            type="button"
            onClick={() => onSettings({ quality: settings.quality === 'standard' ? 'low' : 'standard' })}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#FFC857] ${
              settings.quality === 'low'
                ? 'bg-[#FFC857] text-[#12253B] border-[#12253B]'
                : 'bg-[#FFF6E5] text-[#12253B] border-[#12253B]/20 hover:bg-white'
            }`}
          >
            Quality: {settings.quality === 'standard' ? 'Standard' : 'Performance (Low)'}
          </button>
        </div>
      )}

      {/* Floating Popup */}
      {open && variant === 'floating' && (
        <div
          role="dialog"
          aria-label="Game Settings"
          className="absolute right-0 bottom-full mb-2 w-64 bg-[#12253B] text-[#FFF6E5] rounded-xl p-3 border-2 border-white/20 shadow-2xl z-50 text-xs space-y-2.5"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-bold tracking-wider text-[11px] uppercase text-[#FFC857]">
            <span>Preferences</span>
            <button
              onClick={() => setOpen(false)}
              className="hover:text-white px-1 py-0.5 rounded text-sm leading-none focus-visible:ring-2 focus-visible:ring-[#FFC857]"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Audio FX</span>
            <button
              type="button"
              onClick={() => onSettings({ muted: !settings.muted })}
              className={`px-2.5 py-1 rounded font-bold transition-colors ${
                !settings.muted ? 'bg-[#78D896] text-[#12253B]' : 'bg-white/20 text-white/70'
              }`}
            >
              {settings.muted ? 'Muted' : 'Sound On'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Reduced Motion</span>
            <button
              type="button"
              onClick={() => onSettings({ reducedMotion: !settings.reducedMotion })}
              className={`px-2.5 py-1 rounded font-bold transition-colors ${
                settings.reducedMotion ? 'bg-[#FFC857] text-[#12253B]' : 'bg-white/20 text-white/70'
              }`}
            >
              {settings.reducedMotion ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">3D Quality</span>
            <button
              type="button"
              onClick={() => onSettings({ quality: settings.quality === 'standard' ? 'low' : 'standard' })}
              className={`px-2.5 py-1 rounded font-bold transition-colors ${
                settings.quality === 'standard' ? 'bg-[#24B8E8] text-[#12253B]' : 'bg-white/20 text-white/70'
              }`}
            >
              {settings.quality === 'standard' ? 'Standard' : 'Low'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
