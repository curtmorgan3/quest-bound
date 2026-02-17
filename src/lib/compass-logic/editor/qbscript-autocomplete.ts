/**
 * QBScript autocomplete suggestions for CodeMirror 6
 */

import { autocompletion } from '@codemirror/autocomplete';

const qbscriptCompletions = [
  {
    label: 'Self',
    type: 'variable',
    info: 'The entity this script is attached to: Owner.Attribute(title), Owner.Action(title), or Owner.Item(title)',
  },
  { label: 'Owner', type: 'variable', info: 'Character that initiated the script' },
  { label: 'Owner.Attribute', type: 'function', info: "Get owner's attribute by name" },
  { label: 'Owner.Item', type: 'function', info: "Get owner's item by name" },
  { label: 'Owner.Items', type: 'function', info: "Get owner's items array by name" },
  {
    label: 'Owner.Action',
    type: 'function',
    info: 'Get action reference by name, then call .activate()',
  },
  { label: 'Ruleset', type: 'variable', info: 'Ruleset-level entities' },
  { label: 'Ruleset.Attribute', type: 'function', info: 'Get attribute definition' },
  { label: 'Ruleset.Chart', type: 'function', info: 'Get chart by name' },
  {
    label: 'subscribe',
    type: 'keyword',
    info: 'Forces this script to execute again when subscribed attributes change',
  },
  {
    label: 'getAttr',
    type: 'function',
    info: "Equivalent to Owner.Attribute('name').value",
  },
  {
    label: 'getChart',
    type: 'function',
    info: "Equivalent to Ruleset.Chart('name')",
  },
  { label: 'roll', type: 'function', info: 'Roll dice (e.g. roll("2d6+3"))' },
  { label: 'announce', type: 'function', info: 'Display notification message to player' },
  { label: 'log', type: 'function', info: 'Log to editor console and game log' },
  { label: 'floor', type: 'function', info: 'Round down to nearest whole integer' },
  { label: 'ceil', type: 'function', info: 'Round up to nearest whole integer' },
  { label: 'round', type: 'function', info: 'Mathematically round to nearest whole integer' },
  { label: 'if', type: 'keyword', info: 'Conditional' },
  { label: 'else', type: 'keyword', info: 'Else branch' },
  { label: 'for', type: 'keyword', info: 'Loop over an array or set of numbers' },
  { label: 'in', type: 'keyword', info: 'Iteration' },
  { label: 'return', type: 'keyword', info: 'Return value' },
];

export const qbscriptAutocomplete = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word || (word.from === word.to && !context.explicit)) return null;
      const filter = word.text.toLowerCase();
      const options = qbscriptCompletions.filter(
        (c) => c.label.toLowerCase().startsWith(filter) || filter === '',
      );
      if (options.length === 0) return null;
      return {
        from: word.from,
        options: options.map((o) => ({
          label: o.label,
          type: o.type as 'variable' | 'function' | 'keyword',
          info: o.info,
        })),
      };
    },
  ],
});
