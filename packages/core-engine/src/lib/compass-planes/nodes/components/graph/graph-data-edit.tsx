import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/composites';
import { AttributeLookup, useAssets, useAttributes } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import { db, deleteAssetIfUnreferenced } from '@/stores';
import type { Component, GraphComponentData, GraphVariant } from '@/types';
import { getNumberAttributeSchemaBindingOptions } from '@/utils/attribute-value-binding';
import { parseEntityCustomPropertiesJson } from '@/utils/parse-entity-custom-properties-json';
import { useEffect, useMemo } from 'react';

const GRAPH_ATTR_CUSTOM_PROPERTY_NONE = '__none__';

interface GraphDataEditProps {
  components: Array<Component>;
  updateComponents: (updates: Array<{ id: string; data: string }>) => Promise<void>;
}

const VARIANTS: { value: GraphVariant; label: string }[] = [
  { value: 'horizontal-linear', label: 'Horizontal linear' },
  { value: 'vertical-linear', label: 'Vertical linear' },
  { value: 'circular', label: 'Circular' },
];

export const GraphDataEdit = ({ components, updateComponents }: GraphDataEditProps) => {
  const editableComponents = components.filter((c) => !c.locked);
  const first = editableComponents[0];
  const rulesetId = first?.rulesetId ?? null;
  const { assets } = useAssets(rulesetId ?? undefined);
  const { attributes } = useAttributes();
  const firstData = first ? (getComponentData(first) as GraphComponentData) : null;

  const numeratorAttr = useMemo(
    () =>
      firstData?.numeratorAttributeId
        ? attributes.find((a) => a.id === firstData.numeratorAttributeId)
        : undefined,
    [attributes, firstData?.numeratorAttributeId],
  );
  const denominatorAttr = useMemo(
    () =>
      firstData?.denominatorAttributeId
        ? attributes.find((a) => a.id === firstData.denominatorAttributeId)
        : undefined,
    [attributes, firstData?.denominatorAttributeId],
  );

  const numeratorNumberCustomDefs = useMemo(
    () =>
      numeratorAttr
        ? parseEntityCustomPropertiesJson(numeratorAttr.customProperties).filter(
            (d) => d.type === 'number',
          )
        : [],
    [numeratorAttr],
  );
  const denominatorNumberCustomDefs = useMemo(
    () =>
      denominatorAttr
        ? parseEntityCustomPropertiesJson(denominatorAttr.customProperties).filter(
            (d) => d.type === 'number',
          )
        : [],
    [denominatorAttr],
  );

  const numeratorSchemaBindingOpts = useMemo(
    () => getNumberAttributeSchemaBindingOptions(numeratorAttr),
    [numeratorAttr],
  );
  const denominatorSchemaBindingOpts = useMemo(
    () => getNumberAttributeSchemaBindingOptions(denominatorAttr),
    [denominatorAttr],
  );

  const numeratorBindingSelectValue = useMemo(() => {
    const storedId = firstData?.numeratorAttributeCustomPropertyId;
    if (!storedId) return GRAPH_ATTR_CUSTOM_PROPERTY_NONE;
    const isValidBindingId = (id: string) =>
      numeratorNumberCustomDefs.some((d) => d.id === id) ||
      numeratorSchemaBindingOpts.some((o) => o.id === id);
    return isValidBindingId(storedId) ? storedId : GRAPH_ATTR_CUSTOM_PROPERTY_NONE;
  }, [
    firstData?.numeratorAttributeCustomPropertyId,
    numeratorNumberCustomDefs,
    numeratorSchemaBindingOpts,
  ]);

  const denominatorBindingSelectValue = useMemo(() => {
    const storedId = firstData?.denominatorAttributeCustomPropertyId;
    if (!storedId) return GRAPH_ATTR_CUSTOM_PROPERTY_NONE;
    const isValidBindingId = (id: string) =>
      denominatorNumberCustomDefs.some((d) => d.id === id) ||
      denominatorSchemaBindingOpts.some((o) => o.id === id);
    return isValidBindingId(storedId) ? storedId : GRAPH_ATTR_CUSTOM_PROPERTY_NONE;
  }, [
    firstData?.denominatorAttributeCustomPropertyId,
    denominatorNumberCustomDefs,
    denominatorSchemaBindingOpts,
  ]);

  const fillAsset =
    firstData?.assetId != null ? assets.find((a) => a.id === firstData.assetId) : undefined;
  const fillPreviewUrl =
    fillAsset?.data && (fillAsset.type === 'url' || fillAsset.type.startsWith('image/'))
      ? fillAsset.data
      : firstData?.assetUrl ?? undefined;

  useEffect(() => {
    if (!firstData?.assetId) return;
    const asset = assets.find((a) => a.id === firstData.assetId);
    const url =
      asset?.data && (asset.type === 'url' || asset.type.startsWith('image/'))
        ? asset.data
        : undefined;
    if (!url || url === firstData.assetUrl) return;
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { assetUrl: url }),
    }));
    void updateComponents(updates).then(() =>
      fireExternalComponentChangeEvent({ updates: updates as any }),
    );
  }, [firstData?.assetId, firstData?.assetUrl, assets, editableComponents, updateComponents]);

  const setNumeratorAttributeId = (attributeId: string | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, {
        numeratorAttributeId: attributeId,
        numeratorAttributeCustomPropertyId: undefined,
      }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setDenominatorAttributeId = (attributeId: string | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, {
        denominatorAttributeId: attributeId,
        denominatorAttributeCustomPropertyId: undefined,
      }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setNumeratorCustomPropertyId = (propertyId: string | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, {
        numeratorAttributeCustomPropertyId: propertyId ?? undefined,
      }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setDenominatorCustomPropertyId = (propertyId: string | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, {
        denominatorAttributeCustomPropertyId: propertyId ?? undefined,
      }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setDenominatorValue = (value: number | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { denominatorValue: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setGraphVariant = (value: GraphVariant) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { graphVariant: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setInverseFill = (inverseFill: boolean) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { inverseFill }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setAnimationDebounceSeconds = (seconds: number) => {
    const value = Math.max(0, Number(seconds));
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { animationDebounceSeconds: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setSegmentIndex = (value: number | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { segmentIndex: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setSegmentCount = (value: number | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { segmentCount: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setFillAssetId = async (assetId: string) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { assetId, assetUrl: undefined }),
    }));
    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const clearFillAsset = async () => {
    const assetIdsToMaybeDelete = new Set<string>();
    editableComponents.forEach((c) => {
      const d = getComponentData(c) as GraphComponentData;
      if (d.assetId) assetIdsToMaybeDelete.add(d.assetId);
    });
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { assetId: undefined, assetUrl: undefined }),
    }));
    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
    for (const id of assetIdsToMaybeDelete) {
      await deleteAssetIfUnreferenced(db, id);
    }
  };

  if (editableComponents.length === 0) return null;

  return (
    <div className='flex flex-col gap-3 pb-2 border-b border-border'>
      <div className='flex flex-col gap-2'>
        <Label>Graph style</Label>
        <Select
          value={firstData?.graphVariant ?? 'horizontal-linear'}
          onValueChange={(v) => setGraphVariant(v as GraphVariant)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VARIANTS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className='flex items-center gap-2'>
          <Checkbox
            id='graph-inverse-fill'
            checked={firstData?.inverseFill ?? false}
            onCheckedChange={(checked) => setInverseFill(checked === true)}
          />
          <Label htmlFor='graph-inverse-fill' className='text-sm font-normal cursor-pointer'>
            Invert fill
          </Label>
        </div>
        <div className='flex flex-col gap-2'>
          <Label className='text-xs text-muted-foreground'>Fill image (optional)</Label>
          <p className='text-xs text-muted-foreground'>
            When set, replaces the fill color or gradient. Leave empty to use sheet styling.
          </p>
          <ImageUpload
            image={fillPreviewUrl}
            alt={firstData?.assetId ? 'Graph fill' : ''}
            rulesetId={rulesetId ?? undefined}
            onUpload={(id) => void setFillAssetId(id)}
            onRemove={() => void clearFillAsset()}
          />
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='graph-animation-debounce'>Animation delay (seconds)</Label>
        <Input
          id='graph-animation-debounce'
          type='number'
          min={0}
          step={0.1}
          value={
            typeof firstData?.animationDebounceSeconds === 'number'
              ? firstData.animationDebounceSeconds
              : 0.15
          }
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) setAnimationDebounceSeconds(v);
          }}
          className='h-9'
        />
      </div>
      <AttributeLookup
        label='Numerator (number)'
        value={firstData?.numeratorAttributeId ?? null}
        onSelect={(attr) => setNumeratorAttributeId(attr.id)}
        onDelete={() => setNumeratorAttributeId(null)}
        filterType='number'
      />
      {firstData?.numeratorAttributeId &&
      (numeratorNumberCustomDefs.length > 0 || numeratorSchemaBindingOpts.length > 0) ? (
        <div className='flex flex-col gap-2'>
          <Label
            htmlFor='graph-numerator-custom-property'
            className='text-xs text-muted-foreground'>
            Custom property (optional)
          </Label>
          <Select
            value={numeratorBindingSelectValue}
            onValueChange={(v) =>
              setNumeratorCustomPropertyId(
                v === GRAPH_ATTR_CUSTOM_PROPERTY_NONE ? null : v,
              )
            }>
            <SelectTrigger id='graph-numerator-custom-property' className='h-8'>
              <SelectValue placeholder='Use main attribute value' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GRAPH_ATTR_CUSTOM_PROPERTY_NONE}>
                None (main attribute value)
              </SelectItem>
              {numeratorNumberCustomDefs.map((def) => (
                <SelectItem key={def.id} value={def.id}>
                  {def.name}
                </SelectItem>
              ))}
              {numeratorSchemaBindingOpts.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <AttributeLookup
        label='Denominator (number attribute)'
        value={firstData?.denominatorAttributeId ?? null}
        onSelect={(attr) => setDenominatorAttributeId(attr.id)}
        onDelete={() => setDenominatorAttributeId(null)}
        filterType='number'
      />
      {firstData?.denominatorAttributeId &&
      (denominatorNumberCustomDefs.length > 0 || denominatorSchemaBindingOpts.length > 0) ? (
        <div className='flex flex-col gap-2'>
          <Label
            htmlFor='graph-denominator-custom-property'
            className='text-xs text-muted-foreground'>
            Custom property (optional)
          </Label>
          <Select
            value={denominatorBindingSelectValue}
            onValueChange={(v) =>
              setDenominatorCustomPropertyId(
                v === GRAPH_ATTR_CUSTOM_PROPERTY_NONE ? null : v,
              )
            }>
            <SelectTrigger id='graph-denominator-custom-property' className='h-8'>
              <SelectValue placeholder='Use main attribute value' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GRAPH_ATTR_CUSTOM_PROPERTY_NONE}>
                None (main attribute value)
              </SelectItem>
              {denominatorNumberCustomDefs.map((def) => (
                <SelectItem key={def.id} value={def.id}>
                  {def.name}
                </SelectItem>
              ))}
              {denominatorSchemaBindingOpts.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className='flex flex-col gap-2'>
        <Label htmlFor='graph-denominator-value' className='text-xs text-muted-foreground'>
          Denominator (fixed value when no attribute)
        </Label>
        <Input
          id='graph-denominator-value'
          type='number'
          min={0}
          step={1}
          placeholder='e.g. 100'
          value={firstData?.denominatorValue != null ? String(firstData.denominatorValue) : ''}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (raw === '') {
              setDenominatorValue(null);
              return;
            }
            const v = parseFloat(raw);
            if (!Number.isNaN(v) && v >= 0) setDenominatorValue(v);
          }}
          className='h-[20px] rounded-[4px] p-1'
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label className='text-xs text-muted-foreground'>
          Segment (for multiple components as one graph)
        </Label>
        <div className='flex gap-2 items-center'>
          <div className='flex flex-col gap-1 flex-1'>
            <Label htmlFor='graph-segment-index' className='text-xs text-muted-foreground'>
              Index
            </Label>
            <Input
              id='graph-segment-index'
              type='number'
              min={1}
              step={1}
              placeholder='1'
              value={firstData?.segmentIndex != null ? String(firstData.segmentIndex) : ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw === '') {
                  setSegmentIndex(null);
                  return;
                }
                const v = parseInt(raw, 10);
                if (!Number.isNaN(v) && v >= 1) setSegmentIndex(v);
              }}
              className='h-[20px] rounded-[4px] p-1'
            />
          </div>
          <span className='text-muted-foreground pt-5 text-xs'>of</span>
          <div className='flex flex-col gap-1 flex-1'>
            <Label htmlFor='graph-segment-count' className='text-xs text-muted-foreground'>
              Total
            </Label>
            <Input
              id='graph-segment-count'
              type='number'
              min={1}
              step={1}
              placeholder='1'
              value={firstData?.segmentCount != null ? String(firstData.segmentCount) : ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw === '') {
                  setSegmentCount(null);
                  return;
                }
                const v = parseInt(raw, 10);
                if (!Number.isNaN(v) && v >= 1) setSegmentCount(v);
              }}
              className='h-[20px] rounded-[4px] p-1'
            />
          </div>
        </div>
      </div>
    </div>
  );
};
