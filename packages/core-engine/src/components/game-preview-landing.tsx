import { Button } from '@/components';
import { MarkdownViewer, PageWrapper } from '@/components/composites';
import { LogoIcon } from '@/components/ui/logo-icon';
import type { RulesetBundlePreview } from '@/lib/compass-api';
import { fetchGameRecord, type GameRecord } from '@/lib/cloud';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { SignInSignUpModal } from '@quest-bound/core-ui/signin';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, LogIn, ShoppingBag } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { GAME_ID } from '../game-mode';
import { useGameAuthorization } from '../hooks/use-game-authorization';

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|avi|mkv|ogv|mpeg|mpg|ts|3gp|3g2)(?:\?.*)?$/i;

function isVideoUrl(url: string): boolean {
  return VIDEO_EXT_RE.test(url);
}

function parseCarouselUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string') out.push(item);
    else if (item && typeof item === 'object' && 'href' in item) {
      const h = (item as { href: unknown }).href;
      if (typeof h === 'string') out.push(h);
    }
  }
  return out;
}

function parseLinks(raw: unknown): { label: string; href: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { label: string; href: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.label === 'string' && typeof o.href === 'string')
      out.push({ label: o.label, href: o.href });
  }
  return out;
}

function relativeFromNow(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

interface Props {
  preview: RulesetBundlePreview | null;
}

export function GamePreviewLanding({ preview }: Props) {
  const { isAuthenticated } = useCloudAuthStore();
  const isGameAuthorized = useGameAuthorization();
  const [signInOpen, setSignInOpen] = useState(false);
  const [gameRecord, setGameRecord] = useState<GameRecord | null>(null);
  const [recordFetched, setRecordFetched] = useState(false);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

  console.log('id: ', GAME_ID)

  useEffect(() => {
    if (GAME_ID) {
      fetchGameRecord(GAME_ID)
        .then(setGameRecord)
        .finally(() => setRecordFetched(true));
    } else {
      setRecordFetched(true);
    }
  }, []);

  const carouselUrls = parseCarouselUrls(gameRecord?.carouselAssets);
  const links = parseLinks(gameRecord?.links);
  const clampedIndex =
    carouselUrls.length === 0 ? 0 : Math.min(activeCarouselIndex, carouselUrls.length - 1);

  const title = gameRecord?.title ?? preview?.title ?? '';
  const coverImageUrl = gameRecord?.coverImageUrl ?? '';

  const renderBuyBox = () => {
    if (!isAuthenticated) {
      return (
        <>
          <Button className='w-full gap-2' onClick={() => setSignInOpen(true)}>
            <LogIn className='h-4 w-4' />
            Sign in to play
          </Button>
          <SignInSignUpModal
            open={signInOpen}
            mode='default'
            onSuccess={() => setSignInOpen(false)}
          />
        </>
      );
    }

    if (isGameAuthorized === null) {
      return (
        <div className='flex w-full items-center justify-center py-4'>
          <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
        </div>
      );
    }

    if (!isGameAuthorized) {
      if (!recordFetched || !gameRecord) {
        return (
          <div className='flex w-full items-center justify-center py-4'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          </div>
        );
      }

      const effectivePrice = gameRecord.salePrice ?? gameRecord.price;
      const marketplaceUrl = gameRecord.orgSlug
        ? `https://marketplace.questbound.com/${gameRecord.orgSlug}/g/${gameRecord.slug}`
        : null;

      return (
        <>
          <p className='text-xs uppercase tracking-wider text-muted-foreground'>Get access</p>
          <div className='flex items-baseline gap-2'>
            <span className='text-3xl font-bold tabular-nums'>${effectivePrice.toFixed(2)}</span>
            <span className='text-sm text-muted-foreground'>USD</span>
            {gameRecord.salePrice !== null && (
              <span className='ml-1 text-base tabular-nums text-muted-foreground line-through'>
                ${gameRecord.price.toFixed(2)}
              </span>
            )}
          </div>
          {marketplaceUrl ? (
            <Button className='w-full gap-2' asChild>
              <a href={marketplaceUrl} target='_blank' rel='noopener noreferrer'>
                <ShoppingBag className='h-4 w-4' />
                Get access — ${effectivePrice.toFixed(2)}
              </a>
            </Button>
          ) : (
            <p className='text-center text-sm text-muted-foreground'>
              Purchase this game to gain access.
            </p>
          )}
        </>
      );
    }

    // Authorized — install starting
    return (
      <div className='flex w-full items-center justify-center py-4'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  };

  const meta: [string, string][] = [
    ['Publisher', gameRecord?.publisherName || '—'],
    ['Released', gameRecord?.releaseDate || 'TBA'],
    ['Version', gameRecord?.version ? `v${gameRecord.version}` : '—'],
    ['Updated', relativeFromNow(gameRecord?.updatedAt)],
  ];

  return (
    <PageWrapper
      title={title}
      contentClassName='p-0'
      stickyHeader
      headerActions={
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <span>Made with Quest Bound</span>
          <LogoIcon style={{ width: 24, height: 24 }} />
        </div>
      }>
      <div className='mx-auto w-full max-w-5xl px-6 py-6 lg:px-8 lg:py-8'>
        <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]'>

          {/* LEFT — carousel + description */}
          <div>
            {/* Carousel */}
            <div className='overflow-hidden rounded-md border bg-muted'>
              <div
                className='relative grid place-items-center overflow-hidden border-b'
                style={{ height: 380 }}>
                {!recordFetched ? (
                  <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                ) : carouselUrls.length === 0 ? (
                  <p className='px-6 py-10 text-center text-sm text-muted-foreground'>
                    No media yet.
                  </p>
                ) : isVideoUrl(carouselUrls[clampedIndex] ?? '') ? (
                  <video
                    key={carouselUrls[clampedIndex]}
                    src={carouselUrls[clampedIndex]}
                    controls
                    className='h-full w-full object-contain'
                  />
                ) : (
                  <img
                    src={carouselUrls[clampedIndex]}
                    alt=''
                    className='h-full w-full object-contain'
                  />
                )}
                {carouselUrls.length > 1 && (
                  <>
                    <button
                      type='button'
                      onClick={() =>
                        setActiveCarouselIndex(
                          (clampedIndex - 1 + carouselUrls.length) % carouselUrls.length,
                        )
                      }
                      aria-label='Previous'
                      className='absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded border bg-background/60 text-foreground hover:bg-background/80'>
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type='button'
                      onClick={() =>
                        setActiveCarouselIndex((clampedIndex + 1) % carouselUrls.length)
                      }
                      aria-label='Next'
                      className='absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded border bg-background/60 text-foreground hover:bg-background/80'>
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>
              {carouselUrls.length > 1 && (
                <div className='flex flex-wrap gap-1 p-1'>
                  {carouselUrls.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type='button'
                      onClick={() => setActiveCarouselIndex(i)}
                      className='relative grid size-[100px] place-items-center overflow-hidden rounded border'
                      style={{
                        outlineOffset: 2,
                        outline: i === clampedIndex ? '2px solid hsl(var(--primary))' : undefined,
                      }}>
                      {isVideoUrl(url) ? (
                        <video
                          src={url}
                          muted
                          preload='metadata'
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <img src={url} alt='' className='h-full w-full object-cover' />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tagline */}
            {gameRecord?.header?.trim() && (
              <p className='my-4 border-y py-4 text-lg italic text-muted-foreground'>
                {gameRecord.header}
              </p>
            )}

            {/* About */}
            <div className='overflow-hidden rounded-md border'>
              <div className='border-b bg-muted/50 px-5 py-4'>
                <p className='mb-1 text-xs uppercase tracking-wider text-muted-foreground'>
                  About this ruleset
                </p>
                <h2 className='text-base font-semibold'>{title}</h2>
              </div>
              <div className='px-5 py-4'>
                {gameRecord?.description ? (
                  <div className='md-content text-sm text-muted-foreground'>
                    <MarkdownViewer value={gameRecord.description} />
                  </div>
                ) : (
                  <p className='text-sm italic text-muted-foreground'>No description set.</p>
                )}
              </div>
            </div>

            {/* Links */}
            {links.length > 0 && (
              <div className='mt-4 flex flex-wrap gap-2'>
                {links.map((l, i) => (
                  <a
                    key={i}
                    href={l.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'>
                    {l.label}
                    <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — sticky buy box */}
          <aside>
            <div className='sticky top-8 overflow-hidden rounded-md border shadow-md'>
              {/* Cover image */}
              <div
                className='relative overflow-hidden border-b bg-muted'
                style={{ aspectRatio: '16 / 9' }}>
                {coverImageUrl ? (
                  <img
                    src={coverImageUrl}
                    alt=''
                    className='absolute inset-0 h-full w-full object-cover'
                  />
                ) : (
                  <div className='absolute inset-0 grid place-items-center text-sm text-muted-foreground'>
                    No cover image
                  </div>
                )}
              </div>

              {/* Auth CTA */}
              <div className='flex flex-col gap-3 border-b p-5'>{renderBuyBox()}</div>

              {/* Metadata */}
              <div
                className='grid p-5 text-sm'
                style={{ gridTemplateColumns: 'auto 1fr', columnGap: 14, rowGap: 8 }}>
                {meta.map(([k, v]) => (
                  <Fragment key={k}>
                    <span className='text-muted-foreground'>{k}</span>
                    <span>{v}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          </aside>

        </div>
      </div>
    </PageWrapper>
  );
}
