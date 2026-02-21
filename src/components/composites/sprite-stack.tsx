import { cn } from '@/lib/utils';

/** Entity that has an optional sprites array (URLs; resolved from asset IDs by asset-injector middleware when read from DB). */
export interface EntityWithSprites {
  sprites?: string[];
}

export interface SpriteStackProps {
  /** Entity with optional sprites (e.g. Item, Character, Archetype). Sprites should be resolved URLs from middleware. */
  entity: EntityWithSprites | null | undefined;
  /** Optional class name for the wrapper div. */
  className?: string;
  /** Optional alt text prefix for stacked images (e.g. "Character sprite"). */
  alt?: string;
}

/**
 * Renders a div that stacks each of the entity's sprites on top of each other,
 * with z-index equal to the sprite's index in the array.
 * Expects sprites to be image URLs (injected by asset-injector middleware when entity is read from DB).
 */
export function SpriteStack({ entity, className, alt = 'Sprite' }: SpriteStackProps) {
  const sprites = entity?.sprites ?? [];
  if (sprites.length === 0) return null;

  const layers = sprites
    .map((sprite, index) => {
      const isUrl =
        sprite.startsWith('http://') || sprite.startsWith('https://') || sprite.startsWith('data:');
      const src = isUrl ? sprite : null;
      return src ? { src, zIndex: index } : null;
    })
    .filter((layer): layer is { src: string; zIndex: number } => layer != null);

  if (layers.length === 0) return null;

  return (
    <div className={cn('relative size-full', className)}>
      {layers.map(({ src, zIndex }) => (
        <img
          key={`${zIndex}-${src.slice(0, 40)}`}
          src={src}
          alt={`${alt} ${zIndex + 1}`}
          className='absolute inset-0 size-full object-contain object-center pointer-events-none'
          style={{ zIndex }}
        />
      ))}
    </div>
  );
}
