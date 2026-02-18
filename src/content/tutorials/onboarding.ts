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
        selector: {
          selector: '#ruleset-title, [data-testid="create-ruleset-submit"]',
          shouldAdvanceOnClick: true,
        },
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
          shouldAdvanceOnClick: true,
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
  {
    title: 'Windows',
    substeps: [
      {
        description: 'Go to the Windows page from the ruleset sidebar.',
        selector: { selector: '[data-testid="nav-windows"]', shouldAdvanceOnClick: true },
      },
      {
        description: 'Click "New" to create a window.',
        selector: {
          selector: '[data-testid="ruleset-new-button"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Enter the title "Health", then click Create.',
        selector: {
          selector: '#create-title, [data-testid="base-create-submit"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Open the Health window by clicking "Open" on its card.',
        selector: { selector: '[data-testid="preview-card-open"]', shouldAdvanceOnClick: true },
      },
      {
        description:
          'Right-click on the canvas and choose "Input" from the context menu to add an input component.',
        selector: {
          selector: '[data-testid="context-menu-option-comp-input"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Click the input you added to select it.',
      },
      {
        description: 'In the right-hand panel, click the "Data" tab.',
        selector: {
          selector: '[data-testid="component-edit-tab-data"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description:
          'Under the Data tab, open the Attribute dropdown and select the "Health" attribute to bind it to the input.',
        selector: {
          selector: '#component-data-attribute-lookup',
          shouldAdvanceOnClick: false,
        },
      },
    ],
  },
];
