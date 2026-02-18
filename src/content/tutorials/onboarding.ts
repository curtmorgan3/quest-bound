import type { Tutorial } from '@/types';

export const onboardingTutorial: Tutorial = [
  {
    title: 'Ruleset',
    substeps: [
      {
        description: 'Go to the Rulesets page to see and manage your rulesets.',
        selector: '[data-testid="nav-rulesets"]',
        ctas: [{ label: 'Go to Rulesets', action: { type: 'link', href: '/rulesets' } }],
      },
      {
        description:
          'Create a new ruleset: click "Create New", enter a title, then click "Create".',
        selector: '[data-testid="create-ruleset-button"]',
      },
      {
        description: 'Open your ruleset by clicking "Open" on the ruleset card.',
        selector: '[data-testid="preview-card-open"]',
      },
    ],
  },
  {
    title: 'Attribute',
    substeps: [
      {
        description:
          'With a ruleset open, go to the Attributes page from the sidebar. Then click "New" to create an attribute.',
        selector: '#create-button',
      },
      {
        description:
          'In the Quick Create dialog, select the Attribute type (first icon). Enter the title "health". Set Default to 0, Min to 0, and Max to 10. Click Create.',
        selector:
          '[data-testid="base-create-type-attributes"], #create-title, #create-default, #create-min, #create-max, [data-testid="base-create-submit"]',
      },
    ],
  },
  {
    title: 'Actions',
    substeps: [
      {
        description: 'Go to the Actions page from the ruleset sidebar.',
        selector: '[data-testid="nav-actions"]',
        ctas: [{ label: 'Go to Rulesets', action: { type: 'link', href: '/rulesets' } }],
      },
      {
        description:
          'Click "New", select the Action type (second icon), enter the title "attack", then click Create.',
        selector:
          '[data-testid="ruleset-new-button"], [data-testid="base-create-type-actions"], #create-title, [data-testid="base-create-submit"]',
      },
    ],
  },
  {
    title: 'Items',
    substeps: [
      {
        description: 'Go to the Items page from the ruleset sidebar.',
        selector: '[data-testid="nav-items"]',
      },
      {
        description:
          'Click "New", select the Item type (third icon). Enter the title "potion", click the Consumable property to set it, then click Create to save.',
        selector:
          '[data-testid="base-create-type-items"], #create-title, [data-testid="item-create-consumable"], [data-testid="base-create-submit"]',
      },
    ],
  },
];
