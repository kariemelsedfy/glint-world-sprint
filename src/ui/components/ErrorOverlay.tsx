import type { UIActions } from '@/shared/contracts';
import { ArcadeButton, ArcadePanel } from './Arcade';

interface ErrorOverlayProps {
  message: string | null;
  actions: UIActions;
}

export function ErrorOverlay({ message, actions }: ErrorOverlayProps) {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-[rgba(33,19,51,0.85)] ar-stripes select-none"
    >
      <ArcadePanel pad="md" className="w-full max-w-sm text-center space-y-4">
        <span className="ar-chip ar-chip-pink">
          <span className="ar-chip-value text-base">Detour</span>
        </span>
        <div>
          <h2 className="ar-display text-3xl m-0">Something went wrong</h2>
          <p className="text-xs font-semibold mt-1 leading-relaxed">
            {message ?? 'The city failed to load. Your run can be retried or you can head back to the globe.'}
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <ArcadeButton tone="yellow" block onClick={actions.onRetry}>
            Retry
          </ArcadeButton>
          <ArcadeButton tone="cyan" size="sm" block onClick={actions.onGlobe}>
            Back to globe
          </ArcadeButton>
          <ArcadeButton tone="cream" size="sm" block onClick={actions.onMenu}>
            Menu
          </ArcadeButton>
        </div>
      </ArcadePanel>
    </div>
  );
}
