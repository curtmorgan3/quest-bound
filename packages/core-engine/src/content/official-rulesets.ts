export type OfficialRuleset = {
  id: string;
  title: string;
  /** Shown on the preview card under the title */
  description?: string;
  /** Passed to `/play/:slug` (e.g. `d&d` for D&D 5e SRD) */
  slug: string;
  /** Cover image URL for the card header */
  image?: string;
};

export const officialRulesets: OfficialRuleset[] = [
  {
    id: 'dnd-5e-srd',
    title: 'D&D 5e SRD',
    slug: 'd&d',
    image:
      'https://www.tribality.com/wp-content/uploads/2014/10/cover-dnd-e1501645849868.jpg',
  },
];
