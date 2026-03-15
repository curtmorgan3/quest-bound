import { Loading, PWAInstallPrompt } from '@/components';
import { CharacterSelectModal } from '@/components/character-select-modal';
import { GlobalLoadingOverlay } from '@/components/global-loading-overlay';
import { OnboardingPanel, useOnboardingStatus } from '@/components/onboarding';
import { PromptModal } from '@/components/prompt-modal';
import { useNotifications } from '@/hooks';
import { useFontLoader, useUsers } from '@/lib/compass-api';
import { useScriptAnnouncements } from '@/lib/compass-logic';
import { SignIn } from '@/pages';
import { DicePanel, PhysicalRollModal } from '@/pages/dice';
import { initSyncTriggers } from '@/lib/cloud/sync/sync-service';
import { useSyncOnRulesetOpen } from '@/lib/cloud/sync/use-sync-on-ruleset-open';
import {
  CharacterArchetypesPanelContext,
  CharacterInventoryPanelContext,
  DiceProvider,
  useCloudAuthStore,
  useDiceState,
  useOnboardingStore,
  db,
} from '@/stores';
import type { DB } from '@/stores/db/hooks/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from './composites/app-sidebar';
import { SidebarProvider } from './ui/sidebar';
import { Toaster } from './ui/sonner';

const DEV_TOOLS_STORAGE_KEY = 'dev.tools';

export function Layout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, loading } = useUsers();
  const {
    hasCompleted,
    isLoading: onboardingLoading,
    refetch,
  } = useOnboardingStatus(currentUser?.id ?? null);
  const { forceShowAgain } = useOnboardingStore();
  const isOnAttributesRoute = /^\/rulesets\/[^/]+\/attributes$/.test(location.pathname);
  const [tutorialLaunchedFromAttributes, setTutorialLaunchedFromAttributes] = useState(false);

  const wouldShowOnAttributes =
    currentUser && !onboardingLoading && (forceShowAgain || !hasCompleted);

  // Initialize cloud auth (session restore + auth state subscription)
  useEffect(() => {
    useCloudAuthStore.getState().init();
  }, []);

  // Initialize sync: load synced ruleset ids (once). Sync is UI-driven only.
  useEffect(() => {
    initSyncTriggers(db as DB);
  }, []);

  // When viewing a ruleset, set current ruleset and ensure synced ids are loaded
  useSyncOnRulesetOpen();

  useEffect(() => {
    if (isOnAttributesRoute && wouldShowOnAttributes) {
      setTutorialLaunchedFromAttributes(true);
    }
  }, [isOnAttributesRoute, wouldShowOnAttributes]);

  const showOnboarding = Boolean(
    wouldShowOnAttributes && (isOnAttributesRoute || tutorialLaunchedFromAttributes),
  );
  const handleOnboardingClose = useCallback(() => {
    setTutorialLaunchedFromAttributes(false);
    refetch();
  }, [refetch]);

  const diceRef = useRef<HTMLCanvasElement>(null);
  const diceState = useDiceState({ canvasRef: diceRef });

  useEffect(() => {
    if (diceRef?.current) {
      // Adjusting the width or display causes issues with ThreeDDice
      // Conditionally rendering the canvas will cause the ref to be lost and ThreeDDice will
      // need to be reinstantiated
      diceRef.current.style.top = diceState.dicePanelOpen ? '0' : '10000px';
    }
  }, [diceState.dicePanelOpen]);

  useEffect(() => {
    if (searchParams.get('dev') === 'true') {
      localStorage.setItem(DEV_TOOLS_STORAGE_KEY, 'true');
      setDevToolsToggled((n) => n + 1);
    }
  }, [searchParams]);

  // Listen for script-driven sheet navigation (Owner.navigateToPage)
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ characterId: string; pageId: string }>;
      const { characterId, pageId } = custom.detail || {};
      if (!characterId || !pageId) return;
      navigate(`/characters/${characterId}?pageId=${pageId}`);
    };

    window.addEventListener('qbscript:navigateToCharacterPage', handler as EventListener);
    return () => {
      window.removeEventListener('qbscript:navigateToCharacterPage', handler as EventListener);
    };
  }, [navigate]);

  // Load ruleset fonts into the browser
  useFontLoader();

  const { addNotification } = useNotifications();
  useScriptAnnouncements(addNotification);

  const [, setDevToolsToggled] = useState(0);
  const [characterInventoryPanelOpen, setCharacterInventoryPanelOpen] = useState(false);
  const [characterArchetypesPanelOpen, setCharacterArchetypesPanelOpen] = useState(false);

  const isPlayPage = location.pathname.startsWith('/play/');
  const isSignInRequiredRoute =
    location.pathname.startsWith('/rulesets/') ||
    (location.pathname.startsWith('/campaigns/') &&
      !location.pathname.startsWith('/campaigns/new'));

  const showSignInModal = !currentUser?.email && isSignInRequiredRoute;

  return loading ? (
    <Loading />
  ) : showSignInModal ? (
    <>
      <SignIn />
      <PWAInstallPrompt />
      <Toaster />
    </>
  ) : (
    <SidebarProvider defaultOpen={false}>
      <CharacterInventoryPanelContext.Provider
        value={{
          open: characterInventoryPanelOpen,
          setOpen: setCharacterInventoryPanelOpen,
        }}>
        <CharacterArchetypesPanelContext.Provider
          value={{
            open: characterArchetypesPanelOpen,
            setOpen: setCharacterArchetypesPanelOpen,
          }}>
          <DiceProvider value={diceState}>
            {currentUser && showOnboarding && (
              <OnboardingPanel userId={currentUser.id} onClose={handleOnboardingClose} />
            )}
            {!isPlayPage && <AppSidebar />}
            <main
              style={{
                display: 'grid',
                height: '100dvh',
                width: '100dvw',
                gridTemplateColumns: '1fr',
                gridTemplateRows: '1fr',
              }}>
              <GlobalLoadingOverlay />
              <Outlet />
            </main>
            <DicePanel />
            <PhysicalRollModal />
            <PromptModal />
            <CharacterSelectModal />
            <PWAInstallPrompt />
            <canvas
              id='threeddice'
              ref={diceRef}
              style={{
                position: 'fixed',
                top: '10000px',
                left: 50,
                height: '95dvh',
                width: '100dvw',
                zIndex: 1000,
                maxWidth: 'calc(100vw - 400px)',
              }}></canvas>
            <Toaster />
          </DiceProvider>
        </CharacterArchetypesPanelContext.Provider>
      </CharacterInventoryPanelContext.Provider>
    </SidebarProvider>
  );
}
