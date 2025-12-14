import { ContextualAttribute, SheetComponent } from '@/libs/compass-api';
import { IconButton, Image, Stack, Text, Tooltip } from '@chakra-ui/react';
import { CheckBox, CheckBoxOutlineBlank, Refresh } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { CSSProperties, type JSX } from 'react';

type CheckboxProps = {
  src?: string;
  onChange?: (value: Partial<SheetComponent>) => void;
  style?: CSSProperties;
  iconStyle?: CSSProperties;
  defaultCheckedIcon?: JSX.Element;
  defaultUncheckedIcon?: JSX.Element;
};

interface BooleanAttributeNodeProps {
  renderedAttributeValue: number | string | null;
  handleChange: (id: string, value: string) => void;
  checkboxProps?: CheckboxProps;
  ignoreLabel?: boolean;
  attribute: ContextualAttribute;
  attributeDescription?: string | null;
  reenableLogic: () => void;
}

export function BooleanAttributeNode({
  renderedAttributeValue,
  handleChange,
  checkboxProps,
  ignoreLabel,
  attribute,
  attributeDescription,
  reenableLogic,
}: BooleanAttributeNodeProps) {
  return (
    <Tooltip label={attributeDescription} placement='right' openDelay={1000}>
      <Stack>
        <motion.div
          key={renderedAttributeValue}
          className='clickable'
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={
            checkboxProps?.onChange
              ? checkboxProps.onChange
              : () =>
                  handleChange(attribute.id, renderedAttributeValue === 'false' ? 'true' : 'false')
          }
          transition={{ duration: 0.25, type: 'spring' }}>
          <Stack direction='row' spacing={1}>
            <Image
              className='clickable'
              src={checkboxProps?.src}
              sx={checkboxProps?.style}
              fallback={
                <Fallback
                  renderedAttributeValue={renderedAttributeValue}
                  checkboxProps={checkboxProps}
                />
              }
            />

            {!ignoreLabel && <Text>{attribute.name}</Text>}
            {attribute.logicDisabled && (
              <Tooltip
                label={
                  <Text>
                    This attribute has been manually changed. Click to re-enable its automated
                    logic.
                  </Text>
                }>
                <IconButton variant='ghost' aria-label='Reenable logic' onClick={reenableLogic}>
                  <Refresh fontSize='small' />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </motion.div>
      </Stack>
    </Tooltip>
  );
}

const Fallback = ({
  renderedAttributeValue,
  checkboxProps,
}: {
  renderedAttributeValue: string | number | null;
  checkboxProps?: CheckboxProps;
}) =>
  renderedAttributeValue === 'true'
    ? checkboxProps?.defaultCheckedIcon ?? (
        <CheckBox
          sx={{
            color: 'common.white',
            height: 'unset',
            ...checkboxProps?.iconStyle,
          }}
        />
      )
    : checkboxProps?.defaultUncheckedIcon ?? (
        <CheckBoxOutlineBlank
          sx={{
            color: 'common.white',
            height: 'unset',
            ...checkboxProps?.iconStyle,
          }}
        />
      );
