import type { Tutorial, TutorialAction } from '@/types';

interface BuildTutorial {
  tutorial: Tutorial;
  navigate: (path: string) => void;
}

export function buildTutorial({ tutorial, navigate }: BuildTutorial) {
  function getActionFunction(action: TutorialAction) {
    switch (action.type) {
      case 'link':
        if (action.href?.includes('https')) {
          return () => window.open(action.href, '_blank');
        } else if (action.href) {
          return action.href ? () => navigate(action.href!) : undefined;
        }
    }
  }

  return tutorial.map((step) => ({
    ...step,
    substeps: step.substeps.map((substep) => ({
      ...substep,
      ctas: substep.ctas?.map((cta) => ({
        ...cta,
        action: getActionFunction(cta.action),
      })),
    })),
  }));
}
