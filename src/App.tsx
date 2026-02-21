import {
  ArchetypeSheetEditor,
  CampaignDetail,
  CampaignNew,
  CampaignPlay,
  CampaignsList,
  CharacterChartViewer,
  CharacterPage,
  Characters,
  DevTools,
  ErrorPage,
  LocationEditor,
  Ruleset,
  RulesetPageEditorPage,
  Rulesets,
  ScriptEditorPage,
  ScriptsIndex,
  TilemapEditor,
  TilemapListPage,
  WorldEditor,
  Worlds,
} from '@/pages';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components';
import { Layout } from './components/layout';
import { DocumentViewer } from './pages/ruleset/documents';
import { WindowEditor } from './pages/ruleset/windows/window-editor';
import { CampaignProvider } from './stores';

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

            <Route path={`/rulesets/:rulesetId/pages`} element={<Ruleset page='pages' />} />
            <Route
              path={`/rulesets/:rulesetId/pages/:pageId`}
              element={<RulesetPageEditorPage />}
            />
            <Route
              path={`/rulesets/:rulesetId/archetypes`}
              element={<Ruleset page='archetypes' />}
            />

            <Route
              path={`/rulesets/:rulesetId/archetypes/:archetypeId/edit`}
              element={<ArchetypeSheetEditor />}
            />

            <Route path={`/rulesets/:rulesetId/scripts`} element={<ScriptsIndex />} />

            <Route path={`/rulesets/:rulesetId/scripts/:scriptId`} element={<ScriptEditorPage />} />

            <Route path={`/campaigns`} element={<CampaignsList />} />
            <Route path={`/campaigns/new`} element={<CampaignNew />} />
            <Route path={`/campaigns/:campaignId`} element={<CampaignDetail />} />
            <Route
              path={`/campaigns/:campaignId/locations/:locationId`}
              element={
                <CampaignProvider>
                  <CampaignPlay />
                </CampaignProvider>
              }
            />

            <Route
              path={`/campaigns/:campaignId/locations`}
              element={
                <CampaignProvider>
                  <CampaignPlay />
                </CampaignProvider>
              }
            />

            <Route path={`/worlds`} element={<Worlds />} />
            <Route path={`/worlds/:worldId`} element={<WorldEditor />} />
            <Route path={`/worlds/:worldId/locations/:locationId`} element={<WorldEditor />} />
            <Route path={`/worlds/:worldId/tilemaps`} element={<TilemapListPage />} />
            <Route path={`/worlds/:worldId/tilemaps/:tilemapId`} element={<TilemapEditor />} />
            <Route
              path={`/worlds/:worldId/locations/:locationId/edit`}
              element={<LocationEditor />}
            />

            <Route path={`/characters`} element={<Characters />} />
            <Route path={`/characters/:characterId`} element={<CharacterPage lockByDefault />} />
            <Route
              path={`/characters/:characterId/documents/:documentId`}
              element={<DocumentViewer />}
            />
            <Route
              path={`/characters/:characterId/chart/:chartId`}
              element={<CharacterChartViewer />}
            />

            <Route path={`/dev-tools`} element={<DevTools />} />

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
