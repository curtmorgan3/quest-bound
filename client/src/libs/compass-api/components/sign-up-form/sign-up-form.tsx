import { Button, Stack, Text } from '@/libs/compass-core-ui';
import { useNotifications } from '@/stores';
import { Input } from '@chakra-ui/react';
import { CSSProperties, useState } from 'react';
import { useCurrentUser } from '../../hooks';

interface SignUpFormProps {
  title?: string;
  style?: CSSProperties;
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
      sx={{ minWidth: '350px', ...style }}
      alignItems='center'
      justifyContent='center'
      spacing={2}>
      {title && <Text variant='h5'>{title}</Text>}
      <Input
        disabled={disabled}
        placeholder='Username'
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Button loading={loading} disabled={disabled} color='secondary' onClick={handleLogin}>
        Submit
      </Button>
    </Stack>
  );
};
