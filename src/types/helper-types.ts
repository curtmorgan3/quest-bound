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

export interface OnboardingSubstep {
  title?: string;
  description: string;
  ctas?: OnboardingStepCta[];
}

export interface OnboardingStep {
  title: string;
  substeps: OnboardingSubstep[];
}

export type Tutorial = OnboardingStep[];
