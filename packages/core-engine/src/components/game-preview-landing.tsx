import { Button, Card } from '@/components';
import { Loading, MarkdownViewer, PageWrapper } from '@/components/composites';
import { LogoIcon } from '@/components/ui/logo-icon';
import type { RulesetBundlePreview } from '@/lib/compass-api';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { SignInSignUpModal } from '@quest-bound/core-ui/signin';
import { LogIn, Map, Users } from 'lucide-react';
import { useState } from 'react';
import { useGameAuthorization } from '../hooks/use-game-authorization';

interface Props {
  preview: RulesetBundlePreview | null;
}

export function GamePreviewLanding({ preview }: Props) {
  const { isAuthenticated, isLoading: isAuthLoading } = useCloudAuthStore();
  const isGameAuthorized = useGameAuthorization();
  const [signInOpen, setSignInOpen] = useState(false);

  const renderCta = () => {
    if (isAuthLoading) {
      return (
        <div className='flex w-full items-center justify-center py-8'>
          <Loading />
        </div>
      );
    }

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
        <div className='flex w-full items-center justify-center py-8'>
          <Loading />
        </div>
      );
    }

    if (!isGameAuthorized) {
      return (
        <p className='text-sm text-muted-foreground text-center'>
          Access this game by joining the{' '}
          <a
            href='https://www.patreon.com/cw/QuestBoundEngine/membership'
            target='_blank'
            rel='noopener noreferrer'
            className='text-primary underline underline-offset-4 hover:text-primary/90'>
            Quest Bound Patreon
          </a>
          .
        </p>
      );
    }

    // Authorized — install is starting
    return (
      <div className='flex w-full items-center justify-center py-8'>
        <Loading />
      </div>
    );
  };

  const title = preview?.title ?? '';
  const image = preview?.image ?? undefined;

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
      <div
        className='relative min-h-full flex-1 bg-muted bg-cover bg-center bg-no-repeat'
        style={image ? { backgroundImage: `url(${image})` } : undefined}>
        <div className='absolute inset-0 bg-background/80' aria-hidden />
        <div className='relative flex min-h-full flex-wrap items-start gap-6 p-6 lg:p-8'>
          {/* Left column: description */}
          <section className='flex min-w-0 basis-full flex-col lg:sticky lg:top-8 lg:basis-0 lg:flex-[2_1_0]'>
            <Card className='relative flex-1 bg-card/70 p-6 backdrop-blur-sm'>
              {preview?.version && (
                <span className='absolute right-4 top-4 text-xs text-muted-foreground'>
                  v{preview.version}
                </span>
              )}
              {preview?.description ? (
                <div className='md-content text-muted-foreground'>
                  <MarkdownViewer value={preview.description} />
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>No description set.</p>
              )}
            </Card>
          </section>

          {/* Right column: auth CTA + locked content cards */}
          <section className='flex min-w-0 basis-full flex-col items-center gap-6 lg:basis-0 lg:flex-[1_1_0]'>
            <Card className='w-3/4 min-w-[300px] bg-card/70 p-6 backdrop-blur-sm flex flex-col gap-4'>
              {renderCta()}
            </Card>

            <Card className='flex w-3/4 min-w-[300px] flex-col overflow-hidden p-0 opacity-50'>
              <div className='min-h-0 flex-1 w-full aspect-square bg-muted' />
              <div className='flex shrink-0 items-center gap-4 p-5'>
                <div className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                  <Users className='size-6' />
                </div>
                <div>
                  <h2 className='text-lg font-semibold'>
                    {preview?.characterCtaTitle ?? 'Characters'}
                  </h2>
                  <p className='text-sm text-muted-foreground'>
                    {preview?.characterCtaDescription ?? 'Create and manage characters for this ruleset.'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className='flex w-3/4 min-w-[300px] flex-col overflow-hidden p-0 opacity-50'>
              <div className='min-h-0 flex-1 w-full aspect-square bg-muted' />
              <div className='flex shrink-0 items-center gap-4 p-5'>
                <div className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                  <Map className='size-6' />
                </div>
                <div>
                  <h2 className='text-lg font-semibold'>
                    {preview?.campaignsCtaTitle ?? 'Campaigns'}
                  </h2>
                  <p className='text-sm text-muted-foreground'>
                    {preview?.campaignCtaDescription ?? 'Start or join a campaign using this ruleset.'}
                  </p>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
