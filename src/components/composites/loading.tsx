import { Stack } from '@/components';
import { AnimatedLogo } from '../animations';

export const Loading = () => {
  return (
    <Stack height='80vh' width='100%' alignItems='center' justifyContent='center'>
      <AnimatedLogo />
    </Stack>
  );
};
