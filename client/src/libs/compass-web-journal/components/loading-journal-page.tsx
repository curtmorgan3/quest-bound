import { Skeleton, Stack } from '@/libs/compass-core-ui';

import type { JSX } from "react";

export const LoadingJournalPage = (): JSX.Element => {
  return (
    <Stack spacing={4} sx={{ padding: 4 }}>
      <Skeleton height='200px' width='25%' />

      <Skeleton height='5px' width='100%' />

      <Stack sx={{ width: '300px' }}>
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </Stack>
      <Skeleton height='400px' width='50%' />
    </Stack>
  );
};
