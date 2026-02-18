import type { Tutorial } from '@/types';

export const onboardingTutorial: Tutorial = [
  {
    title: 'Ruleset',
    substeps: [
      {
        description: 'Go to the Rulesets page to see and manage your rulesets.',
        selector: { selector: '[data-testid="nav-rulesets"]', shouldAdvanceOnClick: true },
        ctas: [{ label: 'Go to Rulesets', action: { type: 'link', href: '/rulesets' } }],
      },
      {
        description: 'Create a new ruleset by clicking "Create New"',
        selector: { selector: '[data-testid="create-ruleset-button"]', shouldAdvanceOnClick: true },
      },
      {
        description: 'Enter any title, then click "Create".',
        selector: { selector: '[data-testid="create-ruleset-submit"]', shouldAdvanceOnClick: true },
      },
      {
        description: 'Open your ruleset by clicking "Open" on the ruleset card.',
        selector: { selector: '[data-testid="preview-card-open"]', shouldAdvanceOnClick: true },
      },
    ],
  },
  {
    title: 'Attribute',
    substeps: [
      {
        description:
          'With a ruleset open, go to the Attributes page from the sidebar. Then click "New" to create an attribute.',
        selector: { selector: '#create-button', shouldAdvanceOnClick: true },
      },
      {
        description:
          'Enter the title "health". Set Default to 0, Min to 0, and Max to 10. Click create',
        selector: {
          selector:
            '#create-title, #create-default, #create-min, #create-max, [data-testid="base-create-submit"]',
          shouldAdvanceOnClick: false,
        },
      },
    ],
  },
  {
    title: 'Actions',
    substeps: [
      {
        description: 'Go to the Actions page from the ruleset sidebar.',
        selector: { selector: '[data-testid="nav-actions"]', shouldAdvanceOnClick: true },
      },
      {
        description: 'Click "New"',
        selector: {
          selector: '[data-testid="ruleset-new-button"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Enter the title "attack", then click Create.',
        selector: {
          selector: '#create-title, [data-testid="base-create-submit"]',
          shouldAdvanceOnClick: true,
        },
      },
    ],
  },
  {
    title: 'Items',
    substeps: [
      {
        description: 'Go to the Items page from the ruleset sidebar.',
        selector: { selector: '[data-testid="nav-items"]', shouldAdvanceOnClick: true },
      },
      {
        description: 'Click "New"',
        selector: {
          selector: '#create-button',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Enter the title "potion", click the Consumable property to set it.',
        selector: {
          selector: '#create-title, [data-testid="item-create-consumable"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Click Create to save.',
        selector: {
          selector: '[data-testid="base-create-submit"]',
          shouldAdvanceOnClick: true,
        },
      },
    ],
  },
];
