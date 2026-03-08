import { Card } from '@/components';
import { PageWrapper } from '@/components/composites';
import { useActiveRuleset } from '@/lib/compass-api';
import { Map, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Markdown from 'react-markdown';

export function RulesetLanding() {
  const { activeRuleset } = useActiveRuleset();

  if (!activeRuleset) {
    return (
      <PageWrapper title="Ruleset">
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Ruleset not found.
        </div>
      </PageWrapper>
    );
  }

  const { title, description, image, charactersCtaImage, campaignsCtaImage } = activeRuleset;

  return (
    <PageWrapper title={title} contentClassName="p-0">
      <div
        className="relative min-h-full flex-1 bg-muted bg-cover bg-center bg-no-repeat"
        style={image ? { backgroundImage: `url(${image})` } : undefined}
      >
        <div className="absolute inset-0 bg-background/80" aria-hidden />
        <div className="relative flex min-h-full flex-wrap items-start gap-6 p-6 lg:p-8">
          {/* Left column: description (2/3) */}
          <section className="flex min-w-0 basis-full flex-col lg:sticky lg:top-8 lg:basis-0 lg:flex-[2_1_0]">
            <Card className="flex-1 bg-card/70 p-6 backdrop-blur-sm">
              {description ? (
                <div className="md-content text-muted-foreground">
                  <Markdown>{description}</Markdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No description set.</p>
              )}
            </Card>
          </section>

          {/* Right column: CTAs stacked vertically (1/3) */}
          <section className="flex min-w-0 basis-full flex-col items-center gap-6 lg:basis-0 lg:flex-[1_1_0]">
            <Link
              to="/characters"
              className="group block w-3/4 min-w-[300px] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="flex aspect-square flex-col overflow-hidden p-0">
                <div
                  className="min-h-0 flex-1 w-full bg-muted bg-cover bg-center transition-opacity group-hover:opacity-95"
                  style={
                    charactersCtaImage
                      ? { backgroundImage: `url(${charactersCtaImage})` }
                      : undefined
                  }
                />
                <div className="flex shrink-0 items-center gap-4 p-5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users className="size-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Characters</h2>
                    <p className="text-sm text-muted-foreground">
                      Create and manage characters for this ruleset.
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link
              to="/campaigns"
              className="group block w-3/4 min-w-[300px] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="flex aspect-square flex-col overflow-hidden p-0">
                <div
                  className="min-h-0 flex-1 w-full bg-muted bg-cover bg-center transition-opacity group-hover:opacity-95"
                  style={
                    campaignsCtaImage
                      ? { backgroundImage: `url(${campaignsCtaImage})` }
                      : undefined
                  }
                />
                <div className="flex shrink-0 items-center gap-4 p-5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Map className="size-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Campaigns</h2>
                    <p className="text-sm text-muted-foreground">
                      Start or join a campaign using this ruleset.
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
