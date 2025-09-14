import { Button, Input, Stack, Text } from '@/components';
import { useCurrentUser } from '@/lib/compass-api';
import { useNotifications } from '@/stores';
import { useState } from 'react';

interface SignUpFormProps {
  title?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const SignUpForm = ({ title, style, disabled = false }: SignUpFormProps) => {
  const { addNotification } = useNotifications();
  const { setCurrentUser, loading } = useCurrentUser();

  const [username, setUsername] = useState<string>();

  const handleLogin = async () => {
    try {
      if (!username) {
        addNotification({
          message: 'Must enter username',
          status: 'error',
        });
        return;
      }

      setCurrentUser(username);
    } catch (e: any) {
      addNotification({
        status: 'error',
        message: e.message.length <= 200 ? e.message : 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <Stack
      data-testid='sign-up-form'
      style={{ minWidth: '350px', ...style }}
      alignItems='center'
      justifyContent='center'
      gap={6}>
      {title && <Text variant='h3'>{title}</Text>}
      <Input
        disabled={disabled}
        placeholder='Username'
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Button loading={loading} disabled={disabled} onClick={handleLogin}>
        Submit
      </Button>
    </Stack>
  );
};
