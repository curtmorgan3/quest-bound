import { ErrorBoundary } from '@/components';
import { Layout } from '@/components/layout';
import {
  ArchetypeSheetEditor,
  AssetsPage,
  CampaignChartViewer,
  CampaignDashboard,
  CampaignDocumentsPage,
  CampaignScenes,
  Campaigns,
  CharacterChartViewer,
  CharacterPage,
  Characters,
  DefaultCharacterSheet,
  DevTools,
  ErrorPage,
  ManageCustomProperties,
  PlayPage,
  Ruleset,
  RulesetLanding,
  RulesetPageEditorPage,
  Rulesets,
  ScriptsPage,
} from '@/pages';
import { db } from '@quest-bound/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DocumentViewer } from './pages/ruleset/documents';
import { WindowEditor } from './pages/ruleset/windows/window-editor';
import { GameAuthGuard } from './components/game-auth-guard';
import { GameModeBoot } from './components/game-mode-boot';
import { EDIT_MODE, GAME_MODE } from './game-mode';

function GameLandingRedirect() {
  const rulesets = useLiveQuery(() => db.rulesets.toArray(), []);
  const firstRuleset = rulesets?.[0];
  if (!firstRuleset) return null;
  return <Navigate to={`/landing/${firstRuleset.id}`} replace />;
}

function GameRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<GameLandingRedirect />} />
        <Route path='/landing/:rulesetId' element={<RulesetLanding />} />

        <Route element={<GameAuthGuard />}>
          <Route path='/characters' element={<Characters />} />
          <Route path='/characters/:characterId' element={<CharacterPage />} />
          <Route path='/characters/:characterId/default' element={<DefaultCharacterSheet />} />
          <Route
            path='/characters/:characterId/documents/:documentId'
            element={<DocumentViewer />}
          />
          <Route
            path='/characters/:characterId/chart/:chartId'
            element={<CharacterChartViewer />}
          />

          <Route path='/campaigns' element={<Campaigns />} />
          <Route path='/campaigns/new' element={<Navigate to='/campaigns?new=1' replace />} />
          <Route path='/campaigns/:campaignId/scenes' element={<CampaignScenes />} />
          <Route path='/campaigns/:campaignId/scenes/:sceneId' element={<CampaignDashboard />} />
          <Route path='/campaigns/:campaignId/documents' element={<CampaignDocumentsPage />} />
          <Route
            path='/campaigns/:campaignId/documents/:documentId'
            element={<DocumentViewer />}
          />
          <Route
            path='/campaigns/:campaignId/chart/:chartId'
            element={<CampaignChartViewer />}
          />

          <Route path='/play/:slug' element={<PlayPage />} />

          {EDIT_MODE && (
            <>
              <Route path='/rulesets/:rulesetId' element={<Ruleset />} />
              <Route path='/rulesets/:rulesetId/attributes' element={<Ruleset page='attributes' />} />
              <Route path='/rulesets/:rulesetId/assets' element={<AssetsPage />} />
              <Route path='/rulesets/:rulesetId/items' element={<Ruleset page='items' />} />
              <Route path='/rulesets/:rulesetId/actions' element={<Ruleset page='actions' />} />
              <Route path='/rulesets/:rulesetId/charts' element={<Ruleset page='charts' />} />
              <Route path='/rulesets/:rulesetId/documents' element={<Ruleset page='documents' />} />
              <Route
                path='/rulesets/:rulesetId/documents/:documentId'
                element={<DocumentViewer />}
              />
              <Route path='/rulesets/:rulesetId/windows' element={<Ruleset page='windows' />} />
              <Route path='/rulesets/:rulesetId/windows/:windowId' element={<WindowEditor />} />
              <Route path='/rulesets/:rulesetId/pages' element={<Ruleset page='pages' />} />
              <Route
                path='/rulesets/:rulesetId/pages/:pageId'
                element={<RulesetPageEditorPage />}
              />
              <Route path='/rulesets/:rulesetId/archetypes' element={<Ruleset page='archetypes' />} />
              <Route
                path='/rulesets/:rulesetId/archetypes/:archetypeId/edit'
                element={<ArchetypeSheetEditor />}
              />
              <Route path='/rulesets/:rulesetId/scripts' element={<ScriptsPage />} />
              <Route path='/rulesets/:rulesetId/scripts/:scriptId' element={<ScriptsPage />} />
              <Route
                path='/rulesets/:rulesetId/custom-properties'
                element={<ManageCustomProperties />}
              />
            </>
          )}

          <Route path='/rulesets' element={<Navigate to='/characters' replace />} />
          <Route path='/rulesets/*' element={<Navigate to='/characters' replace />} />
        </Route>

        <Route path='*' element={<ErrorPage type='404' />} />
      </Route>
    </Routes>
  );
}

