import { Button, Stack, Text } from '@/components';

interface ErrorPageProps {
  type?: '500' | '404';
}

const Uncaught = () => {
  return (
    <Stack alignItems='center' gap={6} style={{ height: '100%' }}>
      <Stack alignItems='center' gap={2}>
        <Text variant='h1' style={{ textAlign: 'center' }}>
          Something needs to be fixed
        </Text>
        <Text>This error is unexpected</Text>
      </Stack>
      <Button
        onClick={() =>
          (window.location.href = window.location.href.replace(window.location.pathname, ''))
        }
        color='info'>
        Return Home
      </Button>
    </Stack>
  );
};

export const NotFound = () => {
  return (
    <Stack alignItems='center' gap={6} style={{ height: '100%' }}>
      <Stack alignItems='center' gap={2}>
        <Text variant='h1' style={{ textAlign: 'center' }}>
          This page does not exist
        </Text>
      </Stack>
      <Button
        onClick={() =>
          (window.location.href = window.location.href.replace(window.location.pathname, ''))
        }
        color='info'>
        Return Home
      </Button>
    </Stack>
  );
};

export const ErrorPage = ({ type }: ErrorPageProps) =>
  type === '404' ? <NotFound /> : <Uncaught />;
