import { Button } from '@/components';
import { useSidebar } from '@/components/ui/sidebar';
import { CharacterPage } from '@/pages/characters';
import { AnimatePresence, motion } from 'framer-motion';
import { Backpack, EyeClosed, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export interface CampaignCharacterSheetProps {
  /** When set, show the sheet for this character (e.g. from dashboard avatar click). */
  characterId?: string;
  /** When true with characterId, show the sheet open without requiring the button click. */
  open?: boolean;
  /** Called when the sheet is closed (used when opened via characterId/open props). */
  onClose?: () => void;
  hideGameLog?: boolean;
  /** When provided, the transparency state becomes controlled by the parent. */
  transparentBackground?: boolean;
  onTransparentBackgroundChange?: (transparentBackground: boolean) => void;
  campaignId?: string;
  /** When set (e.g. viewing character in a scene), action scripts get Scene accessor with advanceTurnOrder. */
  campaignSceneId?: string;
  /** Rendered above the character page inside the sheet panel (e.g. scene character shortcuts). */
  topBar?: ReactNode;
}

export const CampaignCharacterSheet = ({
  characterId: controlledCharacterId,
  open: controlledOpen,
  onClose: controlledOnClose,
  hideGameLog = false,
  transparentBackground: controlledTransparentBackground,
  onTransparentBackgroundChange,
  campaignId,
  campaignSceneId,
  topBar,
}: CampaignCharacterSheetProps = {}) => {
  const { state: sidebarState } = useSidebar();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uncontrolledTransparentBackground, setUncontrolledTransparentBackground] = useState(false);

  const characterId = controlledCharacterId;
  const isControlled = controlledCharacterId != null;
  const showSheet = isControlled ? controlledOpen && !!characterId : sheetOpen && !!characterId;

  const isTransparentBackgroundControlled = controlledTransparentBackground != null;
  const transparentBackground = isTransparentBackgroundControlled
    ? controlledTransparentBackground
    : uncontrolledTransparentBackground;

  const setTransparentBackground = (next: boolean) => {
    if (isTransparentBackgroundControlled) {
      onTransparentBackgroundChange?.(next);
      return;
    }
    setUncontrolledTransparentBackground(next);
  };

  const handleClose = () => {
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setSheetOpen(false);
    }
  };

  if (!showSheet) return null;

  const overlayLeft =
    sidebarState === 'expanded' ? 'var(--sidebar-width)' : 'calc(var(--sidebar-width-icon) + 1rem)';

  return (
    <>
      <AnimatePresence>
        {showSheet && characterId && (
          <motion.div
            className='fixed bottom-0 right-0 z-30 flex flex-col bg-background'
            style={{
              left: overlayLeft,
              top: '50px',
              background: transparentBackground ? 'transparent' : undefined,
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}>
            {topBar ? (
              <div className='shrink-0 border-b border-border bg-background px-3 py-2'>{topBar}</div>
            ) : null}
            <div className='relative min-h-0 flex-1 w-full overflow-auto'>
              <CharacterPage
                id={characterId}
                campaignId={campaignId}
                campaignSceneId={campaignSceneId}
                lockByDefault
                transparentBackground={transparentBackground}
                onClose={handleClose}
                hideGameLog={hideGameLog}
                renderFloatingActions={({ onOpenInventory, onClose }) => (
                  <>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 shrink-0'
                      onClick={onOpenInventory}
                      aria-label='Open inventory'>
                      <Backpack className='size-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className={`size-8 shrink-0 ${transparentBackground ? 'text-primary' : ''}`}
                      onClick={() => setTransparentBackground(!transparentBackground)}
                      aria-label={
                        transparentBackground
                          ? 'Disable transparent character sheet background'
                          : 'Enable transparent character sheet background'
                      }
                      title={
                        transparentBackground
                          ? 'Disable transparent background'
                          : 'Enable transparent background'
                      }>
                      <EyeClosed className='size-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 shrink-0'
                      onClick={onClose}
                      aria-label='Close character sheet'>
                      <X className='size-4' />
                    </Button>
                  </>
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
