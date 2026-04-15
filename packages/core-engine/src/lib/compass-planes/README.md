# Creating New Nodes

Add type to `ComponentTypes` enum in `node-types.ts`.

Add component data type to `@/types.ts`.

Create a new directory in `nodes/components` with a config file and component file.

In `constants.ts`, add the config to `baseComponentTypes` and the component to `sheetNodeTypes`.

Add the node to `sheet-editor/sheet-context-options.ts`.

Add component type to `inject-defaults.ts`.

In the component file, export two components. The `ViewNode` component should accept the component as props and render it. The `EditNode` component
should use the `ResiableNode` wrapper and handle edit use cases.

Add component to `render-node.tsx`
