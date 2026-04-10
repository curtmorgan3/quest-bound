import {
  CloudSyncOverlayDialog,
  CloudSyncReviewDialog,
  CloudSyncSummaryPanel,
  Loading,
  PWAInstallPrompt,
} from '@/components';
import { CharacterSelectModal } from '@/components/character-select-modal';
import { GlobalLoadingOverlay } from '@/components/global-loading-overlay';
import { OnboardingPanel, useOnboardingStatus } from '@/components/onboarding';
import { PromptModal } from '@/components/prompt-modal';
import { ScriptErrorNotificationsHost } from '@/components/script-error-notification';
import { useCampaignPlayWorkerPolicySync, useNotifications } from '@/hooks';
import { ensureEmailRegistered, isCloudEmailVerified } from '@/lib/cloud/auth';
import { isCloudConfigured } from '@/lib/cloud/client';
import { listMyActiveExternalRulesetGrants } from '@/lib/cloud/organizations/org-api';
import { initSyncTriggers } from '@/lib/cloud/sync/sync-service';
import { useSyncOnRulesetOpen } from '@/lib/cloud/sync/use-sync-on-ruleset-open';
import { useFontLoader, useUsers } from '@/lib/compass-api';
import { useCustomEventRulesetContextSync, useScriptAnnouncements } from '@/lib/compass-logic';
import { SignIn } from '@/pages';
import { DicePanel, PhysicalRollModal } from '@/pages/dice';
import {
  CharacterArchetypesPanelContext,
  CharacterInventoryPanelContext,
  db,
  DiceProvider,
  useCloudAuthStore,
  useDiceState,
  useExternalRulesetGrantStore,
  useOnboardingStore,
} from '@/stores';
import type { DB } from '@/stores/db/hooks/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from './composites/app-sidebar';
import { SidebarProvider } from './ui/sidebar';
import { Toaster } from './ui/sonner';

const DEV_TOOLS_STORAGE_KEY = 'dev.tools';

export function Layout() {
  useCampaignPlayWorkerPolicySync();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, updateUser, loading } = useUsers();
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

  const { cloudUser, isAuthenticated } = useCloudAuthStore();
  const cloudSyncEnabled = useCloudAuthStore((s) => s.cloudSyncEnabled);
  const cloudSyncEligibilityLoading = useCloudAuthStore((s) => s.isCloudSyncEligibilityLoading);
  const cloudRulesetListEpoch = useCloudAuthStore((s) => s.cloudRulesetListEpoch);
  const isRegisteringEmail = useRef(false);

  useEffect(() => {
    if (
      !isCloudConfigured ||
      !isAuthenticated ||
      !cloudSyncEnabled ||
      cloudSyncEligibilityLoading
    ) {
      return;
    }
    let cancelled = false;
    void listMyActiveExternalRulesetGrants().then((rows) => {
      if (!cancelled) {
        useExternalRulesetGrantStore.getState().setPermissionsFromRows(rows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    cloudSyncEnabled,
    cloudSyncEligibilityLoading,
    cloudRulesetListEpoch,
  ]);

  // Initialize cloud auth (session restore + auth state subscription)
  useEffect(() => {
    useCloudAuthStore.getState().init();
  }, []);

  // When session user has verified email and local user has emailVerified false, register email and set emailVerified
  useEffect(() => {
    if (
      !isAuthenticated ||
      !cloudUser?.email ||
      !currentUser ||
      (currentUser.cloudUserId && currentUser.cloudUserId !== cloudUser.id) ||
      currentUser.emailVerified ||
      isRegisteringEmail.current
    ) {
      return;
    }
    if (!isCloudEmailVerified(cloudUser)) return;
    isRegisteringEmail.current = true;
    ensureEmailRegistered(
      cloudUser,
      async () => currentUser,
      (id, updates) => updateUser(id, updates),
    );
  }, [isAuthenticated, cloudUser, currentUser, updateUser]);

  // Initialize sync: load synced ruleset ids (once). Sync is UI-driven only.
  useEffect(() => {
    initSyncTriggers(db as DB);
  }, []);

  // When viewing a ruleset, set current ruleset and ensure synced ids are loaded
  useSyncOnRulesetOpen();
  useCustomEventRulesetContextSync();

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

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isPlayPage = location.pathname.startsWith('/play/');
  const isSignInRequiredRoute =
    location.pathname.startsWith('/rulesets/') ||
    (location.pathname.startsWith('/campaigns/') &&
      !location.pathname.startsWith('/campaigns/new'));

  const showSignInModal =
    isOnline &&
    isSignInRequiredRoute &&
    (!currentUser?.cloudUserId || !isAuthenticated);

  return loading ? (
    <Loading />
  ) : showSignInModal ? (
    <>
      <SignIn />
      <PWAInstallPrompt />
      <ScriptErrorNotificationsHost />
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
            <CloudSyncOverlayDialog />
            <CloudSyncReviewDialog />
            <CloudSyncSummaryPanel />
            <ScriptErrorNotificationsHost />
            <Toaster />
          </DiceProvider>
        </CharacterArchetypesPanelContext.Provider>
      </CharacterInventoryPanelContext.Provider>
    </SidebarProvider>
  );
}
