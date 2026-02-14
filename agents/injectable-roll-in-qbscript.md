# Injectable roll() in QBScript runtime

The evaluator and script runner support an optional **roll function** so scripts can use the app’s dice flow (e.g. from `useDiceState`) instead of the default local `rollDie` implementation.

## Types

- **`RollFn`** (from `evaluator.ts`): `(expression: string) => number | Promise<number>`
- Script built-in `roll("2d6+3")` must receive the **numeric total** (sync or async).

## Wiring

1. **Evaluator**: `new Evaluator({ roll: myRollFn })` — when `roll` is provided, it is used as the script built-in `roll()`.
2. **ScriptRunner**: Pass `roll` on **ScriptExecutionContext**: `{ ..., roll: myRollFn }`. The runner passes it into the Evaluator.

## useDiceState

`useDiceState`’s `rollDice` returns `Promise<DiceResult>` with a `.total`. To use it as the script roll, pass a wrapper that returns the total:

```ts
const { rollDice } = useDiceState({ canvasRef });

const roll: RollFn = (expression) =>
  rollDice(expression).then((result) => result.total);

// When creating the script runner context (e.g. in UI that runs scripts):
const context: ScriptExecutionContext = {
  ownerId,
  rulesetId,
  db,
  roll,
};
const runner = new ScriptRunner(context);
```

Worker-based execution cannot receive a function from the main thread, so worker runs use the default (local) roll implementation unless the worker is given a roll some other way.
