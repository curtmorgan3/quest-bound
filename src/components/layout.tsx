import { Loading } from '@/components';
import { GlobalLoadingOverlay } from '@/components/global-loading-overlay';
import { OnboardingPanel, useOnboardingStatus } from '@/components/onboarding';
import { useFontLoader, useUsers } from '@/lib/compass-api';
import { SignIn } from '@/pages';
import { DicePanel } from '@/pages/dice';
import {
  CharacterArchetypesPanelContext,
  CharacterInventoryPanelContext,
  DiceProvider,
  useDiceState,
  useOnboardingStore,
} from '@/stores';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './composites/app-sidebar';
import { SidebarProvider } from './ui/sidebar';
import { Toaster } from './ui/sonner';

export function Layout() {
  const { currentUser, loading } = useUsers();
  const {
    hasCompleted,
    isLoading: onboardingLoading,
    refetch,
  } = useOnboardingStatus(currentUser?.id ?? null);
  const { forceShowAgain } = useOnboardingStore();
  const showOnboarding = Boolean(
    !onboardingLoading && currentUser && (forceShowAgain || !hasCompleted),
  );
  const handleOnboardingClose = useCallback(() => {
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

  // Load ruleset fonts into the browser
  useFontLoader();

  const [characterInventoryPanelOpen, setCharacterInventoryPanelOpen] = useState(false);
  const [characterArchetypesPanelOpen, setCharacterArchetypesPanelOpen] = useState(false);

  return loading ? (
    <Loading />
  ) : !currentUser ? (
    <>
      <SignIn />
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
            <AppSidebar />
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
