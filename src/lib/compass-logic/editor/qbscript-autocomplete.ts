/**
 * QBScript autocomplete suggestions for CodeMirror 6
 */

import { autocompletion } from '@codemirror/autocomplete';

const qbscriptCompletions = [
  { label: 'Self', type: 'variable', info: "This attribute (same as Owner.Attribute for this script's attribute)" },
  { label: 'Owner', type: 'variable', info: 'Character that initiated the script' },
  { label: 'Owner.Attribute', type: 'function', info: "Get owner's attribute by name" },
  { label: 'Owner.Item', type: 'function', info: "Get owner's item by name" },
  { label: 'Owner.Items', type: 'function', info: "Get owner's items array by name" },
  { label: 'Owner.Action', type: 'function', info: "Get action reference by name; use .activate() / .deactivate() (async)" },
  { label: 'Target', type: 'variable', info: 'Target character (when in scope)' },
  { label: 'Target.Attribute', type: 'function', info: "Get target's attribute by name" },
  { label: 'Ruleset', type: 'variable', info: 'Ruleset-level entities' },
  { label: 'Ruleset.Attribute', type: 'function', info: 'Get attribute definition' },
  { label: 'Ruleset.Chart', type: 'function', info: 'Get chart by name' },
  { label: 'subscribe', type: 'keyword', info: 'Subscribe to attribute changes' },
  { label: 'roll', type: 'function', info: 'Roll dice (e.g. roll("2d6+3"))' },
  { label: 'announce', type: 'function', info: 'Display message to players' },
  { label: 'log', type: 'function', info: 'Debug log (forwarded to console)' },
  { label: 'console.log', type: 'function', info: 'Debug log' },
  { label: 'floor', type: 'function', info: 'Math.floor' },
  { label: 'ceil', type: 'function', info: 'Math.ceil' },
  { label: 'round', type: 'function', info: 'Math.round' },
  { label: 'if', type: 'keyword', info: 'Conditional' },
  { label: 'else', type: 'keyword', info: 'Else branch' },
  { label: 'for', type: 'keyword', info: 'Loop' },
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
