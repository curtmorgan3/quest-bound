import {
  Attribute,
  AttributeType,
  Chart,
  CreateAttribute,
  useAttributes,
  useCreateAttribute,
  useUpdateAttribute,
} from '@/libs/compass-api';
import { buildContextualItems } from '@/libs/compass-api/utils/build-items';
import { Logic, LogicalValue, Operation, OperationType } from '@/libs/compass-planes';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Override, useReferenceValues } from './use-reference-values';

export interface UseLogicState {
  attribute?: Attribute | null;
  statementMode: boolean;
  setStatementMode: React.Dispatch<React.SetStateAction<boolean>>;
  injectedLogic: Logic;
  setOperationOverride: (override: Override) => void;
  attributes: Attribute[];
  connectedCharts: Chart[];
  connectedAttributes: Attribute[];
  injectReferenceValue: (logic: Logic) => Logic;
  createOperations: (newOperations: Operation[]) => void;
  deleteOperations: (ids: string[]) => void;
  updateOperations: (updates: Array<Partial<Operation> & { id: string }>) => void;
  updateOperation: (update: Partial<Operation> & { id: string }) => void;
}

export function useLogicState(attribute?: Attribute | null) {
  const { rulesetId } = useParams();
  const { updateAttribute } = useUpdateAttribute(2000);
  const { createAttribute } = useCreateAttribute();

  const attributeLogic = attribute ? (JSON.parse(attribute.logic) as Logic) : ([] as Logic);
  const [attributeOverrides, setAttributeOverrides] = useState<Override[]>([]);
  const [operationOverrides, setOperationOverrides] = useState<Override[]>([]);

  const { attributes } = useAttributes(false, undefined, true);
  const { attributes: rulesetItems } = useAttributes(false, AttributeType.ITEM, true);
  const items = buildContextualItems(rulesetItems);

  const { injectReferenceValue } = useReferenceValues({
    attributes,
    logic: attributeLogic,
    attributeOverrides,
    operationOverrides,
  });

  const injectedLogic = injectReferenceValue(attributeLogic);

  const promoteToAttribute = async (
    operation: Operation,
    details: Omit<CreateAttribute, 'rulesetId'>,
  ) => {
    if (!rulesetId) return '';
    // Create the attribute
    const attribute = await createAttribute({
      rulesetId,
      ...details,
    });

    // Replace operation type with attribute type
    // add attributeRef to operation
    updateOperation({
      id: operation.id,
      type: OperationType.Attribute,
      attributeRef: attribute.id,
    });
    return 'success';
  };

  // Used in the logic editor to set test values
  const setOverride = (override: Override) => {
    const isAttributeOverride = attributes.some((a) => a.id === override.id);

    const getter = isAttributeOverride ? attributeOverrides : operationOverrides;
    const setter = isAttributeOverride ? setAttributeOverrides : setOperationOverrides;

    if (!getter.some((o) => o.id === override.id)) {
      setter((prev) => [...prev, { id: override.id, value: override.value ?? '' }]);
    } else {
      setter((prev) =>
        prev.map((o) => {
          if (o.id !== override.id) return o;
          return {
            ...o,
            value: override.value ?? '',
          };
        }),
      );
    }
  };

  const createOperations = (newOperations: Operation[]) => {
    const updatedOps = [...injectedLogic, ...newOperations];
    updateAttribute({
      id: attribute?.id ?? '',
      logic: JSON.stringify(updatedOps),
    });
  };

  const updateOperations = (updates: Array<Partial<Operation> & { id: string }>) => {
    let updatedDefaultValue: LogicalValue | undefined;

    const updatedLogic = injectedLogic.map((op) => {
      const update = updates.find((u) => u.id === op.id);
      if (update && op.type === OperationType.DefaultValue) {
        updatedDefaultValue = update.value;
      }
      return update ? { ...op, ...update } : op;
    });

    updateAttribute({
      id: attribute?.id ?? '',
      logic: JSON.stringify(updatedLogic),
      ...(updatedDefaultValue &&
        updatedDefaultValue !== undefined && {
          defaultValue: `${updatedDefaultValue}`,
        }),
    });
  };

  const updateOperation = (update: Partial<Operation> & { id: string }) => {
    updateOperations([update]);
  };

  const deleteOperations = (ids: string[]) => {
    if (!attribute) return;
    const updatedLogic = injectedLogic
      .filter((op) => !ids.includes(op.id))
      .map((op: Operation) => ({
        ...op,
        attributeRef: op.attributeRef && ids.includes(op.attributeRef) ? null : op.attributeRef,
        connections: op.connections?.filter((conn) => !ids.includes(conn.id)),
        chartRef: op.chartRef && ids.includes(op.chartRef) ? null : op.chartRef,
      }));

    updateAttribute({
      id: attribute.id,
      logic: JSON.stringify(updatedLogic),
    });
  };

  return {
    attribute,
    injectedLogic,
    setOperationOverride: setOverride,
    attributes,
    items,
    promoteToAttribute,
    injectReferenceValue,
    createOperations,
    deleteOperations,
    updateOperations,
    updateOperation,
  };
}
