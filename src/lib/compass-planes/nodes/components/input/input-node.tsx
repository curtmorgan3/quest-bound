import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  NumberInput,
} from '@/components';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { useComponentCanvasDimensions } from '@/lib/compass-planes/canvas/editor-item-layout-context';
import { editorNodeComponentVisualEqual } from '@/lib/compass-planes/nodes/editor-node-memo';
import {
  getBackgroundStyle,
  getColorStyle,
  getComponentData,
  useComponentStyles,
  useNodeData,
} from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { CharacterAttribute, Component, TextComponentStyle } from '@/types';
import {
  ATTRIBUTE_VALUE_BINDING_MAX_ID,
  ATTRIBUTE_VALUE_BINDING_MIN_ID,
} from '@/utils/attribute-value-binding';
import { memo, useContext, useState } from 'react';
import { ResizableNode } from '../../decorators';

export const EditInputNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useEditorItemId();
  const component = getComponent(id);
  if (!component) return null;

  return (
    <ResizableNode component={component}>
      <ViewInputNode component={component} editMode />
    </ResizableNode>
  );
};

const ViewInputNodeComponent = ({
  component,
  editMode,
}: {
  component: Component;
  editMode?: boolean;
}) => {
  const data = useNodeData(component);
  const componentData = getComponentData(component);
  const attributeBindingPropId = componentData.attributeCustomPropertyId;
  const bindsAttributeMin = attributeBindingPropId === ATTRIBUTE_VALUE_BINDING_MIN_ID;
  const bindsAttributeMax = attributeBindingPropId === ATTRIBUTE_VALUE_BINDING_MAX_ID;
  const css = useComponentStyles(component) as TextComponentStyle;
  const characterContext = useContext(CharacterContext);
  const { widthStyle: cw, heightStyle: ch } = useComponentCanvasDimensions(component);
  const fieldDisabled = editMode || Boolean(data.disabled);

  const handleChange = (value: string | number) => {
    if (!characterContext) return;

    const propId = componentData.attributeCustomPropertyId;
    if (
      (propId === ATTRIBUTE_VALUE_BINDING_MIN_ID || propId === ATTRIBUTE_VALUE_BINDING_MAX_ID) &&
      data.characterAttributeId &&
      component.attributeId
    ) {
      if (value === '') return;
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n)) return;
      const ca = characterContext.getCharacterAttribute(component.attributeId);
      if (!ca) return;
      let patch: Partial<CharacterAttribute>;
      if (propId === ATTRIBUTE_VALUE_BINDING_MIN_ID) {
        patch = { min: n };
        if (ca.max !== undefined && n > ca.max) patch.max = n;
      } else {
        patch = { max: n };
        if (ca.min !== undefined && n < ca.min) patch.min = n;
      }
      characterContext.updateCharacterAttribute(data.characterAttributeId, patch);
      return;
    }
    if (propId && data.characterAttributeId && component.attributeId) {
      const ca = characterContext.getCharacterAttribute(component.attributeId);
      if (ca) {
        characterContext.updateCharacterAttribute(data.characterAttributeId, {
          attributeCustomPropertyValues: {
            ...(ca.attributeCustomPropertyValues ?? {}),
            [propId]: value,
          },
        });
      }
      return;
    }

    if (data.characterAttributeId) {
      characterContext.updateCharacterAttribute(data.characterAttributeId, {
        value,
      });
    } else {
      characterContext.updateCharacterComponentData(component.id, value);
    }
  };

  const onNumberBlur = () => {
    if (!component.attributeId || !characterContext) return;

    const raw = data.value;
    if (raw === '') return;

    const num = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(num)) return;

    if (bindsAttributeMin) {
      if (data.max != null) {
        const clamped = Math.min(num, data.max);
        if (!Object.is(clamped, num)) handleChange(clamped);
      }
      return;
    }
    if (bindsAttributeMax) {
      if (data.min != null) {
        const clamped = Math.max(num, data.min);
        if (!Object.is(clamped, num)) handleChange(clamped);
      }
      return;
    }

    const { min, max } = data;
    if (min == null && max == null) return;

    let clamped = num;
    if (min != null) clamped = Math.max(min, clamped);
    if (max != null) clamped = Math.min(max, clamped);
    if (Object.is(clamped, num)) return;

    handleChange(clamped);
  };

  const isListType = data.attributeType === 'list';
  const isMultiSelectList = isListType && data.allowMultiSelect;

  // For multi-select list, value is stored as comma-separated string
  const multiSelectValue =
    isMultiSelectList && data.value
      ? data.value
          .toString()
          .split(';;')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const [multiSelectDialogOpen, setMultiSelectDialogOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);

  const openMultiSelectDialog = () => {
    setPendingSelection([...multiSelectValue]);
    setMultiSelectDialogOpen(true);
  };

  const toggleMultiSelectOption = (option: string) => {
    setPendingSelection((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  };

  const applyMultiSelect = () => {
    handleChange(pendingSelection.join(';;'));
    setMultiSelectDialogOpen(false);
  };

  const sectionStyle = {
    position: 'relative' as const,
    height: ch,
    width: cw,
    pointerEvents: editMode ? 'none' : undefined,
    display: 'flex',
    justifyContent: css.textAlign ?? 'start',
    alignItems: css.verticalAlign ?? 'start',
    ...getBackgroundStyle(css),
    borderRadius: css.borderRadius,
    outline: css.outline,
    outlineColor: css.outlineColor,
    outlineWidth: css.outlineWidth,
    opacity: css.opacity,
    ...(!editMode ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}),
  } as React.CSSProperties;

  const inputStyle = {
    height: '100%',
    width: '100%',
    ...getColorStyle(css),
    fontSize: css.fontSize,
    fontFamily: css.fontFamily,
    fontWeight: css.fontWeight,
    fontStyle: css.fontStyle,
    textAlign: css.textAlign,
    border: 'none',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  } as React.CSSProperties;

  /** Section uses user-select: none on sheets; re-enable on real fields so values stay editable. */
  const interactiveFieldStyle = !editMode
    ? ({ userSelect: 'text', WebkitUserSelect: 'text' } as React.CSSProperties)
    : ({} as React.CSSProperties);

  return (
    <section style={sectionStyle} data-attribute-name={data.name}>
      {isMultiSelectList && !editMode ? (
        <>
          <button
            type='button'
            disabled={fieldDisabled}
            onClick={fieldDisabled ? undefined : openMultiSelectDialog}
            style={inputStyle}
            className={
              fieldDisabled ? 'cursor-default text-left opacity-60' : 'cursor-pointer text-left'
            }>
            {multiSelectValue.length > 0 ? multiSelectValue.join(', ') : (data.name ?? 'Select…')}
          </button>
          <Dialog open={multiSelectDialogOpen} onOpenChange={setMultiSelectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{data.name ?? 'Select options'}</DialogTitle>
                <DialogDescription>{data.name ?? 'Select options'}</DialogDescription>
              </DialogHeader>
              <div className='flex flex-col gap-2 max-h-[400px] overflow-y-auto py-2'>
                {data.options?.map((option) => (
                  <label
                    key={option}
                    className='flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 hover:bg-muted/50'>
                    <Checkbox
                      checked={pendingSelection.includes(option)}
                      onCheckedChange={() => toggleMultiSelectOption(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={applyMultiSelect}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : isListType && !editMode ? (
        <select
          disabled={fieldDisabled}
          onChange={(e) => handleChange(e.target.value)}
          value={data.value.toString()}
          style={{ ...inputStyle, ...interactiveFieldStyle }}>
          <option className='text-muted-foreground' value=''>
            {data.placeholder ?? data.name ?? data.type}
          </option>
          {data.options.map((option, i) => (
            <option key={i} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : data.type === 'number' ? (
        <NumberInput
          disabled={fieldDisabled}
          placeholder={data?.placeholder ?? data?.name ?? data.type}
          value={Number(data.value)}
          onChange={(value) => handleChange(value)}
          onBlur={onNumberBlur}
          style={{ ...inputStyle, ...interactiveFieldStyle }}
          inputMin={bindsAttributeMax ? data.min : bindsAttributeMin ? undefined : data.min}
          inputMax={bindsAttributeMin ? data.max : bindsAttributeMax ? undefined : data.max}
        />
      ) : (
        <input
          className='editor-input'
          type='text'
          disabled={fieldDisabled}
          placeholder={data?.placeholder ?? data?.name ?? data.type}
          onChange={(e) => handleChange(e.target.value)}
          value={editMode ? undefined : data.value.toString()}
          style={{ ...inputStyle, ...interactiveFieldStyle }}
          min={data.min}
          max={data.max}
        />
      )}
    </section>
  );
};

export const ViewInputNode = memo(
  ViewInputNodeComponent,
  (prev, next) =>
    editorNodeComponentVisualEqual(prev.component, next.component) &&
    prev.editMode === next.editMode,
);
