/**
 * Example: Using QBScript Worker in React Components
 * 
 * This file demonstrates how to use the QBScript worker system
 * in various React components.
 */

import { useState } from 'react';
import {
  useExecuteScript,
  useExecuteAction,
  useAttributeChange,
  useScriptValidation,
  useScriptAnnouncements,
  useDependencyGraph,
} from '../worker';

// ============================================================================
// Example 1: Simple Script Execution
// ============================================================================

export function ScriptExecutorExample() {
  const { execute, result, announceMessages, isExecuting, error } = useExecuteScript();
  const [sourceCode, setSourceCode] = useState('roll("2d6+4")');

  const handleExecute = () => {
    execute({
      sourceCode,
      characterId: 'char-123',
      rulesetId: 'ruleset-456',
      triggerType: 'action_click',
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Script Executor</h2>
      
      <textarea
        value={sourceCode}
        onChange={(e) => setSourceCode(e.target.value)}
        className="w-full h-32 p-2 border rounded mb-4"
        placeholder="Enter QBScript code..."
      />
      
      <button
        onClick={handleExecute}
        disabled={isExecuting}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        {isExecuting ? 'Executing...' : 'Execute'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error.message}
        </div>
      )}

      {result !== null && (
        <div className="mt-4 p-3 bg-green-100 rounded">
          <strong>Result:</strong> {JSON.stringify(result)}
        </div>
      )}

      {announceMessages.length > 0 && (
        <div className="mt-4">
          <strong>Announcements:</strong>
          {announceMessages.map((msg, i) => (
            <div key={i} className="p-2 bg-blue-100 rounded mt-2">
              📢 {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 2: Action Button
// ============================================================================

export function ActionButtonExample({ actionId, characterId }: { actionId: string; characterId: string }) {
  const { executeAction, announceMessages, isExecuting, error } = useExecuteAction();

  const handleClick = () => {
    executeAction(actionId, characterId);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isExecuting}
        className="px-4 py-2 bg-purple-500 text-white rounded disabled:bg-gray-300"
      >
        {isExecuting ? 'Executing...' : 'Execute Action'}
      </button>

      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error.message}
        </div>
      )}

      {announceMessages.map((msg, i) => (
        <div key={i} className="mt-2 p-2 bg-blue-50 rounded text-sm">
          {msg}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 3: Attribute Change Handling
// ============================================================================

export function AttributeInputExample({
  attributeId,
  characterId,
  rulesetId,
  currentValue,
  onValueChange,
}: {
  attributeId: string;
  characterId: string;
  rulesetId: string;
  currentValue: number;
  onValueChange: (value: number) => void;
}) {
  const { notifyChange, isProcessing } = useAttributeChange();

  const handleChange = async (newValue: number) => {
    // Update local state
    onValueChange(newValue);

    // Notify worker of change (triggers reactive scripts)
    await notifyChange({
      attributeId,
      characterId,
      rulesetId,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={currentValue}
        onChange={(e) => handleChange(Number(e.target.value))}
        disabled={isProcessing}
        className="px-3 py-2 border rounded"
      />
      {isProcessing && (
        <span className="text-sm text-gray-500">Processing...</span>
      )}
    </div>
  );
}

// ============================================================================
// Example 4: Script Validator
// ============================================================================

export function ScriptValidatorExample() {
  const { validate, isValid, errors, isValidating } = useScriptValidation();
  const [sourceCode, setSourceCode] = useState('');

  const handleValidate = () => {
    validate('script-123', sourceCode);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Script Validator</h2>
      
      <textarea
        value={sourceCode}
        onChange={(e) => setSourceCode(e.target.value)}
        className="w-full h-32 p-2 border rounded mb-4"
        placeholder="Enter script to validate..."
      />
      
      <button
        onClick={handleValidate}
        disabled={isValidating}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        {isValidating ? 'Validating...' : 'Validate'}
      </button>

      {isValid !== null && (
        <div className={`mt-4 p-3 rounded ${isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isValid ? (
            '✓ Script is valid'
          ) : (
            <div>
              <strong>Validation Errors:</strong>
              {errors.map((err, i) => (
                <div key={i} className="mt-2">
                  {err.line && `Line ${err.line}: `}
                  {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 5: Announcement Toast Integration
// ============================================================================

export function AnnouncementListenerExample() {
  const [announcements, setAnnouncements] = useState<string[]>([]);

  // Listen for announcements from any script execution
  useScriptAnnouncements((message) => {
    setAnnouncements((prev) => [...prev, message]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setAnnouncements((prev) => prev.filter((m) => m !== message));
    }, 5000);
  });

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {announcements.map((msg, i) => (
        <div
          key={i}
          className="px-4 py-3 bg-blue-500 text-white rounded-lg shadow-lg animate-slide-in"
        >
          📢 {msg}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 6: Dependency Graph Manager
// ============================================================================

export function DependencyGraphManagerExample({ rulesetId }: { rulesetId: string }) {
  const { build, clear, isBuilding, success, nodeCount, edgeCount, error } = useDependencyGraph();

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-bold mb-4">Dependency Graph</h3>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => build(rulesetId)}
          disabled={isBuilding}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isBuilding ? 'Building...' : 'Build Graph'}
        </button>
        
        <button
          onClick={() => clear(rulesetId)}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Clear Graph
        </button>
      </div>

      {success !== null && (
        <div className={`p-3 rounded ${success ? 'bg-green-100' : 'bg-red-100'}`}>
          {success ? (
            <div>
              <strong>Graph built successfully</strong>
              {nodeCount !== null && <div>Nodes: {nodeCount}</div>}
              {edgeCount !== null && <div>Edges: {edgeCount}</div>}
            </div>
          ) : (
            <div>
              <strong>Failed to build graph</strong>
              {error && <div className="text-red-700">{error.message}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 7: Complete Character Sheet with Reactive Attributes
// ============================================================================

export function ReactiveCharacterSheetExample() {
  const { notifyChange } = useAttributeChange();
  const [attributes, setAttributes] = useState({
    strength: 14,
    constitution: 16,
    level: 5,
    maxHp: 0, // Computed from constitution and level
  });

  const handleAttributeChange = async (attrName: string, value: number) => {
    setAttributes((prev) => ({ ...prev, [attrName]: value }));

    // Notify worker - this will trigger reactive scripts
    // that depend on this attribute
    await notifyChange({
      attributeId: `attr-${attrName}`,
      characterId: 'char-123',
      rulesetId: 'ruleset-456',
    });
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Character Sheet</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="font-medium">Strength:</label>
          <input
            type="number"
            value={attributes.strength}
            onChange={(e) => handleAttributeChange('strength', Number(e.target.value))}
            className="w-20 px-3 py-2 border rounded"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="font-medium">Constitution:</label>
          <input
            type="number"
            value={attributes.constitution}
            onChange={(e) => handleAttributeChange('constitution', Number(e.target.value))}
            className="w-20 px-3 py-2 border rounded"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="font-medium">Level:</label>
          <input
            type="number"
            value={attributes.level}
            onChange={(e) => handleAttributeChange('level', Number(e.target.value))}
            className="w-20 px-3 py-2 border rounded"
          />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <label className="font-medium text-lg">Max HP:</label>
          <span className="text-2xl font-bold">{attributes.maxHp}</span>
        </div>
      </div>
    </div>
  );
}
