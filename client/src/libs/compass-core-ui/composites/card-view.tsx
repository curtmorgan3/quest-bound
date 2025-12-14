import { Paper, Stack, Text } from '../components';

import type { JSX } from "react";

type CardItem = {
  label: string;
  createdAt?: string;
  onClick: () => void;
};

interface CardViewProps {
  items: CardItem[];
}

export const CardView = ({ items }: CardViewProps): JSX.Element => (
  <Stack direction='row'>
    {items.map((item, i) => (
      <Paper sx={{ bgcolor: 'water.main' }} className='clickable' key={i} onClick={item.onClick}>
        <Stack
          spacing={2}
          padding={2}
          justifyContent='center'
          alignItems='center'
          sx={{ minHeight: '100px' }}>
          <Text>{item.label}</Text>
          {item.createdAt && (
            <Text variant='subtitle2' sx={{ fontStyle: 'italic' }}>
              {item.createdAt}
            </Text>
          )}
        </Stack>
      </Paper>
    ))}
  </Stack>
);
