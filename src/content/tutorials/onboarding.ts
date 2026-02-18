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
        description: 'Enter the title "take damage", then click Create.',
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
    title: 'Health Window',
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
  {
    title: 'Comabt Window',
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
        description: 'Enter the title "Combat", then click Create.',
        selector: {
          selector: '#create-title, [data-testid="base-create-submit"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Open the Combat window by clicking "Open" on the first card.',
        selector: {
          selector: '[data-testid="preview-card"]:first-of-type [data-testid="preview-card-open"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description:
          'Right-click on the canvas and choose "Text" from the context menu to add a text component.',
        selector: {
          selector: '[data-testid="context-menu-option-text"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Click the text you added to select it.',
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
          'Under the Data tab, open the Action dropdown and select the "Take Damage" attribute to bind it to the input.',
        selector: {
          selector: '#component-data-action-lookup',
          shouldAdvanceOnClick: false,
        },
      },
      {
        description:
          'Right-click on the canvas and choose "Inventory" from the context menu to add a text component.',
        selector: {
          selector: '[data-testid="context-menu-option-inventory"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Click the inventory you added to select it.',
      },
      {
        description: 'In the right-hand panel, click the "Data" tab.',
        selector: {
          selector: '[data-testid="component-edit-tab-data"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Under the Data tab, open the type restriction and select the "Item" type.',
        selector: {
          selector: '#inventory-type-restriction',
          shouldAdvanceOnClick: false,
        },
      },
    ],
  },
  {
    title: 'Pages',
    substeps: [
      {
        description: 'Go to the Pages section from the ruleset sidebar.',
        selector: { selector: '[data-testid="nav-pages"]', shouldAdvanceOnClick: true },
      },
      {
        description: 'Click "New" to create a page.',
        selector: {
          selector: '[data-testid="ruleset-new-button"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Enter the title "Combat Sheet", then click Create.',
        selector: {
          selector: '#create-title, [data-testid="base-create-submit"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Open the Combat Sheet page by clicking "Open" on its card.',
        selector: { selector: '[data-testid="preview-card-open"]', shouldAdvanceOnClick: true },
      },
      {
        description: 'Click "Add window" at the bottom of the page editor.',
        selector: {
          selector: '[data-testid="page-editor-add-window"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description:
          'In the Add window dialog, click "Health" to add the Health window to the page.',
        selector: {
          selector: '[data-testid="add-window-option-health"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Click "Add window" again to add another window.',
        selector: {
          selector: '[data-testid="page-editor-add-window"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description:
          'In the Add window dialog, click "Combat" to add the Combat window to the page.',
        selector: {
          selector: '[data-testid="add-window-option-combat"]',
          shouldAdvanceOnClick: true,
        },
      },
    ],
  },
  {
    title: 'Scripts',
    substeps: [
      {
        description: 'Go to the Scripts page from the ruleset sidebar.',
        selector: { selector: '[data-testid="nav-scripts"]', shouldAdvanceOnClick: true },
      },
      {
        description: 'Click "New Script" to create a script.',
        selector: {
          selector: '[data-testid="scripts-new-script-link"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description:
          'Enter the name "take_damage", set Type to "Action", then open the Action dropdown and assign it to "Take Damage".',
        selector: {
          selector:
            '#script-name, [data-testid="script-editor-type"], [data-testid="script-editor-action-lookup"]',
          shouldAdvanceOnClick: false,
        },
      },
      {
        description: `
        Copy and paste the following QBScript code into the editor:
        on_activate():
            health = getAttr('Health')
            health.subtract(2)
        `,
        selector: {
          selector: '[data-testid="script-editor-save"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Go back to the Scripts list',
        selector: {
          selector: '[data-testid="nav-scripts"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description: 'Click "New Script" again.',
        selector: {
          selector: '[data-testid="scripts-new-script-link"]',
          shouldAdvanceOnClick: true,
        },
      },
      {
        description:
          'Enter the name "drink_potion", set Type to "Item", then open the Item dropdown and assign it to "Potion".',
        selector: {
          selector:
            '#script-name, [data-testid="script-editor-type"], [data-testid="script-editor-item-lookup"]',
          shouldAdvanceOnClick: false,
        },
      },
      {
        description: `
        Copy paste the following QBScript code in the editor:
        on_consume():
            health = getAttr('Health')
            health.add(2)
        `,
        selector: {
          selector: '[data-testid="script-editor-save"]',
          shouldAdvanceOnClick: true,
        },
      },
    ],
  },
];
