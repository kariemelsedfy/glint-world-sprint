/** Application error boundary. Owner: A0. Always offers a visible recovery path. */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
}
interface State {
  readonly message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : 'Unexpected error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('GLINT crashed', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message === null) return this.props.children;
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#12253b] p-6 text-[#fff6e5]">
        <div className="max-w-md rounded-2xl bg-[#fff6e5] p-6 text-[#12253b]">
          <h1 className="text-xl font-black">Something went wrong</h1>
          <p className="mt-2 text-sm">{this.state.message}</p>
          <button type="button" className="glint-button mt-4" onClick={() => window.location.reload()}>
            Reload GLINT
          </button>
        </div>
      </div>
    );
  }
}
