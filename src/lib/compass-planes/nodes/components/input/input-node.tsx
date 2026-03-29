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
import {
  getBackgroundStyle,
  getColorStyle,
  useComponentStyles,
  useNodeData,
} from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, TextComponentStyle } from '@/types';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { useComponentCanvasDimensions } from '@/lib/compass-planes/canvas/editor-item-layout-context';
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
  const css = useComponentStyles(component) as TextComponentStyle;
  const characterContext = useContext(CharacterContext);
  const { width: cw, height: ch } = useComponentCanvasDimensions(component);

  const handleChange = (value: string | number) => {
    if (!characterContext) return;

    if (data.characterAttributeId) {
      characterContext.updateCharacterAttribute(data.characterAttributeId, {
        value,
      });
    } else {
      characterContext.updateCharacterComponentData(component.id, value);
    }
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

  return (
    <section style={sectionStyle} data-attribute-name={data.name}>
      {isMultiSelectList && !editMode ? (
        <>
          <button
            type='button'
            onClick={openMultiSelectDialog}
            style={inputStyle}
            className='cursor-pointer text-left'>
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
          disabled={editMode}
          onChange={(e) => handleChange(e.target.value)}
          value={data.value.toString()}
          style={inputStyle}>
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
          disabled={editMode}
          placeholder={data?.placeholder ?? data?.name ?? data.type}
          value={Number(data.value)}
          onChange={(value) => handleChange(value)}
          style={inputStyle}
          inputMin={data.min}
          inputMax={data.max}
        />
      ) : (
        <input
          className='editor-input'
          type='text'
          disabled={editMode}
          placeholder={data?.placeholder ?? data?.name ?? data.type}
          onChange={(e) => handleChange(e.target.value)}
          value={editMode ? undefined : data.value.toString()}
          style={inputStyle}
          min={data.min}
          max={data.max}
        />
      )}
    </section>
  );
};

export const ViewInputNode = memo(
  ViewInputNodeComponent,
  (prev, next) => prev.component === next.component && prev.editMode === next.editMode,
);
