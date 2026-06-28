import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { reportError } from '../lib/analytics';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
          <h1 className="font-display text-2xl text-fg">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm text-fg-muted">{this.state.error.message}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
