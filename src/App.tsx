import { ErrorBoundary, ErrorPage } from '@/pages';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout';

function CompassRoutes() {
  // const rulesetPages: RulesetEntity[] = [
  //   'attributes',
  //   'archetypes',
  //   'items',
  //   'charts',
  //   'documents',
  //   'page-templates',
  //   'sheet-templates',
  // ];
  // const blockTablet = [''];

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>Home</p>} />

            {/* 
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
                /> */}

            <Route path='*' element={<ErrorPage type='404' />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function App() {
  return <CompassRoutes />;
}

export default App;
