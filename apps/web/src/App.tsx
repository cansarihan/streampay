import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Spinner } from './components/ui/Spinner';

const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const CreateStream = lazy(() => import('./pages/CreateStream').then((m) => ({ default: m.CreateStream })));
const StreamDetail = lazy(() => import('./pages/StreamDetail').then((m) => ({ default: m.StreamDetail })));
const Streams = lazy(() => import('./pages/Streams').then((m) => ({ default: m.Streams })));
const Payroll = lazy(() => import('./pages/Payroll').then((m) => ({ default: m.Payroll })));
const Vesting = lazy(() => import('./pages/Vesting').then((m) => ({ default: m.Vesting })));
const Requests = lazy(() => import('./pages/Requests').then((m) => ({ default: m.Requests })));
const Team = lazy(() => import('./pages/Team').then((m) => ({ default: m.Team })));
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Docs = lazy(() => import('./pages/Docs').then((m) => ({ default: m.Docs })));
const RequestPublic = lazy(() => import('./pages/RequestPublic').then((m) => ({ default: m.RequestPublic })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

function FullPageFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="size-7" />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<FullPageFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="create" element={<CreateStream />} />
            <Route path="streams" element={<Streams />} />
            <Route path="stream/:id" element={<StreamDetail />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="vesting" element={<Vesting />} />
            <Route path="requests" element={<Requests />} />
            <Route path="team" element={<Team />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="/docs" element={<Docs />} />
          <Route path="/r/:token" element={<RequestPublic />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
