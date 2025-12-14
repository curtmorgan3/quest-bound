import { debugLog } from "@/libs/compass-web-utils";
import { useEffect, useRef } from "react";
import { currentUser, CurrentUserQuery, User, UserRole } from "../../gql";
import { useQuery } from "../../utils";
import { useError } from "../metrics";
import { useSessionToken } from "./use-session-token";
import { useApolloClient } from "@apollo/client/react";

const debug = debugLog("API", "useCurrentUser");

export const useCurrentUser = (pollInterval = 0) => {
  const client = useApolloClient();

  const { token } = useSessionToken();

  const attemptedLogin = useRef<boolean>(false);

  const { data, loading, error } = useQuery<CurrentUserQuery>(currentUser, {
    skip: !token || attemptedLogin.current,
    pollInterval,
  });

  useEffect(() => {
    if (error) {
      attemptedLogin.current = true;
    }
  }, [data, error]);

  useError({
    error,
    message: "Unable to get current user. Please try again.",
    status: "error",
  });

  const revokeCurrentUser = () => {
    client.resetStore();
    localStorage.removeItem("questbound-user-id");
  };

  return {
    currentUser: data?.currentUser ? data.currentUser as User : null,
    isCreator: data?.currentUser?.role === UserRole.CREATOR,
    error,
    maxPlayers: 20,
    revokeCurrentUser,
    loading,
  };
};
