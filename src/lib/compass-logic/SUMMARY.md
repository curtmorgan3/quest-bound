# QBScript System - Documentation Summary

This directory contains the complete specification and design for QBScript, Quest Bound's custom scripting language.

## Documentation Files

### README.md
Contains the complete system design including:
- **Feature Requirements** - All decisions made about functionality
- **Execution Model** - How scripts run (reactive, event-driven, transactional)
- **Safety Mechanisms** - Error handling, rollback, infinite loop prevention
- **Data Model** - Script entity design
- **Syntax Decisions** - All 14+ questions answered with rationale
- **Next Steps** - Implementation roadmap

### QBScript.md
The **language reference** and **tutorial** including:
- **Syntax Overview** - All operators, keywords, and constructs
- **Data Types** - Primitives, arrays, special entity types
- **Built-in Functions** - roll(), announce(), console.log(), etc.
- **Entity APIs** - Methods for Attributes, Actions, Items, Charts
- **Script Type Examples** - Attribute, Action, Item, and Global scripts
- **Complete D&D Example** - Real-world usage demonstrating all features

## Quick Reference

### Language Characteristics
- **Python-like structure** - Indentation-based blocks, simple syntax
- **C-like operators** - &&, ||, !, //, /* */
- **Dynamically typed** - No type declarations
- **Lexical scoping** - Variables scoped to functions and blocks
- **Service Worker execution** - Non-blocking interpreter

### Script Types
| Type | Purpose | Return Value | Triggers |
|------|---------|--------------|----------|
| Attribute | Computed values | Yes (sets attribute) | Load + dependency changes |
| Action | Executable abilities | No (side effects only) | UI click |
| Item | Event handlers | No (side effects only) | Equip/consume/etc. |
| Global | Shared utilities | N/A | Loaded once |

### Key Design Decisions

**Execution:**
- Reactive (attributes auto-update on dependencies)
- Cascading (side effects trigger other scripts)
- Transactional (errors rollback all changes)
- Non-blocking (Service Worker)

**Safety:**
- Infinite loop detection (evaluation count limits)
- Circular dependency warnings (design-time)
- Error logging (dedicated store)
- Player overrides (disable scripts per character)

**Access:**
- Full read/write to attributes, actions, items
- Three contexts: Owner, Target, Ruleset
- Chart queries for data lookups
- Dice rolling built-in

## Implementation Roadmap

### Phase 1: Interpreter Core
1. Lexer (tokenization)
2. Parser (AST generation)
3. Evaluator (execution engine)
4. Built-in functions

### Phase 2: Service Worker Integration
1. Communication protocol (signals)
2. Script execution manager
3. Error handling and logging
4. Console logging system

### Phase 3: Data Model
1. Script entity (database table)
2. Script-entity associations
3. Global script marking
4. Export/import as .qbs files

### Phase 4: UI
1. Script editor (code editor component)
2. Console panel (read-only logs)
3. Error display
4. Target selector (for actions)
5. Script override toggle (for players)

### Phase 5: Safety & Quality
1. Dependency graph analysis
2. Circular dependency detection
3. Execution count limiting
4. Transaction/rollback system

### Phase 6: Advanced Features
1. Custom item properties
2. Visual node editor (compiles to QBScript)
3. Syntax highlighting
4. Auto-complete
5. Documentation tooltips

## Status

- ✅ Requirements gathering complete
- ✅ Language specification finalized
- ✅ Syntax documented with examples
- ⏳ Ready for implementation

## For Developers

When implementing, refer to:
1. **README.md** for system architecture and requirements
2. **QBScript.md** for language syntax and examples
3. Start with Phase 1 (Interpreter Core)
4. Test each phase thoroughly before moving to next

## For Game Designers

When learning QBScript, refer to:
1. **QBScript.md** - Start with "Syntax" section
2. Study the complete D&D example
3. Use global scripts for reusable utilities
4. Test with test characters
5. Use console.log() for debugging
