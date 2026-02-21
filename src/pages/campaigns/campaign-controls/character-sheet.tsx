import { Button } from '@/components';
import { useSidebar } from '@/components/ui/sidebar';
import { CharacterPage } from '@/pages/characters';
import { useCampaignContext } from '@/stores';
import { AnimatePresence, motion } from 'framer-motion';
import { Backpack, X } from 'lucide-react';
import { useState } from 'react';

export const CampaignCharacterSheet = () => {
  const { selectedPlayerCharacters } = useCampaignContext();
  const { state: sidebarState } = useSidebar();
  const [sheetOpen, setSheetOpen] = useState(false);

  const showCharacterSheetButton = selectedPlayerCharacters.length === 1;
  const characterId = showCharacterSheetButton ? selectedPlayerCharacters[0]!.characterId : null;

  if (!showCharacterSheetButton) return null;

  const overlayLeft =
    sidebarState === 'expanded' ? 'var(--sidebar-width)' : 'calc(var(--sidebar-width-icon) + 1rem)';

  return (
    <>
      <Button variant='outline' size='sm' onClick={() => setSheetOpen(true)}>
        Character sheet
      </Button>
      <AnimatePresence>
        {sheetOpen && characterId && (
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
                lockByDefault
                transparentBackground
                onClose={() => setSheetOpen(false)}
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
