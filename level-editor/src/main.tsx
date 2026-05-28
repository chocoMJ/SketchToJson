import { ThemeProvider } from '@suis-ui/kit';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import { FlipProvider } from 'solid-flip';
import { render } from 'solid-js/web';

import { App } from './app';

import '@suis-ui/kit/style.css';
import './styles/global.css';

const root = document.getElementById('root');
const queryClient = new QueryClient();

if (!root) {
  throw new Error('Root element was not found.');
}

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FlipProvider>
          <App />
        </FlipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  ),
  root,
);
