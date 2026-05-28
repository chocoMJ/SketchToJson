import { Route, Router } from '@solidjs/router';

import HomePage from './pages';

export function App() {
  return (
    <Router>
      <Route path={'/'} component={HomePage} />
    </Router>
  );
}
