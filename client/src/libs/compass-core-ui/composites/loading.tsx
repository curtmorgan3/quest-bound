import { AnimatedMonogram } from '../animations';
import { Stack } from '../components';

export const Loading = (): JSX.Element => {
  return (
    <Stack height='80vh' width='100%' alignItems='center' justifyContent='center'>
      <AnimatedMonogram />
    </Stack>
  );
};
