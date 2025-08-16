import { Stack } from '@/libs/compass-core-ui';
import React from 'react';
import { JoinDiscord } from './join-discord';

interface SocialLinksProps {
  style?: React.CSSProperties;
}

export const SocialLinks = ({ style }: SocialLinksProps) => (
  <Stack direction='row' sx={{ justifyContent: 'center', width: '80px', ...style }}>
    <JoinDiscord iconButton />
  </Stack>
);
