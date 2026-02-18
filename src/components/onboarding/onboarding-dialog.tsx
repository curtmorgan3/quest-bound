import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOnboardingStore } from '@/stores';
import { hasCompletedOnboarding, setOnboardingCompleted } from '@/utils/onboarding-storage';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DOCS_URL = 'https://docs.questbound.com';
const DISCORD_URL = 'https://discord.gg/Zx2jR5Q3zN';

interface OnboardingStepCta {
  label: string;
  action: () => void;
}

interface OnboardingStep {
  title: string;
  description: string;
  ctas?: OnboardingStepCta[];
}

function buildSteps(navigate: (path: string) => void): OnboardingStep[] {
  return [
    {
      title: 'Rulesets',
      description:
        'A ruleset is the foundation of your game. It holds all the rules, character sheet layout, and content. Create your first ruleset to get started.',
      ctas: [{ label: 'Go to Rulesets', action: () => navigate('/rulesets') }],
    },
    {
      title: 'Attributes, Actions & Items',
      description:
        "Attributes define character stats (e.g. Health, Strength). Actions are things characters can do (e.g. Attack, Heal). Items are equipment, spells, or inventory. Add these from your ruleset's sidebar once you have a ruleset open.",
      ctas: [{ label: 'Go to Rulesets', action: () => navigate('/rulesets') }],
    },
    {
      title: 'Windows & Pages',
      description:
        'Windows are the building blocks of a character sheet—a stat block, an inventory list, or a text area. Pages group windows into tabs or sections. Use Windows and Pages in the ruleset editor to design how your character sheet looks.',
      ctas: [{ label: 'Open documentation', action: () => window.open(DOCS_URL, '_blank') }],
    },
    {
      title: 'Scripts & Dice',
      description:
        'Scripts add logic to your game: formulas, roll buttons, and automation. Use qbscript to compute values and respond to rolls. The Dice panel in the sidebar lets you roll 3D dice during play.',
      ctas: [{ label: 'Open documentation', action: () => window.open(DOCS_URL, '_blank') }],
    },
    {
      title: 'Help & Resources',
      description:
        'Need more detail? The documentation covers everything. Join our Discord to ask questions and share your games.',
      ctas: [
        { label: 'Open documentation', action: () => window.open(DOCS_URL, '_blank') },
        { label: 'Join Discord', action: () => window.open(DISCORD_URL, '_blank') },
      ],
    },
  ];
}

const TOTAL_STEPS = 5;

interface OnboardingDialogProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function OnboardingDialog({ userId, open, onClose }: OnboardingDialogProps) {
  const navigate = useNavigate();
  const { setForceShowAgain } = useOnboardingStore();
  const [step, setStep] = useState(0);
  const steps = buildSteps(navigate);

  const handleComplete = useCallback(async () => {
    await setOnboardingCompleted(userId);
    setForceShowAgain(false);
    onClose();
  }, [userId, onClose, setForceShowAgain]);

  const handleSkipAll = useCallback(async () => {
    await setOnboardingCompleted(userId);
    setForceShowAgain(false);
    onClose();
  }, [userId, onClose, setForceShowAgain]);

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleSkipAll()}>
      <DialogContent
        className='sm:max-w-lg'
        showCloseButton={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleSkipAll();
        }}>
        <DialogHeader>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription asChild>
            <p className='text-muted-foreground text-sm leading-relaxed pt-1'>
              {current.description}
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-wrap gap-2 py-2'>
          {current.ctas?.map((cta, i) => (
            <Button key={i} variant='outline' size='sm' className='w-fit' onClick={cta.action}>
              {cta.label}
            </Button>
          ))}
        </div>

        <div className='flex items-center justify-between gap-4'>
          <span className='text-muted-foreground text-xs'>
            Step {step + 1} of {TOTAL_STEPS}
          </span>
          <DialogFooter className='flex-row gap-2 sm:justify-end border-0 p-0'>
            <Button variant='ghost' size='sm' onClick={handleSkipAll}>
              Skip all
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleBack}
              disabled={isFirst}
              className='gap-1'>
              <ChevronLeftIcon className='size-4' />
              Back
            </Button>
            <Button size='sm' onClick={handleNext} className='gap-1'>
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRightIcon className='size-4' />}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useOnboardingStatus(userId: string | null) {
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    const value = await hasCompletedOnboarding(userId);
    setHasCompleted(value);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setHasCompleted(null);
      return;
    }
    let cancelled = false;
    hasCompletedOnboarding(userId).then((value) => {
      if (!cancelled) setHasCompleted(value);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { hasCompleted, isLoading: hasCompleted === null, refetch };
}
