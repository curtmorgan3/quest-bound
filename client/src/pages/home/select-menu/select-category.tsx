import { useDeviceSize } from '@/libs/compass-core-ui';
import { Card, CardHeader, Heading, Stack } from '@chakra-ui/react';
import { AutoStories, DoubleArrow, PeopleAlt } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface Props {
  selection: string;
  setSelection: (selection: string) => void;
}

export const SelectCategory = ({ selection, setSelection }: Props) => {
  const { mobile } = useDeviceSize();
  const [expanded, setExpanded] = useState<boolean>(!mobile);

  const width = expanded ? 300 : 80;

  const options = ['Rulesets', 'Characters'];

  const renderIcon = (option: string) => {
    switch (option) {
      case 'Rulesets':
        return <AutoStories />;
      case 'Characters':
        return <PeopleAlt />;
    }
  };

  return (
    <motion.div
      initial={{ width, height: '100%', maxWidth: '90dvw' }}
      animate={{ width }}
      transition={{ duration: 0.5 }}>
      <Stack padding={2} spacing={4}>
        <Stack direction='row' width='100%' justifyContent='flex-end' alignItems='center'>
          <motion.span
            initial={{ transform: expanded ? 'rotate(180deg)' : undefined }}
            animate={{ transform: !expanded ? 'rotate(0deg)' : undefined }}>
            <IconButton onClick={() => setExpanded((prev) => !prev)}>
              <DoubleArrow />
            </IconButton>
          </motion.span>
        </Stack>
        {options.map((option) => (
          <Card
            key={option}
            variant='elevated'
            role='button'
            size='md'
            align='center'
            onClick={() => setSelection(option)}>
            <CardHeader>
              <motion.div
                initial={{
                  opacity: expanded ? 1 : 0,
                  display: expanded ? 'inherit' : 'none',
                }}
                animate={{
                  opacity: expanded ? 1 : 0,
                  display: expanded ? 'inherit' : 'none',
                }}>
                <Heading
                  fontFamily='CygnitoMonoPro'
                  size='md'
                  sx={{ userSelect: 'none' }}
                  color={option === selection ? 'secondary' : 'inherit'}>
                  {option}
                </Heading>
              </motion.div>
              <motion.div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: option === selection ? '#E66A3C' : 'inherit',
                }}
                initial={{ opacity: expanded ? 0 : 1, display: !expanded ? 'flex' : 'none' }}
                animate={{ opacity: expanded ? 0 : 1, display: !expanded ? 'flex' : 'none' }}>
                {renderIcon(option)}
              </motion.div>
            </CardHeader>
          </Card>
        ))}
      </Stack>
    </motion.div>
  );
};
