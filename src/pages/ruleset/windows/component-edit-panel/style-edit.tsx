import { RulesetColorPicker } from '@/components';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ComponentTypes } from '@/lib/compass-planes/nodes';
import type { Component } from '@/types';
import { SquareRoundCorner } from 'lucide-react';
import { useState } from 'react';
import { type RGBColor } from 'react-color';
import { EditPanelInput } from './component-edit-panel-input';
import { GroupStyleEdit } from './group-style-edit';
import { useStyleValues } from './use-style-values';
import { parseValue } from './utils';

interface Props {
  components: Array<Component>;
  handleUpdate: (
    key: string | string[],
    value: number | string | boolean | null | RGBColor,
  ) => void;
  /** Required for group layout mode (`data`); omit only if group block is unused. */
  handleDataUpdate?: (key: string, value: string) => void;
}

const MIXED_VALUE_LABEL = '-';

function toOpacityNumber(raw: string | number | undefined): number {
  if (raw === '-' || raw === undefined) return 1;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
}

export const StyleEdit = ({ components, handleUpdate, handleDataUpdate }: Props) => {
  const style = useStyleValues(components);
  const opacity = style.opacity.raw;
  const backgroundColor = style.backgroundColor.raw as string;
  const backgroundColorResolved = style.backgroundColor.resolved as string;
  const color = style.color.raw as string;
  const colorResolved = style.color.resolved as string;
  const backgroundColorCustomPropOpacity = toOpacityNumber(
    style.backgroundColorCustomPropOpacity?.raw ?? 1,
  );
  const colorCustomPropOpacity = toOpacityNumber(style.colorCustomPropOpacity?.raw ?? 1);
  const outlineColorCustomPropOpacity = toOpacityNumber(
    style.outlineColorCustomPropOpacity?.raw ?? 1,
  );
  const borderRadiusTopLeft = style.borderRadiusTopLeft.raw;
  const borderRadiusTopRight = style.borderRadiusTopRight.raw;
  const borderRadiusBottomLeft = style.borderRadiusBottomLeft.raw;
  const borderRadiusBottomRight = style.borderRadiusBottomRight.raw;
  const outlineWidth = style.outlineWidth.raw;
  const outlineColor = style.outlineColor.raw as string;
  const outlineColorResolved = style.outlineColor.resolved as string;
  const paddingTop = style.paddingTop.raw;
  const paddingRight = style.paddingRight.raw;
  const paddingBottom = style.paddingBottom.raw;
  const paddingLeft = style.paddingLeft.raw;

  // Check if all corners have the same value
  const allCornersEqual =
    borderRadiusTopLeft !== MIXED_VALUE_LABEL &&
    borderRadiusTopRight !== MIXED_VALUE_LABEL &&
    borderRadiusBottomLeft !== MIXED_VALUE_LABEL &&
    borderRadiusBottomRight !== MIXED_VALUE_LABEL &&
    borderRadiusTopLeft === borderRadiusTopRight &&
    borderRadiusTopRight === borderRadiusBottomLeft &&
    borderRadiusBottomLeft === borderRadiusBottomRight;

  const borderRadiusAll = allCornersEqual ? borderRadiusTopLeft : MIXED_VALUE_LABEL;

  const allPaddingsEqual =
    paddingTop !== MIXED_VALUE_LABEL &&
    paddingRight !== MIXED_VALUE_LABEL &&
    paddingBottom !== MIXED_VALUE_LABEL &&
    paddingLeft !== MIXED_VALUE_LABEL &&
    paddingTop === paddingRight &&
    paddingRight === paddingBottom &&
    paddingBottom === paddingLeft;

  const paddingAll = allPaddingsEqual ? paddingTop : MIXED_VALUE_LABEL;

  const [isCornersOpen, setIsCornersOpen] = useState(false);
  const [isPaddingsOpen, setIsPaddingsOpen] = useState(false);

  const singleSelectedGroup =
    components.length === 1 &&
    components[0].type === ComponentTypes.GROUP &&
    Boolean(handleDataUpdate);

  const allowGradient =
    components.length > 0 &&
    components.every(
      (c) => c.type === ComponentTypes.GRAPH || c.type === ComponentTypes.SHAPE,
    );

  const handleAllCornersChange = (val: string | number) => {
    const parsedVal = Math.min(200, Math.max(0, parseValue(val)));
    handleUpdate(
      [
        'borderRadiusTopLeft',
        'borderRadiusTopRight',
        'borderRadiusBottomLeft',
        'borderRadiusBottomRight',
      ],
      parsedVal,
    );
  };

  const handleAllPaddingsChange = (val: string | number) => {
    const parsedVal = Math.min(200, Math.max(0, parseValue(val)));
    handleUpdate(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'], parsedVal);
  };

  return (
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
      <p className='text-sm'>Style</p>

      {singleSelectedGroup && handleDataUpdate ? (
        <GroupStyleEdit
          component={components[0]}
          handleStyleUpdate={(key, value) => handleUpdate(key, value)}
          handleDataUpdate={handleDataUpdate}
        />
      ) : null}

      <div className='w-full flex flex-row gap-4 items-end flex-wrap'>
        <EditPanelInput
          number={opacity !== MIXED_VALUE_LABEL}
          disabled={opacity === MIXED_VALUE_LABEL}
          label='Opacity'
          width='80px'
          value={opacity}
          styleKeyForCustomProperty='opacity'
          step={0.1}
          onChange={(val) => handleUpdate('opacity', Math.min(1, Math.max(0, parseValue(val))))}
        />
        <RulesetColorPicker
          key='backgroundColor'
          showLabel
          label='Background Color'
          propertyKey='backgroundColor'
          color={backgroundColor}
          resolvedColor={backgroundColorResolved}
          onUpdate={(value) => handleUpdate('backgroundColor', value)}
          disabled={backgroundColor === MIXED_VALUE_LABEL}
          allowGradient={allowGradient}
          customPropOpacity={backgroundColorCustomPropOpacity}
          customPropOpacityStyleKey='backgroundColorCustomPropOpacity'
          onCustomPropOpacityChange={(styleKey, alpha) => handleUpdate(styleKey, alpha)}
        />

        <RulesetColorPicker
          key='color'
          showLabel
          label='Color'
          propertyKey='color'
          color={color}
          resolvedColor={colorResolved}
          onUpdate={(value) => handleUpdate('color', value)}
          disabled={color === MIXED_VALUE_LABEL}
          allowGradient={allowGradient}
          customPropOpacity={colorCustomPropOpacity}
          customPropOpacityStyleKey='colorCustomPropOpacity'
          onCustomPropOpacityChange={(styleKey, alpha) => handleUpdate(styleKey, alpha)}
        />
      </div>

      <Collapsible open={isCornersOpen} onOpenChange={setIsCornersOpen}>
        <div className='w-full flex flex-col gap-2'>
          <p className='text-xs text-muted-foreground'>Border</p>
          <div className='w-full flex flex-row gap-2 items-end flex-wrap'>
            <EditPanelInput
              number={outlineWidth !== MIXED_VALUE_LABEL}
              disabled={outlineWidth === MIXED_VALUE_LABEL}
              label='Width'
              value={outlineWidth}
              styleKeyForCustomProperty='outlineWidth'
              width='80px'
              step={1}
              onChange={(val) =>
                handleUpdate('outlineWidth', Math.min(50, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number={borderRadiusAll !== MIXED_VALUE_LABEL}
              disabled={borderRadiusAll === MIXED_VALUE_LABEL}
              label='Radius'
              width='80px'
              value={borderRadiusAll}
              step={1}
              onChange={handleAllCornersChange}
            />

            <div className='flex flex-row gap-2 items-end'>
              <CollapsibleTrigger
                title='Corner Border Radius'
                className='flex items-center justify-center h-[18px] w-[18px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer'>
                <SquareRoundCorner
                  className={`h-[18px] w-[18px] transition-transform ${isCornersOpen ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
            </div>

            <RulesetColorPicker
              key='outlineColor'
              label='Border Color'
              showLabel
              propertyKey='outlineColor'
              color={outlineColor}
              resolvedColor={outlineColorResolved}
              disabled={outlineColor === MIXED_VALUE_LABEL}
              onUpdate={(color) => handleUpdate('outlineColor', color)}
              customPropOpacity={outlineColorCustomPropOpacity}
              customPropOpacityStyleKey='outlineColorCustomPropOpacity'
              onCustomPropOpacityChange={(styleKey, alpha) => handleUpdate(styleKey, alpha)}
            />
          </div>
        </div>
        <CollapsibleContent className='pt-2'>
          <div className='w-full grid grid-cols-2 gap-2'>
            <EditPanelInput
              number={borderRadiusTopLeft !== MIXED_VALUE_LABEL}
              disabled={borderRadiusTopLeft === MIXED_VALUE_LABEL}
              label='Top Left'
              value={borderRadiusTopLeft}
              styleKeyForCustomProperty='borderRadiusTopLeft'
              step={1}
              onChange={(val) =>
                handleUpdate('borderRadiusTopLeft', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number={borderRadiusTopRight !== MIXED_VALUE_LABEL}
              disabled={borderRadiusTopRight === MIXED_VALUE_LABEL}
              label='Top Right'
              value={borderRadiusTopRight}
              styleKeyForCustomProperty='borderRadiusTopRight'
              step={1}
              onChange={(val) =>
                handleUpdate('borderRadiusTopRight', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number={borderRadiusBottomLeft !== MIXED_VALUE_LABEL}
              disabled={borderRadiusBottomLeft === MIXED_VALUE_LABEL}
              label='Bottom Left'
              styleKeyForCustomProperty='borderRadiusBottomLeft'
              value={borderRadiusBottomLeft}
              step={1}
              onChange={(val) =>
                handleUpdate('borderRadiusBottomLeft', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number={borderRadiusBottomRight !== MIXED_VALUE_LABEL}
              disabled={borderRadiusBottomRight === MIXED_VALUE_LABEL}
              label='Bottom Right'
              styleKeyForCustomProperty='borderRadiusBottomRight'
              value={borderRadiusBottomRight}
              step={1}
              onChange={(val) =>
                handleUpdate('borderRadiusBottomRight', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={isPaddingsOpen} onOpenChange={setIsPaddingsOpen}>
        <div className='w-full flex flex-col gap-2'>
          <p className='text-xs text-muted-foreground'>Padding</p>
          <div className='w-full flex flex-row gap-2 items-end'>
            <EditPanelInput
              number={paddingAll !== MIXED_VALUE_LABEL}
              disabled={paddingAll === MIXED_VALUE_LABEL}
              label='All'
              width='80px'
              value={paddingAll}
              step={1}
              onChange={handleAllPaddingsChange}
            />

            <div className='flex flex-row gap-2 items-end'>
              <CollapsibleTrigger
                title='Individual padding'
                className='flex items-center justify-center h-[18px] w-[18px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer'>
                <SquareRoundCorner
                  className={`h-[18px] w-[18px] transition-transform ${isPaddingsOpen ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
            </div>
          </div>
        </div>
        <CollapsibleContent className='pt-2'>
          <div className='w-full grid grid-cols-2 gap-2'>
            <EditPanelInput
              number={paddingTop !== MIXED_VALUE_LABEL}
              disabled={paddingTop === MIXED_VALUE_LABEL}
              styleKeyForCustomProperty='paddingTop'
              label='Top'
              value={paddingTop}
              step={1}
              onChange={(val) =>
                handleUpdate('paddingTop', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number={paddingRight !== MIXED_VALUE_LABEL}
              disabled={paddingRight === MIXED_VALUE_LABEL}
              label='Right'
              styleKeyForCustomProperty='paddingRight'
              value={paddingRight}
              step={1}
              onChange={(val) =>
                handleUpdate('paddingRight', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number={paddingBottom !== MIXED_VALUE_LABEL}
              disabled={paddingBottom === MIXED_VALUE_LABEL}
              label='Bottom'
              styleKeyForCustomProperty='paddingBottom'
              value={paddingBottom}
              step={1}
              onChange={(val) =>
                handleUpdate('paddingBottom', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number={paddingLeft !== MIXED_VALUE_LABEL}
              disabled={paddingLeft === MIXED_VALUE_LABEL}
              label='Left'
              styleKeyForCustomProperty='paddingLeft'
              value={paddingLeft}
              step={1}
              onChange={(val) =>
                handleUpdate('paddingLeft', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
