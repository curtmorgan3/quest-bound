import { ErrorPage, Home, Ruleset } from '@/pages';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components';
import { Layout } from './components/layout';

function CompassRoutes() {
  return (
    <ErrorBoundary showDetails>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />

            <Route path={`/rulesets/:rulesetId`} element={<Ruleset />} />
            <Route
              path={`/rulesets/:rulesetId/attributes`}
              element={<Ruleset page='attributes' />}
            />
            <Route path={`/rulesets/:rulesetId/items`} element={<Ruleset page='items' />} />
            <Route path={`/rulesets/:rulesetId/actions`} element={<Ruleset page='actions' />} />
            <Route path={`/rulesets/:rulesetId/charts`} element={<Ruleset page='charts' />} />

            <Route
              path={`/rulesets/:rulesetId/composites`}
              element={<Ruleset page='composites' />}
            />

            <Route path='*' element={<ErrorPage type='404' />} />
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}

function App() {
  return <CompassRoutes />;
}

export default App;
