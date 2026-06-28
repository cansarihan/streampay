import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { PagePlaceholder } from './components/ui/PagePlaceholder';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="create" element={<PagePlaceholder title="Create stream" />} />
        <Route path="streams" element={<PagePlaceholder title="Streams" />} />
        <Route path="stream/:id" element={<PagePlaceholder title="Stream" />} />
        <Route path="payroll" element={<PagePlaceholder title="Payroll" />} />
        <Route path="vesting" element={<PagePlaceholder title="Vesting" />} />
        <Route path="requests" element={<PagePlaceholder title="Requests" />} />
        <Route path="team" element={<PagePlaceholder title="Team" />} />
        <Route path="analytics" element={<PagePlaceholder title="Analytics" />} />
        <Route path="settings" element={<PagePlaceholder title="Settings" />} />
      </Route>

      <Route path="/docs" element={<PagePlaceholder title="Docs" />} />
      <Route path="/r/:id" element={<PagePlaceholder title="Payment request" />} />
      <Route path="*" element={<PagePlaceholder title="Not found" subtitle="That page doesn’t exist." />} />
    </Routes>
  );
}
