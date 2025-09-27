Compass Planes is Quest Bound's internal library that powers all WYSIWYG editors for game design. It enables users to visually design rulebooks and TTRPG character sheets with dynamic, interactive elements that integrate with Quest Bound's data infrastructure.

## Purpose

Quest Bound is a platform for designing games. Game designers use Compass Planes to create:
- **Interactive Rulebooks**: Visual rulebooks with dynamic elements
- **TTRPG Character Sheets**: Customizable character sheets with data-bound components
- **Future**: Tilemap-based map editors for game level design

Components on sheets can be associated with attributes from Quest Bound's application database, creating a seamless integration between visual design and game data.

## Target Users

Game designers with technical expertise who are familiar with design editors like Figma and Photoshop. They need powerful visual editing tools that can handle both static design elements and dynamic, data-driven components.

## Architecture

### Base Editor System
Compass Planes uses a hierarchical editor architecture:
- **Base Editor**: Handles core functionality (component creation, placement, rotation, scaling, events, configuration)
- **Child Editors**: Specialized editors for specific use cases:
  - Character Sheet Editor
  - Rulebook Editor  
  - Map Editor (future)
- Each child editor has unique components and tools while inheriting base editor capabilities

### Component Architecture
- **Base Component**: All components inherit from a common base class
- **Component Responsibility**: Each component manages only its own state
- **Decorator Pattern**: Components use the Gang of Four decorator pattern for styling and behavior
  - Concrete components (e.g., text input renderer) are wrapped by decorator components
  - Decorators add styling (underline, bold, etc.) and behaviors (rotation, scaling)
  - Enables flexible composition of component features

### Data Integration
- **Foreign Key Associations**: Components can be linked to Quest Bound entities (attributes, actions, items)
- **Reactive Data**: Components use `useLiveQuery` hooks for real-time data binding
- **Database Integration**: Seamless connection between visual components and Quest Bound's data infrastructure

## Underlying Libraries and Core Technologies

Compass Planes uses Pixi.js for WebGL powered graphics and handles:
- Infinite canvas implementation
- Component rendering and scene graph management
- Interactive events (drag-and-drop, resize, rotate)
- Grid snapping and spatial operations

## Installation & Setup

Compass Planes is an internal library within the Quest Bound monorepo. No separate installation or packaging is required - it's imported directly from the `src/lib/compass-planes/` directory.

## API Documentation

### Main Export

```typescript
import { Editor } from '@/lib/compass-planes'
```

### Editor Component

The `<Editor />` component is the main entry point for all Compass Planes functionality.

```typescript
<Editor config={editorConfig} />
```

**Props:**
- `config` (required): Configuration object that defines editor behavior, available components, and editor type

## Core Features

The Editor component provides a drag and drop interface for creating interactive game design documents.

Users can place primitive components on an infinite canvas. Components on the canvas snap to a configurable grid size.

Components can be resized and rotated.

Components:

- Input
  Inputs can be number or text type and function like HTML inputs

- Shape
  A sqaure vector shape tool

- Text
  Vector text that can scale to any size and use custom fonts