function CompassRoutes() {
  return (
    <ErrorBoundary showDetails>
      <BrowserRouter>
        <GameModeBoot>
          {GAME_MODE ? (
            <GameRoutes />
          ) : (
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Navigate to='/rulesets' replace />} />
                <Route path='/rulesets' element={<Rulesets />} />
                <Route path='/rulesets/:rulesetId' element={<Ruleset />} />
                <Route path='/landing/:rulesetId' element={<RulesetLanding />} />
                <Route path='/play/:slug' element={<PlayPage />} />
                <Route
                  path='/rulesets/:rulesetId/attributes'
                  element={<Ruleset page='attributes' />}
                />
                <Route path='/rulesets/:rulesetId/assets' element={<AssetsPage />} />
                <Route path='/rulesets/:rulesetId/items' element={<Ruleset page='items' />} />
                <Route path='/rulesets/:rulesetId/actions' element={<Ruleset page='actions' />} />
                <Route path='/rulesets/:rulesetId/charts' element={<Ruleset page='charts' />} />
                <Route
                  path='/rulesets/:rulesetId/documents'
                  element={<Ruleset page='documents' />}
                />
                <Route
                  path='/rulesets/:rulesetId/documents/:documentId'
                  element={<DocumentViewer />}
                />
                <Route path='/rulesets/:rulesetId/windows' element={<Ruleset page='windows' />} />
                <Route path='/rulesets/:rulesetId/windows/:windowId' element={<WindowEditor />} />
                <Route path='/rulesets/:rulesetId/pages' element={<Ruleset page='pages' />} />
                <Route
                  path='/rulesets/:rulesetId/pages/:pageId'
                  element={<RulesetPageEditorPage />}
                />
                <Route
                  path='/rulesets/:rulesetId/archetypes'
                  element={<Ruleset page='archetypes' />}
                />
                <Route
                  path='/rulesets/:rulesetId/archetypes/:archetypeId/edit'
                  element={<ArchetypeSheetEditor />}
                />
                <Route path='/rulesets/:rulesetId/scripts' element={<ScriptsPage />} />
                <Route path='/rulesets/:rulesetId/scripts/:scriptId' element={<ScriptsPage />} />
                <Route
                  path='/rulesets/:rulesetId/custom-properties'
                  element={<ManageCustomProperties />}
                />
                <Route path='/campaigns' element={<Campaigns />} />
                <Route
                  path='/campaigns/new'
                  element={<Navigate to='/campaigns?new=1' replace />}
                />
                <Route path='/campaigns/:campaignId/scenes' element={<CampaignScenes />} />
                <Route
                  path='/campaigns/:campaignId/scenes/:sceneId'
                  element={<CampaignDashboard />}
                />
                <Route
                  path='/campaigns/:campaignId/documents'
                  element={<CampaignDocumentsPage />}
                />
                <Route
                  path='/campaigns/:campaignId/documents/:documentId'
                  element={<DocumentViewer />}
                />
                <Route
                  path='/campaigns/:campaignId/chart/:chartId'
                  element={<CampaignChartViewer />}
                />
                <Route path='/characters' element={<Characters />} />
                <Route path='/characters/:characterId' element={<CharacterPage />} />
                <Route
                  path='/characters/:characterId/default'
                  element={<DefaultCharacterSheet />}
                />
                <Route
                  path='/characters/:characterId/documents/:documentId'
                  element={<DocumentViewer />}
                />
                <Route
                  path='/characters/:characterId/chart/:chartId'
                  element={<CharacterChartViewer />}
                />
                <Route path='/dev-tools' element={<DevTools />} />
                <Route path='*' element={<ErrorPage type='404' />} />
              </Route>
            </Routes>
          )}
        </GameModeBoot>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function App() {
  return <CompassRoutes />;
}

export default App;
