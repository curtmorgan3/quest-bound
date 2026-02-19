import type { InventoryItemWithData } from '@/stores';

export type BaseDetails = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type Coordinates = {
  x: number;
  y: number;
};

export type Dimensions = {
  height: number;
  width: number;
};

export type InventoryItemType = 'item' | 'action' | 'attribute';

export type InventoryListRow = {
  type: 'entry';
  entry: InventoryItemWithData;
  estimatedSize: number;
};

export type TutorialAction = {
  type: 'link';
  href?: string;
};

export interface OnboardingStepCta {
  label: string;
  action: TutorialAction;
}

export interface OnboardingSubstepSelector {
  selector: string;
  shouldAdvanceOnClick: boolean;
}

export interface OnboardingSubstep {
  title?: string;
  description: string;
  /** Optional code block to show with preserved line breaks and spacing (e.g. script snippet). */
  code?: string;
  ctas?: OnboardingStepCta[];
  /** Optional. When on this substep, elements matching the selector are highlighted. If shouldAdvanceOnClick is true, clicking a matched element advances to the next substep. */
  selector?: OnboardingSubstepSelector;
}

export interface OnboardingStep {
  title: string;
  substeps: OnboardingSubstep[];
}

export type Tutorial = OnboardingStep[];
