import type { Settings, UIActions } from '@/shared/contracts';
import { ArcadeButton, ArcadePanel } from './Arcade';
import { SettingsBar } from './SettingsBar';

interface PauseModalProps {
  settings: Settings;
  actions: UIActions;
}

export function PauseModal({ settings, actions }: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paused"
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-[rgba(33,19,51,0.78)] ar-stripes select-none"
    >
      <ArcadePanel pad="md" className="glint-pause-card w-full max-w-sm max-h-full overflow-y-auto text-center space-y-3 sm:space-y-4">
        <div>
          <h2 className="ar-display text-4xl text-[var(--ar-purple)] m-0">Paused</h2>
          <p className="text-xs font-semibold mt-1 leading-relaxed">
            Pausing marks this run as <strong className="font-extrabold">practice</strong>: it will not count as a best time.
          </p>
        </div>

        <div className="ar-panel ar-panel-lavender ar-pad-sm text-left">
          <span className="ar-display text-sm block mb-2">Settings</span>
          <SettingsBar settings={settings} onSettings={actions.onSettings} variant="inline" />
        </div>

        <div className="glint-pause-actions space-y-3 pt-1">
          <ArcadeButton tone="yellow" block onClick={actions.onResume}>
            Resume
          </ArcadeButton>
          <ArcadeButton tone="cream" size="sm" block onClick={actions.onRetry}>
            Retry
          </ArcadeButton>
          <ArcadeButton tone="ink" size="sm" block onClick={actions.onMenu}>
            Menu
          </ArcadeButton>
        </div>
      </ArcadePanel>
    </div>
  );
}
