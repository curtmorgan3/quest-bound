/**
 * When the ruleset window editor shows CharacterPage in preview (`editorWindowId`), scripts run on the
 * main thread must tell the worker which ruleset window is being previewed so SheetUiCoordinator
 * hydrates that character window even if it is not on the character's current sheet page.
 */
let sheetPreviewRulesetWindowId: string | undefined;

export function getSheetPreviewRulesetWindowIdForScripts(): string | undefined {
  return sheetPreviewRulesetWindowId;
}

export function setSheetPreviewRulesetWindowIdForScripts(rulesetWindowId: string | undefined): void {
  sheetPreviewRulesetWindowId = rulesetWindowId;
}
