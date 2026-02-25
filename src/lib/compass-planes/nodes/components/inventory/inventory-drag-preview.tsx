import { useInventoryDragContext } from '@/stores';
import { createPortal } from 'react-dom';

export const InventoryDragPreview = () => {
  const { activeDrag, dragPosition } = useInventoryDragContext();

  if (!activeDrag || !dragPosition) return null;

  const { item } = activeDrag;
  const image = item.image ?? null;

  const style: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    left: dragPosition.clientX + 8,
    top: dragPosition.clientY + 8,
    width: 40,
    height: 40,
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

  const content = image ? (
    <img
      src={image}
      alt={item.title}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  ) : (
    <span>{item.label ?? item.title}</span>
  );

  return createPortal(<div style={style}>{content}</div>, document.body);
};
