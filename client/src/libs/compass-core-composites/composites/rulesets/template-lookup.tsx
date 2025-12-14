import { Sheet, TemplateType, usePageTemplates, useSheetTemplates } from '@/libs/compass-api';
import { AutoComplete, AutoCompleteOption } from '@/libs/compass-core-ui';
import { Input, Stack, Text } from '@chakra-ui/react';
import React, { type JSX } from 'react';
import { Img } from '../image-gallery';

interface Props {
  rulesetId: string;
  type?: TemplateType;
  templateId?: string;
  loading?: boolean;
  published?: boolean;
  label?: string;
  style?: React.CSSProperties;
  onSelect?: (template: Sheet | null) => void;
  filterIds?: string[];
  disabled?: boolean;
}

export const TemplateLookup = ({
  rulesetId,
  type = TemplateType.SHEET,
  published,
  label,
  templateId,
  style,
  onSelect,
  loading: externalLoading,
  filterIds = [],
  disabled = false,
}: Props): JSX.Element => {
  const { sheets: sheetTemplates, loading: loadingTemplates } = useSheetTemplates(rulesetId);
  const { pages: pageTemplates, loading: pagesLoading } = usePageTemplates();

  const loading = loadingTemplates || pagesLoading || externalLoading;

  const templates = type === TemplateType.SHEET ? sheetTemplates : pageTemplates;

  const options = templates
    .filter((t) => !filterIds?.includes(t.id))
    .map((template) => ({
      label: template.title,
      value: template.id,
      image: template.image?.src ?? '',
    }));

  const selectedOption = options.find((opt) => opt.value === templateId) ?? null;

  const handleSelect = (option: AutoCompleteOption | null) => {
    const selected = option ? templates.find((attr) => attr.id === option.value) : null;

    onSelect?.(selected ?? null);
  };

  return (
    <AutoComplete
      sx={{ width: 200, ...style }}
      loading={loading}
      disablePortal
      options={options}
      disabled={disabled}
      value={selectedOption}
      isOptionEqualToValue={(option, value) => option.value === value.value}
      noOptionsText='No Templates Found'
      onChange={(_, option) => handleSelect(option)}
      renderInput={(params) => (
        <div ref={params.InputProps.ref}>
          <Input {...params.inputProps} size='sm' placeholder='Search Templates' />
        </div>
      )}
      renderOption={(props, option) => (
        <li {...props}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Img src={option.image} style={{ height: 24, width: 24 }} />
            <Text fontSize='0.9rem'>{option.label}</Text>
          </Stack>
        </li>
      )}
    />
  );
};
