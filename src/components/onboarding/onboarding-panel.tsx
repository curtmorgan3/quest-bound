import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { onboardingTutorial } from '@/content';
import { useOnboardingStore } from '@/stores';
import { setOnboardingCompleted } from '@/utils/onboarding-storage';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildTutorial } from './build-tutorial';
import { OnboardingHighlight } from './onboarding-highlight';

interface OnboardingPanelProps {
  userId: string;
  onClose: () => void;
}

export function OnboardingPanel({ userId, onClose }: OnboardingPanelProps) {
  const navigate = useNavigate();
  const { setForceShowAgain } = useOnboardingStore();
  const steps = useMemo(
    () => buildTutorial({ navigate, tutorial: onboardingTutorial }),
    [navigate],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [substepIndex, setSubstepIndex] = useState(0);

  const totalSteps = steps.length;
  const currentStep = steps[stepIndex];
  const totalSubsteps = currentStep.substeps.length;
  const currentSubstep = currentStep.substeps[substepIndex];

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const isFirstSubstep = substepIndex === 0;
  const isLastSubstep = substepIndex === totalSubsteps - 1;
  const isAtEnd = isLastStep && isLastSubstep;

  const handleComplete = useCallback(async () => {
    await setOnboardingCompleted(userId);
    setForceShowAgain(false);
    onClose();
  }, [userId, onClose, setForceShowAgain]);

  const handleDismiss = useCallback(async () => {
    await setOnboardingCompleted(userId);
    setForceShowAgain(false);
    onClose();
  }, [userId, onClose, setForceShowAgain]);

  const goToStep = useCallback(
    (newStepIndex: number) => {
      const clamped = Math.max(0, Math.min(newStepIndex, totalSteps - 1));
      setStepIndex(clamped);
      setSubstepIndex(0);
    },
    [totalSteps],
  );

  const handlePreviousSubstep = () => {
    if (isFirstSubstep) {
      if (!isFirstStep) {
        setStepIndex((s) => s - 1);
        setSubstepIndex(steps[stepIndex - 1].substeps.length - 1);
      }
    } else {
      setSubstepIndex((s) => s - 1);
    }
  };

  const handleNextSubstep = () => {
    if (isLastSubstep) {
      if (isLastStep) {
        handleComplete();
      } else {
        setStepIndex((s) => s + 1);
        setSubstepIndex(0);
      }
    } else {
      setSubstepIndex((s) => s + 1);
    }
  };

  const handleNextSubstepRef = useRef(handleNextSubstep);
  handleNextSubstepRef.current = handleNextSubstep;

  useEffect(() => {
    const sel = currentSubstep.selector;
    if (!sel?.shouldAdvanceOnClick || !sel.selector?.trim()) return;

    const selectorStr = sel.selector.trim();
    let elements: Element[] = [];
    try {
      elements = Array.from(document.querySelectorAll(selectorStr));
    } catch {
      return;
    }
    if (elements.length === 0) return;

    const handler = () => {
      elements.forEach((el) => el.removeEventListener('click', handler));
      setTimeout(() => {
        handleNextSubstepRef.current();
      }, 0);
    };

    elements.forEach((el) => el.addEventListener('click', handler));
    return () => {
      elements.forEach((el) => el.removeEventListener('click', handler));
    };
  }, [currentSubstep.selector]);

  return (
    <>
      <OnboardingHighlight selector={currentSubstep.selector?.selector} />
      <Card
        className='fixed bottom-6 left-14 z-500 w-[min(380px,calc(100vw-2rem))] border shadow-lg bg-card/95 backdrop-blur-sm'
        role='region'
        aria-label='Getting started tutorial'>
        <CardHeader className='flex flex-row items-start justify-between gap-2 pb-2'>
          <div className='flex flex-col gap-1 pr-8'>
            <CardTitle className='text-base leading-tight'>{currentStep.title}</CardTitle>
            {totalSubsteps > 1 && (
              <span className='text-muted-foreground text-xs'>
                Part {substepIndex + 1} of {totalSubsteps}
              </span>
            )}
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='absolute top-3 right-3 size-8 shrink-0 rounded-md'
            onClick={handleDismiss}
            aria-label='Dismiss tutorial'>
            <XIcon className='size-4' />
          </Button>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 pt-0'>
          {currentSubstep.title && (
            <p className='font-medium text-sm text-foreground'>{currentSubstep.title}</p>
          )}
          <p className='text-muted-foreground text-sm leading-relaxed'>
            {currentSubstep.description}
          </p>
          {currentSubstep.ctas && currentSubstep.ctas.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {currentSubstep.ctas.map((cta, i) => (
                <Button key={i} variant='outline' size='sm' className='w-fit' onClick={cta.action}>
                  {cta.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className='flex flex-col gap-3 border-t pt-3'>
          <div className='flex items-center w-full justify-between gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handlePreviousSubstep}
              disabled={isFirstStep && isFirstSubstep}
              className='gap-1'>
              <ChevronLeftIcon className='size-4' />
              Back
            </Button>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-1'>
                {steps.map((_, i) => (
                  <button
                    key={i}
                    type='button'
                    onClick={() => goToStep(i)}
                    className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                      i === stepIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                    aria-current={i === stepIndex ? 'step' : undefined}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <Button size='sm' onClick={handleNextSubstep} className='gap-1'>
              {isAtEnd ? 'Finish' : 'Next'}
              {!isAtEnd && <ChevronRightIcon className='size-4' />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
