import { Stack } from '@/components';
import { AnimatedLogo } from '../animations';

export const Loading = () => {
  return (
    <Stack style={{ height: '100dvh', width: '100%' }} alignItems='center' justifyContent='center'>
      <AnimatedLogo />
    </Stack>
  );
};
