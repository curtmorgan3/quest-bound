import { AttributeContext, AttributeType, SheetComponent } from '@/libs/compass-api';
import { useReplaceVariableText } from '@/libs/compass-web-utils';
import { AnimatePresence } from 'framer-motion';
import debounce from 'lodash.debounce';
import { CSSProperties, useContext, useEffect, useMemo, useState, type JSX } from 'react';
import { ActionAttributeNode } from './action-attribute-node';
import { AnimatedUpdateMsg } from './animated-update-msg';
import { BooleanAttributeNode } from './boolean-attribute-node';
import { InputAttributeNode } from './input-attribute-node';
import { TextAttributeNode } from './text-attribute-node';

type CheckboxProps = {
  src?: string;
  onChange?: (value: Partial<SheetComponent>) => void;
  style?: CSSProperties;
  iconStyle?: CSSProperties;
  defaultCheckedIcon?: JSX.Element;
  defaultUncheckedIcon?: JSX.Element;
};

interface Props {
  attributeId: string;
  enableLogic: boolean;
  checkboxProps?: CheckboxProps;
  readOnly?: boolean;
  alwaysShowSign?: boolean;
  style?: CSSProperties;
  hideWheel?: boolean;
  ignoreLabel?: boolean;
  viewMode?: boolean;
}

/**
 * Controls a single attribute's value for an entity.
 *
 * If logic is enabled, the attribute will derive its value from the logic setup in the ruleset.
 *
 * When a manual change occurs, the attribute will disable its own logic, but the evaulation will continue to be tracked in
 * its derivedValue property. When logic is re-enabled, the derivedValue will be injected as the attribute's value.
 */
export const SheetAttributeControl = ({
  attributeId,
  enableLogic,
  viewMode,
  style,
  hideWheel,
  checkboxProps,
  readOnly = false,
  alwaysShowSign = false,
  ignoreLabel = false,
}: Props) => {
  const { getAttribute, attributes, loading, updateCharacterAttribute, triggerAction } =
    useContext(AttributeContext);

  const attribute = getAttribute(attributeId);

  const _attributeValue = attribute?.value ?? null;

  const injectedValue = useReplaceVariableText(`${_attributeValue}`, attributes);

  const attributeValue =
    readOnly && attribute?.type === AttributeType.TEXT ? injectedValue : _attributeValue;

  const [tempValue, setTempValue] = useState<string | number | null>(attributeValue);

  useEffect(() => {
    if (tempValue !== attributeValue) {
      setTempValue(attributeValue);
    }
  }, [attributeValue]);

  const attributeLogic = attribute?.logic ?? [];
  const attributeDescription = attribute?.description;

  const hasDefaultValConnection = Boolean(
    attributeLogic.find((op: any) => op.type === 'default-value')?.connections?.length,
  );

  const debouncedUpdate = useMemo(
    () =>
      debounce((id: string, value: string) => {
        updateCharacterAttribute({ id, value });
      }, 500),
    [],
  );

  const handleChange = (id: string, value: string) => {
    setTempValue(value);
    debouncedUpdate(id, value);
  };

  const reenableLogic = () => {
    updateCharacterAttribute({ id: attributeId, reenableLogic: true });
  };

  const renderControl = () => {
    if (!attribute) return null;
    if (readOnly) {
      return (
        <TextAttributeNode
          renderedAttributeValue={attributeValue}
          alwaysShowSign={alwaysShowSign}
          attributeDescription={attributeDescription}
        />
      );
    }

    switch (attribute?.type) {
      case AttributeType.BOOLEAN:
        return (
          <BooleanAttributeNode
            renderedAttributeValue={tempValue}
            handleChange={handleChange}
            checkboxProps={checkboxProps}
            attribute={attribute}
            attributeDescription={attributeDescription}
            reenableLogic={reenableLogic}
            ignoreLabel={ignoreLabel}
          />
        );
      case AttributeType.ACTION:
        return (
          <ActionAttributeNode
            loading={loading}
            triggerAction={() => triggerAction(attribute.id)}
            attribute={attribute}
            attributeDescription={attributeDescription}
          />
        );
      default:
        return (
          <InputAttributeNode
            id={attribute?.id}
            hideWheel={hideWheel}
            viewMode={viewMode}
            ignoreLabel={ignoreLabel}
            renderedAttributeValue={tempValue}
            handleChange={handleChange}
            attribute={attribute}
            attributeDescription={attributeDescription}
            reenableLogic={reenableLogic}
            loading={loading}
            style={style}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      <AnimatedUpdateMsg
        value={attributeValue}
        isDerivedAttribute={!!hasDefaultValConnection && !attribute?.logicDisabled}>
        {renderControl()}
      </AnimatedUpdateMsg>
    </AnimatePresence>
  );
};
