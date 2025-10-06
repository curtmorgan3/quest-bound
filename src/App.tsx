import { ErrorPage, Home, Ruleset } from '@/pages';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components';
import { Layout } from './components/layout';
import { CompositeEditor } from './pages/ruleset/composites/composite-editor';

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

            <Route
              path={`/rulesets/:rulesetId/composites/:compositeId`}
              element={<CompositeEditor />}
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
