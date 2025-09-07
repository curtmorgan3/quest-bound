import { CacheProvider } from '@/libs/compass-api';
import { CompassThemeProvider, CssBaseline, ErrorPage } from '@/libs/compass-core-ui';
import { EnvProvider, SettingsProvider, useSettingsContextState } from '@/libs/compass-web-utils';
import {
  CharacterJournal,
  CharacterPage,
  DevPage,
  EditPageTemplate,
  HomePage,
  Rulebook,
  Ruleset,
  SheetPage,
} from '@/pages';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/error-boundary';
import { Layout } from './components/layout';
import { FeatureRoute, ProtectedRoute } from './components/route';
import {
  CHECKOUT_ENDPOINT,
  COMPASS_KEY,
  DOMAIN,
  EMAIL_API_ENDPOINT,
  GRAPH_QL_ENDPOINT,
  MANAGE_ENDPOINT,
  SIGNUP_ENDPOINT,
  SUPABASE_HOST,
  SUPABASE_KEY,
} from './constants';
import { CharacterViewChart } from './pages/ruleset/charts/render-chart';
import { RenderDocument } from './pages/ruleset/documents/render-document';
import { DevTools } from './pages/_dev/dev-tools';
import { RulesetEntity } from './types';

function CompassRoutes() {
  const rulesetPages: RulesetEntity[] = [
    'attributes',
    'archetypes',
    'items',
    'charts',
    'documents',
    'page-templates',
    'sheet-templates',
  ];
  const blockTablet = [''];

  return (
    <CompassThemeProvider>
      <ErrorBoundary>
        <CssBaseline />
        <SettingsProvider value={useSettingsContextState()}>
          <BrowserRouter>
            <Routes>
              {/* <Route path='/stream/:characterId' element={<Stream />} /> */}
              {/* <Route path='/stream/:characterId/ruleset/:rulesetId' element={<Stream />} /> */}
              {/* <Route path='/marketplace/:publishedRulesetId' element={<RulesetSalesPage />} /> */}
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />

                {rulesetPages.map((page) => (
                  <Route
                    key={page}
                    path={`/rulesets/:rulesetId/${page}`}
                    element={
                      <ProtectedRoute creator blockTablet={blockTablet.includes(page)}>
                        <Ruleset page={page} />
                      </ProtectedRoute>
                    }
                  />
                ))}

                <Route
                  path='/rulesets/:rulesetId'
                  element={
                    <ProtectedRoute creator blockMobile>
                      <Ruleset />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path={`/rulesets/:rulesetId/attributes/:attributeId`}
                  element={
                    <ProtectedRoute creator>
                      <Ruleset page={'attributes'} />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path={`/rulesets/:rulesetId/items/:attributeId`}
                  element={
                    <ProtectedRoute creator>
                      <Ruleset page='items' />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/characters/:characterId/rulebook'
                  element={
                    <ProtectedRoute>
                      <Rulebook viewMode />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/characters/:characterId/journal'
                  element={
                    <ProtectedRoute>
                      <CharacterJournal viewMode />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/characters/:characterId/journal/edit'
                  element={
                    <ProtectedRoute>
                      <CharacterJournal />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/characters/:characterId/documents'
                  element={
                    <ProtectedRoute>
                      <RenderDocument />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/characters/:characterId/charts'
                  element={
                    <ProtectedRoute>
                      <CharacterViewChart />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/rulebook'
                  element={
                    <ProtectedRoute creator>
                      <Rulebook viewMode />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/rulebook/edit'
                  element={
                    <ProtectedRoute creator blockTablet>
                      <Rulebook />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/page-templates/:sheetId'
                  element={
                    <ProtectedRoute creator blockMobile>
                      <EditPageTemplate />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/sheet-templates/:sheetId'
                  element={
                    <ProtectedRoute creator>
                      <SheetPage viewMode />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/sheet-templates/:sheetId/edit'
                  element={
                    <ProtectedRoute creator>
                      <SheetPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/rulesets/:rulesetId/characters/:characterId'
                  element={
                    <ProtectedRoute>
                      <CharacterPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='dev'
                  element={
                    <FeatureRoute env='none'>
                      <DevPage />
                    </FeatureRoute>
                  }
                />

                <Route path='*' element={<ErrorPage type='404' />} />
              </Route>
            </Routes>
          </BrowserRouter>
          {import.meta.env.DEV && <DevTools />}
        </SettingsProvider>
      </ErrorBoundary>
    </CompassThemeProvider>
  );
}

function App() {
  const overrideEnv = import.meta.env.DEV
    ? localStorage.getItem('dev.env-override') ?? 'dev'
    : null;

  return (
    <EnvProvider
      value={{
        domain: DOMAIN,
        environment: overrideEnv ?? import.meta.env.VITE_ENV ?? 'dev',
        maintenance: [],
      }}>
      <CacheProvider
        compassKey={COMPASS_KEY}
        supabaseKey={SUPABASE_KEY}
        supabaseHost={SUPABASE_HOST}
        graphqlEndpoint={GRAPH_QL_ENDPOINT}
        emailApiEndpoint={EMAIL_API_ENDPOINT}
        signupEndpoint={SIGNUP_ENDPOINT}
        manageEndpoint={MANAGE_ENDPOINT}
        checkoutEndpoint={CHECKOUT_ENDPOINT}>
        <CompassRoutes />
      </CacheProvider>
    </EnvProvider>
  );
}

export default App;
