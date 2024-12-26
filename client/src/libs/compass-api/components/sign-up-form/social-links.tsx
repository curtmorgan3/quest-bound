import { Stack } from '@/libs/compass-core-ui';
import React from 'react';
import { FollowInstagram } from './follow-instagram';
import { JoinDiscord } from './join-discord';

interface SocialLinksProps {
  style?: React.CSSProperties;
}

export const SocialLinks = ({ style }: SocialLinksProps) => (
  <Stack direction='row' sx={{ justifyContent: 'space-between', width: '80px', ...style }}>
    <JoinDiscord iconButton />
    <FollowInstagram iconButton />
  </Stack>
);