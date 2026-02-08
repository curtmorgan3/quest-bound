import { AppSidebar, Loading } from '@/components';
import { useFontLoader, useUsers } from '@/lib/compass-api';
import { SignIn } from '@/pages';
import { DicePanel } from '@/pages/dice';
import { CharacterInventoryPanelContext, DiceProvider, useDiceState } from '@/stores';
import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from './ui/sidebar';
import { Toaster } from './ui/sonner';

export function Layout() {
  const { currentUser, loading } = useUsers();

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
        <DiceProvider value={diceState}>
          <AppSidebar />
        <main
          style={{
            display: 'grid',
            height: '100vh',
            width: '100vw',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr',
          }}>
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
            height: '95vh',
            width: '100vw',
            zIndex: 1000,
            maxWidth: 'calc(100vw - 400px)',
          }}></canvas>
        <Toaster />
      </DiceProvider>
      </CharacterInventoryPanelContext.Provider>
    </SidebarProvider>
  );
}
