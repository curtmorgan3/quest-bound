import { Button, Stack, Text } from '../components';
import { useDeviceSize } from '../hooks/use-device-size';

import type { JSX } from "react";

const NotFoundImage = 'https://quest-bound-web-assets.s3.us-west-2.amazonaws.com/not-found.png';
const UncaughtImage = 'https://quest-bound-web-assets.s3.us-west-2.amazonaws.com/broken.png';

interface ErrorPageProps {
  type?: '500' | '404';
}

const Uncaught = () => {
  const { mobile } = useDeviceSize();
  return (
    <Stack sx={{ height: '100%' }} alignItems='center' spacing={6}>
      <Stack alignItems='center' spacing={2}>
        <Text variant='h3' sx={{ textAlign: 'center' }}>
          Something needs to be fixed
        </Text>
        <Text>This error is unexpected</Text>
      </Stack>
      <img
        style={{ borderRadius: '8px', width: mobile ? '80%' : '50%' }}
        src={UncaughtImage}
        alt='A dedicated mechanic'
      />
      <Button
        onClick={() =>
          (window.location.href = window.location.href.replace(window.location.pathname, ''))
        }
        variant='contained'
        color='info'>
        Return Home
      </Button>
    </Stack>
  );
};

export const NotFound = () => {
  const { mobile } = useDeviceSize();

  return (
    <Stack alignItems='center' spacing={6} sx={{ pt: '70px' }}>
      <Stack alignItems='center' spacing={2}>
        <Text variant='h3' sx={{ textAlign: 'center' }}>
          This page does not exist
        </Text>
      </Stack>
      <img
        style={{ borderRadius: '8px', width: mobile ? '80%' : '50%' }}
        src={NotFoundImage}
        alt='A lost traveler'
      />
      <Button
        onClick={() =>
          (window.location.href = window.location.href.replace(window.location.pathname, ''))
        }
        variant='contained'
        color='info'>
        Return Home
      </Button>
    </Stack>
  );
};

export const ErrorPage = ({ type }: ErrorPageProps): JSX.Element =>
  type === '404' ? <NotFound /> : <Uncaught />;
