import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components';
import { useCampaignCharacters, useCharacter, useInventory } from '@/lib/compass-api';
import type { InventoryItemWithData } from '@/stores';

type SendItemDialogProps = {
  item: InventoryItemWithData;
  campaignId: string;
  campaignSceneId: string;
  currentCharacterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
};

export const SendItemDialog = ({
  item,
  campaignId,
  campaignSceneId,
  currentCharacterId,
  open,
  onOpenChange,
  onSent,
}: SendItemDialogProps) => {
  const { campaignCharacters } = useCampaignCharacters(campaignId);

  const sceneCharacters = campaignCharacters.filter(
    (cc) => cc.campaignSceneId === campaignSceneId && cc.characterId !== currentCharacterId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='z-[200]' overlayClassName='z-[200]'>
        <DialogHeader>
          <DialogTitle>Send {item.label ?? item.title}</DialogTitle>
          <DialogDescription>
            Select a character to send this item to. It will be removed from your inventory.
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-2 max-h-[60vh] overflow-y-auto py-2'>
          {sceneCharacters.length === 0 ? (
            <p style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
              No other characters in this scene.
            </p>
          ) : (
            sceneCharacters.map((cc) => (
              <SendItemCharacterRow
                key={cc.id}
                characterId={cc.characterId}
                item={item}
                onSent={() => {
                  onOpenChange(false);
                  onSent();
                }}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

type SendItemCharacterRowProps = {
  characterId: string;
  item: InventoryItemWithData;
  onSent: () => void;
};

const SendItemCharacterRow = ({ characterId, item, onSent }: SendItemCharacterRowProps) => {
  const { character } = useCharacter(characterId);
  const { addInventoryItem } = useInventory(character?.inventoryId ?? '', characterId);

  const handleSend = async () => {
    if (!character?.inventoryId) return;
    await addInventoryItem({
      type: item.type,
      entityId: item.entityId,
      componentId: '',
      quantity: item.quantity,
      x: 0,
      y: 0,
      label: item.label,
      description: item.description,
      isEquipped: false,
      customProperties: item.customProperties as Record<string, string | number | boolean>,
      actionIds: item.actionIds,
    });
    onSent();
  };

  if (!character) return null;

  return (
    <div
      onClick={handleSend}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderRadius: 6,
        cursor: 'pointer',
      }}
      className='hover:bg-muted/50'>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {character.image && (
          <img
            src={character.image}
            alt={character.name}
            draggable={false}
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
          />
        )}
        <span style={{ color: '#fff', fontSize: 14 }}>{character.name}</span>
      </div>
      <Button size='sm' variant='ghost'>
        Send
      </Button>
    </div>
  );
};
