import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { App } from './App';
import { WalletProvider } from './lib/wallet';
import { initAnalytics } from './lib/analytics';
import './index.css';

initAnalytics();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </WalletProvider>
    </QueryClientProvider>
  </StrictMode>
);
