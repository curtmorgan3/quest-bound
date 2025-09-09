import { Stack } from '@/components';
import { JoinDiscord } from './join-discord';

interface SocialLinksProps {
  style?: React.CSSProperties;
}

export const SocialLinks = ({ style }: SocialLinksProps) => (
  <Stack direction='row' justifyContent='center' width='80px' style={style}>
    <JoinDiscord iconButton />
  </Stack>
);
