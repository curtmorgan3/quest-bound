import { RulesetColorPicker } from '@/components';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  handleDataUpdate?: (key: string, value: string | boolean) => void;
}

const MIXED_VALUE_LABEL = '-';
const MIXED_COLOR_PLACEHOLDER = '#000';

function toOpacityNumber(raw: string | number | undefined): number {
  if (raw === MIXED_VALUE_LABEL) return 0;
  if (raw === undefined) return 1;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
}

function displayNumeric(raw: string | number): string | number {
  return raw === MIXED_VALUE_LABEL ? 0 : raw;
}

function displayColorRaw(raw: string): string {
  return raw === MIXED_VALUE_LABEL ? MIXED_COLOR_PLACEHOLDER : raw;
}

function displayColorResolved(raw: string, resolved: string | number): string {
  return raw === MIXED_VALUE_LABEL ? MIXED_COLOR_PLACEHOLDER : String(resolved);
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
  const boxShadowOffsetX = style.boxShadowOffsetX.raw;
  const boxShadowOffsetY = style.boxShadowOffsetY.raw;
  const boxShadowBlur = style.boxShadowBlur.raw;
  const boxShadowSpread = style.boxShadowSpread.raw;
  const boxShadowColor = style.boxShadowColor.raw as string;
  const boxShadowColorResolved = style.boxShadowColor.resolved as string;
  const boxShadowColorCustomPropOpacity = toOpacityNumber(
    style.boxShadowColorCustomPropOpacity?.raw ?? 1,
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
    components.every((c) => c.type === ComponentTypes.GRAPH || c.type === ComponentTypes.SHAPE);

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
          number
          label='Opacity'
          width='80px'
          value={displayNumeric(opacity)}
          styleKeyForCustomProperty='opacity'
          step={0.1}
          onChange={(val) => handleUpdate('opacity', Math.min(1, Math.max(0, parseValue(val))))}
        />
        <RulesetColorPicker
          key='backgroundColor'
          showLabel
          label='Background Color'
          propertyKey='backgroundColor'
          color={displayColorRaw(backgroundColor)}
          resolvedColor={displayColorResolved(backgroundColor, backgroundColorResolved)}
          onUpdate={(value) => handleUpdate('backgroundColor', value)}
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
          color={displayColorRaw(color)}
          resolvedColor={displayColorResolved(color, colorResolved)}
          onUpdate={(value) => handleUpdate('color', value)}
          allowGradient={allowGradient}
          customPropOpacity={colorCustomPropOpacity}
          customPropOpacityStyleKey='colorCustomPropOpacity'
          onCustomPropOpacityChange={(styleKey, alpha) => handleUpdate(styleKey, alpha)}
        />
      </div>

      <Accordion type='single' collapsible>
        <AccordionItem value='drop-shadow' className='border-none'>
          <AccordionTrigger className='py-2 text-xs text-muted-foreground hover:no-underline hover:text-foreground'>
            Box shadow
          </AccordionTrigger>
          <AccordionContent className='flex flex-col gap-3 pb-2'>
            <div className='w-full flex flex-row gap-2 items-end flex-wrap'>
              <EditPanelInput
                number
                label='X'
                width='72px'
                value={displayNumeric(boxShadowOffsetX)}
                step={1}
                onChange={(val) =>
                  handleUpdate('boxShadowOffsetX', Math.min(50, Math.max(-50, parseValue(val))))
                }
              />
              <EditPanelInput
                number
                label='Y'
                width='72px'
                value={displayNumeric(boxShadowOffsetY)}
                step={1}
                onChange={(val) =>
                  handleUpdate('boxShadowOffsetY', Math.min(50, Math.max(-50, parseValue(val))))
                }
              />
              <EditPanelInput
                number
                label='Blur'
                width='72px'
                value={displayNumeric(boxShadowBlur)}
                step={1}
                onChange={(val) =>
                  handleUpdate('boxShadowBlur', Math.min(80, Math.max(0, parseValue(val))))
                }
              />
              <EditPanelInput
                number
                label='Spread'
                width='72px'
                value={displayNumeric(boxShadowSpread)}
                step={1}
                onChange={(val) =>
                  handleUpdate('boxShadowSpread', Math.min(40, Math.max(-40, parseValue(val))))
                }
              />
              <RulesetColorPicker
                key='boxShadowColor'
                showLabel
                label='Shadow color'
                propertyKey='boxShadowColor'
                color={displayColorRaw(boxShadowColor)}
                resolvedColor={displayColorResolved(boxShadowColor, boxShadowColorResolved)}
                onUpdate={(value) => handleUpdate('boxShadowColor', value)}
                customPropOpacity={boxShadowColorCustomPropOpacity}
                customPropOpacityStyleKey='boxShadowColorCustomPropOpacity'
                onCustomPropOpacityChange={(styleKey, alpha) => handleUpdate(styleKey, alpha)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Collapsible open={isCornersOpen} onOpenChange={setIsCornersOpen}>
        <div className='w-full flex flex-col gap-2'>
          <p className='text-xs text-muted-foreground'>Border</p>
          <div className='w-full flex flex-row gap-2 items-end flex-wrap'>
            <EditPanelInput
              number
              label='Width'
              value={displayNumeric(outlineWidth)}
              styleKeyForCustomProperty='outlineWidth'
              width='80px'
              step={1}
              onChange={(val) =>
                handleUpdate('outlineWidth', Math.min(50, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number
              label='Radius'
              width='80px'
              value={displayNumeric(borderRadiusAll)}
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
              color={displayColorRaw(outlineColor)}
              resolvedColor={displayColorResolved(outlineColor, outlineColorResolved)}
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
              number
              label='Top Left'
              value={displayNumeric(borderRadiusTopLeft)}
              styleKeyForCustomProperty='borderRadiusTopLeft'
              step={1}
              onChange={(val) =>
                handleUpdate('borderRadiusTopLeft', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number
              label='Top Right'
              value={displayNumeric(borderRadiusTopRight)}
              styleKeyForCustomProperty='borderRadiusTopRight'
              step={1}
              onChange={(val) =>
                handleUpdate('borderRadiusTopRight', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number
              label='Bottom Left'
              styleKeyForCustomProperty='borderRadiusBottomLeft'
              value={displayNumeric(borderRadiusBottomLeft)}
              step={1}
              onChange={(val) =>
                handleUpdate('borderRadiusBottomLeft', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number
              label='Bottom Right'
              styleKeyForCustomProperty='borderRadiusBottomRight'
              value={displayNumeric(borderRadiusBottomRight)}
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
              number
              label='All'
              width='80px'
              value={displayNumeric(paddingAll)}
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
              number
              styleKeyForCustomProperty='paddingTop'
              label='Top'
              value={displayNumeric(paddingTop)}
              step={1}
              onChange={(val) =>
                handleUpdate('paddingTop', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number
              label='Right'
              styleKeyForCustomProperty='paddingRight'
              value={displayNumeric(paddingRight)}
              step={1}
              onChange={(val) =>
                handleUpdate('paddingRight', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number
              label='Bottom'
              styleKeyForCustomProperty='paddingBottom'
              value={displayNumeric(paddingBottom)}
              step={1}
              onChange={(val) =>
                handleUpdate('paddingBottom', Math.min(200, Math.max(0, parseValue(val))))
              }
            />
            <EditPanelInput
              number
              label='Left'
              styleKeyForCustomProperty='paddingLeft'
              value={displayNumeric(paddingLeft)}
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
