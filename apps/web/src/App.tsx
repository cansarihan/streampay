import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { PagePlaceholder } from './components/ui/PagePlaceholder';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { CreateStream } from './pages/CreateStream';
import { StreamDetail } from './pages/StreamDetail';
import { Streams } from './pages/Streams';
import { Payroll } from './pages/Payroll';
import { Vesting } from './pages/Vesting';
import { Requests } from './pages/Requests';
import { Team } from './pages/Team';
import { RequestPublic } from './pages/RequestPublic';

export function App() {
  return (
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
        <Route path="analytics" element={<PagePlaceholder title="Analytics" />} />
        <Route path="settings" element={<PagePlaceholder title="Settings" />} />
      </Route>

      <Route path="/docs" element={<PagePlaceholder title="Docs" />} />
      <Route path="/r/:token" element={<RequestPublic />} />
      <Route path="*" element={<PagePlaceholder title="Not found" subtitle="That page doesn’t exist." />} />
    </Routes>
  );
}
