import { CharacterPage, Characters, ErrorPage, Ruleset, Rulesets } from '@/pages';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components';
import { Layout } from './components/layout';
import { DocumentViewer } from './pages/ruleset/documents';
import { WindowEditor } from './pages/ruleset/windows/window-editor';

function CompassRoutes() {
  return (
    <ErrorBoundary showDetails>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to='/rulesets' replace />} />
            <Route path={`/rulesets`} element={<Rulesets />} />
            <Route path={`/rulesets/:rulesetId`} element={<Ruleset />} />
            <Route
              path={`/rulesets/:rulesetId/attributes`}
              element={<Ruleset page='attributes' />}
            />
            <Route path={`/rulesets/:rulesetId/items`} element={<Ruleset page='items' />} />
            <Route path={`/rulesets/:rulesetId/actions`} element={<Ruleset page='actions' />} />
            <Route path={`/rulesets/:rulesetId/charts`} element={<Ruleset page='charts' />} />
            <Route path={`/rulesets/:rulesetId/documents`} element={<Ruleset page='documents' />} />
            <Route
              path={`/rulesets/:rulesetId/documents/:documentId`}
              element={<DocumentViewer />}
            />

            <Route path={`/rulesets/:rulesetId/windows`} element={<Ruleset page='windows' />} />

            <Route path={`/rulesets/:rulesetId/windows/:windowId`} element={<WindowEditor />} />

            <Route path={`/characters`} element={<Characters />} />
            <Route path={`/characters/:characterId`} element={<CharacterPage lockByDefault />} />
            <Route
              path={`/characters/:characterId/documents/:documentId`}
              element={<DocumentViewer />}
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
