import { DISCORD_URL, DOCS_URL } from '@/constants';
import type { Tutorial } from '@/types';

export const onboardingTutorial: Tutorial = [
  {
    title: 'Rulesets',
    selector: '[data-testid="nav-rulesets"]',
    substeps: [
      {
        description:
          'A ruleset is the foundation of your game. It holds all the rules, character sheet layout, and content.',
      },
      {
        description:
          'Create your first ruleset from the Rulesets page, then open it to start building.',
        ctas: [{ label: 'Go to Rulesets', action: { type: 'link', href: '/rulesets' } }],
      },
    ],
  },
  {
    title: 'Attributes, Actions & Items',
    selector: '[data-testid="nav-rulesets"]',
    substeps: [
      {
        description:
          "Attributes define character stats (e.g. Health, Strength). Actions are things characters can do (e.g. Attack, Heal). Items are equipment, spells, or inventory. Add these from your ruleset's sidebar once you have a ruleset open.",
        ctas: [{ label: 'Go to Rulesets', action: { type: 'link', href: '/rulesets' } }],
      },
    ],
  },
  {
    title: 'Windows & Pages',
    selector: '[data-testid="nav-windows"], [data-testid="nav-pages"]',
    substeps: [
      {
        description:
          'Windows are the building blocks of a character sheet—a stat block, an inventory list, or a text area. Pages group windows into tabs or sections. Use Windows and Pages in the ruleset editor to design how your character sheet looks.',
        ctas: [
          {
            label: 'Open documentation',
            action: { type: 'link', href: DOCS_URL + '/docs/windows' },
          },
        ],
      },
    ],
  },
  {
    title: 'Scripts & Dice',
    selector: '[data-testid="nav-scripts"], [data-testid="nav-dice"]',
    substeps: [
      {
        description:
          'Scripts add logic to your game: formulas, roll buttons, and automation. Use qbscript to compute values and respond to rolls. The Dice panel in the sidebar lets you roll 3D dice during play.',
        ctas: [
          {
            label: 'Open documentation',
            action: { type: 'link', href: DOCS_URL + '/docs/scripts' },
          },
        ],
      },
    ],
  },
  {
    title: 'Help & Resources',
    selector: '[data-testid="nav-help"]',
    substeps: [
      {
        description:
          'Need more detail? The documentation covers everything. Join our Discord to ask questions and share your games.',
        ctas: [
          { label: 'Open documentation', action: { type: 'link', href: DOCS_URL } },
          { label: 'Join Discord', action: { type: 'link', href: DISCORD_URL } },
        ],
      },
    ],
  },
];
