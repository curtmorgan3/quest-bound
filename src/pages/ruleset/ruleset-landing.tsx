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
    <PageWrapper title={title}>
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {/* Hero: ruleset image and description */}
        <section className="overflow-hidden rounded-xl border bg-card">
          <div
            className="h-48 w-full shrink-0 bg-muted bg-cover bg-center sm:h-56"
            style={image ? { backgroundImage: `url(${image})` } : undefined}
          />
          <div className="p-6">
            {description ? (
              <div className="md-content text-muted-foreground">
                <Markdown>{description}</Markdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No description set.</p>
            )}
          </div>
        </section>

        {/* CTA cards */}
        <section className="grid gap-6 sm:grid-cols-2">
          <Link
            to="/characters"
            className="group block transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="flex h-full flex-col overflow-hidden p-0">
              <div
                className="h-40 w-full shrink-0 bg-muted bg-cover bg-center transition-opacity group-hover:opacity-95"
                style={
                  charactersCtaImage
                    ? { backgroundImage: `url(${charactersCtaImage})` }
                    : undefined
                }
              />
              <div className="flex flex-1 items-center gap-4 p-6">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="size-7" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Characters</h2>
                  <p className="text-sm text-muted-foreground">
                    Create and manage characters for this ruleset.
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link
            to="/campaigns"
            className="group block transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="flex h-full flex-col overflow-hidden p-0">
              <div
                className="h-40 w-full shrink-0 bg-muted bg-cover bg-center transition-opacity group-hover:opacity-95"
                style={
                  campaignsCtaImage
                    ? { backgroundImage: `url(${campaignsCtaImage})` }
                    : undefined
                }
              />
              <div className="flex flex-1 items-center gap-4 p-6">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Map className="size-7" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Campaigns</h2>
                  <p className="text-sm text-muted-foreground">
                    Start or join a campaign using this ruleset.
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </section>
      </div>
    </PageWrapper>
  );
}
