import { Button, Input, Label } from '@/components';
import { useTilemapAsset } from '@/hooks';
import { useAssets, useTilemap, useTilemaps, useTiles } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Tile } from '@/types';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export function TilemapEditor() {
  const { worldId, tilemapId } = useParams<{ worldId: string; tilemapId: string }>();
  const tilemap = useTilemap(tilemapId);
  const { updateTilemap } = useTilemaps(worldId ?? undefined);
  const { tiles, createTile, deleteTile } = useTiles(tilemapId ?? undefined);
  const { assets } = useAssets();
  const tm = tilemap ?? undefined;
  const assetData = tm?.assetId ? assets.find((a) => a.id === tm.assetId)?.data : null;
  const { assetDimensions } = useTilemapAsset({ worldId, imageUrl: assetData ?? undefined });

  const [labelInput, setLabelInput] = useState('');
  const [tileWidthInput, setTileWidthInput] = useState('');
  const [tileHeightInput, setTileHeightInput] = useState('');

  const tileWidth = tm?.tileWidth ?? 32;
  const tileHeight = tm?.tileHeight ?? 32;
  const imgSize = assetDimensions[tm?.assetId ?? ''];

  const cols = imgSize ? Math.max(0, Math.floor(imgSize.w / tileWidth)) : 0;
  const rows = imgSize ? Math.max(0, Math.floor(imgSize.h / tileHeight)) : 0;

  const tilesArray: Tile[] = Array.isArray(tiles) ? tiles : [];
  const tilesSet = useCallback(
    (tx: number, ty: number) =>
      tilesArray.some((t) => t.tilemapId === tilemapId && t.tileX === tx && t.tileY === ty),
    [tilesArray, tilemapId],
  );

  const displayLabel = tm?.label ?? `${tileWidth}×${tileHeight}`;
  const handleApplyLabel = () => {
    if (!tm) return;
    const next = labelInput.trim() || displayLabel;
    setLabelInput('');
    updateTilemap(tm.id, { label: next });
  };

  const tileWidthInputRef = useRef(tileWidthInput);
  const tileHeightInputRef = useRef(tileHeightInput);
  tileWidthInputRef.current = tileWidthInput;
  tileHeightInputRef.current = tileHeightInput;

  const DEBOUNCE_MS = 400;
  useEffect(() => {
    if (!tm) return;
    const t = setTimeout(() => {
      const wRaw = parseInt(tileWidthInputRef.current, 10);
      const hRaw = parseInt(tileHeightInputRef.current, 10);
      const w = Number.isNaN(wRaw) ? tileWidth : wRaw;
      const h = Number.isNaN(hRaw) ? tileHeight : hRaw;
      const widthChanged = tileWidthInputRef.current !== '' && w !== tileWidth;
      const heightChanged = tileHeightInputRef.current !== '' && h !== tileHeight;
      if (widthChanged || heightChanged) {
        updateTilemap(tm.id, { tileWidth: w, tileHeight: h });
        setTileWidthInput('');
        setTileHeightInput('');
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [tm, tileWidthInput, tileHeightInput, tileWidth, tileHeight, updateTilemap]);

  const handleTileClick = async (tx: number, ty: number) => {
    if (!tilemapId) return;
    if (tilesSet(tx, ty)) {
      const tile = tilesArray.find(
        (t) => t.tilemapId === tilemapId && t.tileX === tx && t.tileY === ty,
      );
      if (tile) await deleteTile(tile.id);
    } else {
      await createTile(tilemapId, { tileX: tx, tileY: ty });
    }
  };

  const handleClearAllTiles = async () => {
    if (!tilesArray.length) return;
    for (const t of tilesArray) {
      await deleteTile(t.id);
    }
  };

  const handleCreateAllTiles = async () => {
    if (!tilemapId || !cols || !rows) return;
    const now = new Date().toISOString();
    const existing = new Set(tilesArray.map((t) => `${t.tileX},${t.tileY}`));
    const toAdd: Partial<Tile>[] = [];
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        if (existing.has(`${tx},${ty}`)) continue;
        toAdd.push({ tileX: tx, tileY: ty });
      }
    }
    for (const data of toAdd) {
      await db.tiles.add({
        id: crypto.randomUUID(),
        tilemapId,
        tileX: data.tileX ?? 0,
        tileY: data.tileY ?? 0,
        createdAt: now,
        updatedAt: now,
      } as Tile);
    }
  };

  if (!worldId || !tilemapId) return null;
  if (tilemap === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <p className='text-muted-foreground'>Loading…</p>
      </div>
    );
  }
  if (!tilemap) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-2 p-4'>
        <p className='text-muted-foreground'>Tilemap not found.</p>
        <Button asChild variant='link'>
          <Link to={`/worlds/${worldId}/tilemaps`}>Back to tilemaps</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2'>
        <Button variant='ghost' size='sm' asChild>
          <Link to={`/worlds/${worldId}/tilemaps`} data-testid='tilemap-editor-back'>
            <ArrowLeft className='h-4 w-4' />
          </Link>
        </Button>
        <span className='text-muted-foreground'>|</span>
        <Label htmlFor='te-label' className='sr-only'>
          Label
        </Label>
        <Input
          id='te-label'
          className='max-w-40 truncate font-semibold'
          value={labelInput || displayLabel}
          onChange={(e) => setLabelInput(e.target.value)}
          onBlur={handleApplyLabel}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyLabel()}
        />
        <span className='text-muted-foreground'>
          {tileWidth}×{tileHeight}
        </span>
        <div className='ml-auto flex items-center gap-2'>
          <div className='flex items-center gap-1'>
            <Label htmlFor='te-tile-width' className='text-xs'>
              Tile Width
            </Label>
            <Input
              id='te-tile-width'
              type='number'
              className='w-16'
              value={tileWidthInput || tileWidth}
              onChange={(e) => setTileWidthInput(e.target.value)}
            />
          </div>
          <div className='flex items-center gap-1'>
            <Label htmlFor='te-tile-height' className='text-xs'>
              Tile Height
            </Label>
            <Input
              id='te-tile-height'
              type='number'
              className='w-16'
              value={tileHeightInput || tileHeight}
              onChange={(e) => setTileHeightInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4'>
        {assetData ? (
          <div className='flex flex-col gap-2'>
            <p className='text-xs text-muted-foreground'>
              Grid: {cols}×{rows} cells. Click a cell to add a tile; click again to remove.
            </p>
            <div className='relative inline-block max-w-full'>
              <img
                src={assetData}
                alt='Tilemap'
                className='block w-auto max-w-full'
                style={{
                  imageRendering: 'pixelated',
                }}
              />
              {imgSize && cols > 0 && rows > 0 && (
                <div
                  className='absolute inset-0 grid max-w-full'
                  style={{
                    gridTemplateColumns: `repeat(${cols}, ${tileWidth}px)`,
                    gridTemplateRows: `repeat(${rows}, ${tileHeight}px)`,
                    width: cols * tileWidth,
                    height: rows * tileHeight,
                  }}>
                  {Array.from({ length: rows }, (_, y) =>
                    Array.from({ length: cols }, (_, x) => {
                      const hasTile = tilesSet(x, y);
                      return (
                        <button
                          key={`${x},${y}`}
                          type='button'
                          className={`border transition-colors ${
                            hasTile
                              ? 'bg-primary/20 border-primary'
                              : 'border-muted-foreground/30 hover:bg-muted/50'
                          }`}
                          style={{
                            width: tileWidth,
                            height: tileHeight,
                          }}
                          onClick={() => handleTileClick(x, y)}
                          title={hasTile ? `Remove tile (${x},${y})` : `Add tile (${x},${y})`}
                        />
                      );
                    }),
                  )}
                </div>
              )}
            </div>
            {cols > 0 && rows > 0 && (
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleCreateAllTiles}
                  className='max-w-[250px]'>
                  Use all tiles ({cols * rows} cells)
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleClearAllTiles}
                  disabled={tilesArray.length === 0}
                  className='text-muted-foreground hover:text-destructive'>
                  Clear
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className='text-muted-foreground'>No image. Edit tilemap to set an asset.</p>
        )}
      </div>
    </div>
  );
}
