import { ThemeProvider } from '@suis-ui/kit';
import { render } from 'solid-js/web';

import { App } from './app';

import '@suis-ui/kit/style.css';
import './styles/global.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element was not found.');
}

render(
  () => (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  ),
  root,
);
