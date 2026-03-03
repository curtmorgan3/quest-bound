import { Button } from '@/components';
import { useSidebar } from '@/components/ui/sidebar';
import { CharacterPage } from '@/pages/characters';
import { useCampaignContext } from '@/stores';
import { AnimatePresence, motion } from 'framer-motion';
import { Backpack, X } from 'lucide-react';
import { useState } from 'react';

export interface CampaignCharacterSheetProps {
  /** When set, show the sheet for this character (e.g. from dashboard avatar click). */
  characterId?: string;
  /** When true with characterId, show the sheet open without requiring the button click. */
  open?: boolean;
  /** Called when the sheet is closed (used when opened via characterId/open props). */
  onClose?: () => void;
  hideGameLog?: boolean;
}

export const CampaignCharacterSheet = ({
  characterId: controlledCharacterId,
  open: controlledOpen,
  onClose: controlledOnClose,
  hideGameLog = false,
}: CampaignCharacterSheetProps = {}) => {
  const { campaignId, selectedPlayerCharacters } = useCampaignContext();
  const { state: sidebarState } = useSidebar();
  const [sheetOpen, setSheetOpen] = useState(false);

  const contextCharacterId =
    selectedPlayerCharacters.length === 1 ? selectedPlayerCharacters[0]!.characterId : null;
  const characterId = controlledCharacterId ?? contextCharacterId;
  const isControlled = controlledCharacterId != null;
  const showSheet = isControlled ? controlledOpen && !!characterId : sheetOpen && !!characterId;
  const showCharacterSheetButton = !isControlled && selectedPlayerCharacters.length === 1;

  const handleClose = () => {
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setSheetOpen(false);
    }
  };

  if (!showCharacterSheetButton && !showSheet) return null;

  const overlayLeft =
    sidebarState === 'expanded' ? 'var(--sidebar-width)' : 'calc(var(--sidebar-width-icon) + 1rem)';

  return (
    <>
      {showCharacterSheetButton && (
        <Button variant='outline' size='sm' onClick={() => setSheetOpen(true)}>
          Character sheet
        </Button>
      )}
      <AnimatePresence>
        {showSheet && characterId && (
          <motion.div
            className='fixed bottom-0 right-0 z-30 bg-background'
            style={{
              left: overlayLeft,
              top: '50px',
              background: 'transparent',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}>
            <div className='relative h-full w-full overflow-auto'>
              <CharacterPage
                id={characterId}
                campaignId={campaignId}
                lockByDefault
                transparentBackground
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
