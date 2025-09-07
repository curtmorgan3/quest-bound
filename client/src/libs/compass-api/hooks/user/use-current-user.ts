import { debugLog } from '@/libs/compass-web-utils';
import { UserContext } from '@/stores/user-context';
import { useContext, useRef } from 'react';
import { useError } from '../metrics';

const debug = debugLog('API', 'useCurrentUser');

export const useCurrentUser = (pollInterval = 0) => {
  const { currentUser, setCurrentUser } = useContext(UserContext);
  const attemptedLogin = useRef<boolean>(false);

  // const { data, loading, error } = useQuery<CurrentUserQuery>(currentUser, {
  //   skip: !token || attemptedLogin.current,
  //   pollInterval,
  // });

  // useEffect(() => {
  //   if (error) {
  //     attemptedLogin.current = true;
  //   }
  // }, [data, error]);

  useError({
    error: undefined,
    message: 'Unable to get current user. Please try again.',
    status: 'error',
  });

  const revokeCurrentUser = () => {
    // client.resetStore();
    // localStorage.removeItem("questbound-user-id");
  };

  return {
    currentUser: null,
    setCurrentUser,
    isCreator: false,
    error: null,
    maxPlayers: 20,
    revokeCurrentUser,
    loading: false,
  };
};
