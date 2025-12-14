import { AttributeContext, ContextualItem } from '@/libs/compass-api';
import { useKeyListeners } from '@/libs/compass-web-utils';
import { Popover, PopoverCloseButton, PopoverContent, Stack, Text } from '@chakra-ui/react';
import { useContext, useRef, useState } from 'react';
import { useEditorStore } from '../../editor-store';
import { InventoryItem } from './inventory-item';

interface Props {
  inventoryId: string;
}

export const TextInventoryList = ({ inventoryId }: Props) => {
  const { items } = useContext(AttributeContext);
  const { viewMode } = useEditorStore();
  const inventoryItems = items.filter((item) => item.data.parentId === inventoryId);

  const [open, setOpen] = useState(false);
  const [longpress, setLongpress] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  const initiateLongPress = () => {
    timeoutRef.current = setTimeout(() => {
      setLongpress(true);
    }, 500);
  };

  useKeyListeners({
    onKeyDown: (e) => {
      if (e.key === 'Escape') setOpen(false);
    },
  });

  const getQty = (item: ContextualItem) => {
    const quantity = item.properties.find((property) => property.id === 'quantity')?.value ?? 0;
    const qty = parseInt(quantity.toString());
    return qty < 2 ? '' : ` (${qty})`;
  };

  if (!viewMode) return <Text sx={{ opacity: 0.5 }}>Item (2)</Text>;

  return (
    <>
      {inventoryItems.map((item) => (
        <Popover isOpen={open} key={item.instanceId}>
          <Text
            role={'button'}
            onPointerDown={initiateLongPress}
            onClick={(e) => {
              if (!longpress) {
                e.stopPropagation();
                setOpen(true);
              }

              clearTimeout(timeoutRef.current);
              setLongpress(false);
            }}>
            {`${item.name}${getQty(item)}`}
          </Text>

          {viewMode && (
            <PopoverContent>
              <PopoverCloseButton
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
              />
              <Stack padding={2} mt={5}>
                <InventoryItem item={item} onDelete={() => setOpen(false)} />
              </Stack>
            </PopoverContent>
          )}
        </Popover>
      ))}
    </>
  );
};
