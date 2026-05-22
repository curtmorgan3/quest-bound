import { useInventoryDragContext } from '@/stores';
import { createPortal } from 'react-dom';

export const InventoryDragPreview = () => {
  const { activeDrag, dragPosition } = useInventoryDragContext();

  if (!activeDrag || !dragPosition) return null;

  const { item, showItemAs } = activeDrag;
  const imageUrl =
    (showItemAs ?? 'image') === 'image' ? (item.image ?? null) : null;

  const previewWidth = item.inventoryWidth * 20;
  const previewHeight = item.inventoryHeight * 20;

  const style: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    left: dragPosition.clientX - previewWidth / 2,
    top: dragPosition.clientY - previewHeight / 2,
    width: previewWidth,
    height: previewHeight,
    zIndex: 9999,
    borderRadius: 4,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
    backgroundColor: 'rgba(0,0,0,0.75)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 500,
  };

  const isImageMode = (showItemAs ?? 'image') === 'image';

  const content = imageUrl ? (
    <img
      src={imageUrl}
      alt={item.title}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  ) : isImageMode ? (
    <span style={{ fontWeight: 700, fontSize: Math.max(10, Math.min(previewWidth, previewHeight) * 0.38) }}>
      {item.title
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w[0].toUpperCase())
        .join('')}
    </span>
  ) : (
    <span>{item.title}</span>
  );

  return createPortal(<div style={style}>{content}</div>, document.body);
};
