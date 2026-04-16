import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON, useSidebar } from '@/components/ui/sidebar';
import { CharacterPage, type CharacterPageFloatingActions } from '../../characters';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  campaignId?: string;
  /** When set (e.g. viewing character in a scene), action scripts get Scene accessor with advanceTurnOrder. */
  campaignSceneId?: string;
  /** When false, sheet actions run locally (no joiner realtime relay). See CharacterPage. */
  campaignPlayClientBootstrapEnabled?: boolean;
  /** Rendered above the character page inside the sheet panel (e.g. scene character shortcuts). */
  topBar?: ReactNode;
  /** Receive inventory/close handlers to render actions outside CharacterPage (e.g. top bar). */
  onFloatingActionsApi?: (api: CharacterPageFloatingActions | null) => void;
  forceFitSheetToViewport?: boolean;
}

export const CampaignCharacterSheet = ({
  characterId: controlledCharacterId,
  open: controlledOpen,
  onClose: controlledOnClose,
  hideGameLog = false,
  transparentBackground: controlledTransparentBackground,
  forceFitSheetToViewport = false,
  campaignId,
  campaignSceneId,
  campaignPlayClientBootstrapEnabled = true,
  topBar,
  onFloatingActionsApi,
}: CampaignCharacterSheetProps = {}) => {
  const { state: sidebarState } = useSidebar();
  const [sheetOpen, setSheetOpen] = useState(false);

  const characterId = controlledCharacterId;
  const isControlled = controlledCharacterId != null;
  const showSheet = isControlled ? controlledOpen && !!characterId : sheetOpen && !!characterId;

  const transparentBackground = controlledTransparentBackground ?? false;

  const handleClose = useCallback(() => {
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setSheetOpen(false);
    }
  }, [isControlled, controlledOnClose]);

  if (!showSheet) return null;

  /** Literal lengths: portaled `document.body` nodes do not inherit `--sidebar-width` from the app wrapper. */
  const overlayLeft = sidebarState === 'expanded' ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON;

  /** Portals to body so stacking is not capped by PageWrapper (header vs scrollable main column). */
  const sheet = (
    <AnimatePresence>
      {showSheet && characterId && (
        <motion.div
          className='fixed z-40 flex min-h-0 min-w-0 flex-col bg-background p-0'
          style={{
            left: overlayLeft,
            right: 0,
            top: '53px',
            bottom: 0,
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
              campaignPlayClientBootstrapEnabled={campaignPlayClientBootstrapEnabled}
              transparentBackground={transparentBackground}
              onClose={handleClose}
              hideGameLog={hideGameLog}
              onFloatingActionsApi={onFloatingActionsApi}
              forceFitSheetToViewport={forceFitSheetToViewport}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : null;
};
