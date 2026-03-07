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
  {
    label: 'Caller',
    type: 'variable',
    info: 'Entity that fired the action: item instance when action fired from item context menu, else Owner',
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
  {
    label: 'Owner.addPage',
    type: 'function',
    info: "Create a character sheet page from a ruleset page template by label (e.g. Owner.addPage('Spells'))",
  },
  {
    label: 'Owner.addItem',
    type: 'function',
    info: "Add an item to the character's inventory by name (e.g. Owner.addItem('Potion', 2) or Owner.addItem('Potion', 1, 'inventoryCompId'))",
  },
  {
    label: 'Owner.addAction',
    type: 'function',
    info: "Add an action as an inventory entry (e.g. Owner.addAction('Attack') or Owner.addAction('Attack', 'inventoryCompId'))",
  },
  {
    label: 'Owner.addAttribute',
    type: 'function',
    info: "Add an attribute as an inventory entry (e.g. Owner.addAttribute('Health') or Owner.addAttribute('Health', 'inventoryCompId'))",
  },
  {
    label: 'Owner.navigateToPage',
    type: 'function',
    info: "Navigate the character sheet to a page by label (e.g. Owner.navigateToPage('Spells'))",
  },
  {
    label: 'Owner.removePage',
    type: 'function',
    info: "Remove a character sheet page that was created from a ruleset page with the given label (e.g. Owner.removePage('Spells'))",
  },
  {
    label: 'Owner.openWindow',
    type: 'function',
    info: "Open a character sheet window on the current page by label (e.g. Owner.openWindow('Inventory'))",
  },
  {
    label: 'Owner.closeWindow',
    type: 'function',
    info: "Close and remove a character sheet window on the current page by label (e.g. Owner.closeWindow('Inventory'))",
  },
  {
    label: 'Scene',
    type: 'variable',
    info: 'Active campaign scene in campaign context; use Scene.characters(), Scene.spawnCharacter(name), and turn-based APIs',
  },
  {
    label: 'Scene.characters',
    type: 'function',
    info: 'Returns array of active character accessors in this scene (e.g. Scene.characters())',
  },
  {
    label: 'Scene.currentTurnCycle',
    type: 'variable',
    info: 'Current cycle number (1-based). Read-only. Meaningful when turn-based mode is on.',
  },
  {
    label: 'Scene.currentStepInCycle',
    type: 'variable',
    info: '0-based index of whose turn it is in the sorted turn order. Read-only.',
  },
  {
    label: 'Scene.advanceTurnOrder',
    type: 'function',
    info: 'Move to the next character in turn order; runs cycle and onTurnAdvance callbacks (e.g. Scene.advanceTurnOrder())',
  },
  {
    label: 'Scene.startTurnBasedMode',
    type: 'function',
    info: 'Enable turn-based mode and assign default turn order by creation date (e.g. Scene.startTurnBasedMode())',
  },
  {
    label: 'Scene.stopTurnBasedMode',
    type: 'function',
    info: 'Disable turn-based mode and clear turn callbacks (e.g. Scene.stopTurnBasedMode())',
  },
  {
    label: 'Scene.inTurns',
    type: 'function',
    info: 'Register a block to run in n cycles (e.g. Scene.inTurns(3): ...). Use a colon and indented block.',
  },
  {
    label: 'Scene.onTurnAdvance',
    type: 'function',
    info: 'Register a block to run on every advance (e.g. Scene.onTurnAdvance(): ...). Use a colon and indented block.',
  },
  {
    label: 'Owner.turnOrder',
    type: 'variable',
    info: 'This character\'s position in turn order (0 = unset). Read-only. In campaign scene context only.',
  },
  {
    label: 'Owner.setTurnOrder',
    type: 'function',
    info: 'Set this character\'s turn order (e.g. Owner.setTurnOrder(2)). Use 0 for unset. Gaps allowed.',
  },
  {
    label: 'turnOrder',
    type: 'variable',
    info: 'On character references (Owner or from Scene.characters()): position in turn order (0 = unset). Read-only.',
  },
  {
    label: 'setTurnOrder',
    type: 'function',
    info: 'On character references: set turn order (e.g. char.setTurnOrder(2)). Use 0 for unset. In campaign scene only.',
  },
  { label: 'Ruleset', type: 'variable', info: 'Ruleset-level entities' },
  { label: 'Ruleset.Attribute', type: 'function', info: 'Get attribute definition' },
  { label: 'Ruleset.Chart', type: 'function', info: 'Get chart by name' },
  {
    label: 'subscribe',
    type: 'keyword',
    info:
      'Forces this script to execute again when subscribed attributes change (used by attribute and Game Manager scripts)',
  },
  {
    label: 'getAttr',
    type: 'function',
    info: "Shorthand for Owner.Attribute('name').value. Example: hp = getAttr('Hit Points')",
  },
  {
    label: 'getChart',
    type: 'function',
    info: "Shorthand for Ruleset.Chart('name'). Example: table = getChart('Level Table')",
  },
  {
    label: 'rowWhere',
    type: 'function',
    info: "Chart row lookup by column name and cell value. Example: row = chart.rowWhere('Level', 5)",
  },
  {
    label: 'valueInColumn',
    type: 'function',
    info: "Get a column's value from a chart row. Example: hp = chart.rowWhere('Level', 5).valueInColumn('HP')",
  },
  { label: 'roll', type: 'function', info: 'Roll dice (e.g. roll("2d6+3")). Uses script runner roll (e.g. dice panel).' },
  {
    label: 'prompt',
    type: 'function',
    info: 'Show modal with message and choice buttons. Returns selected choice. E.g. choice = prompt("Pick one", ["A", "B", "C"])',
  },
  {
    label: 'rollSplit',
    type: 'function',
    info: 'Like roll but returns array of each die value in order (e.g. rollSplit("1d6,2d20") → [d6, d20_1, d20_2]).',
  },
  {
    label: 'rollQuiet',
    type: 'function',
    info: 'Roll dice with default local roll only (no UI, no script-runner override). e.g. rollQuiet("1d20+5")',
  },
  { label: 'announce', type: 'function', info: 'Display notification message to player' },
  { label: 'log', type: 'function', info: 'Log to editor console and game log' },
  { label: 'floor', type: 'function', info: 'Round down to nearest whole integer' },
  { label: 'ceil', type: 'function', info: 'Round up to nearest whole integer' },
  { label: 'round', type: 'function', info: 'Mathematically round to nearest whole integer' },
  { label: 'number', type: 'function', info: 'Parse argument to a number (int or float)' },
  { label: 'text', type: 'function', info: 'Convert argument to a string' },
  { label: 'if', type: 'keyword', info: 'Conditional' },
  { label: 'else', type: 'keyword', info: 'Else branch' },
  { label: 'for', type: 'keyword', info: 'Loop over an array or set of numbers' },
  { label: 'while', type: 'keyword', info: 'Loop while condition is true' },
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
