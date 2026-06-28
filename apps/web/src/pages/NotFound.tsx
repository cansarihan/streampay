import { Link } from 'react-router-dom';
import { Logo } from '../components/layout/Logo';
import { Button } from '../components/ui/Button';

export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo withWordmark={false} className="mb-6 scale-150" />
      <p className="font-display text-6xl font-bold flow-text">404</p>
      <h1 className="mt-4 font-display text-2xl text-fg">This page drifted downstream</h1>
      <p className="mt-2 max-w-sm text-fg-muted">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <div className="mt-7 flex gap-3">
        <Link to="/">
          <Button variant="outline">Go home</Button>
        </Link>
        <Link to="/app">
          <Button>Open the app</Button>
        </Link>
      </div>
    </div>
  );
}
