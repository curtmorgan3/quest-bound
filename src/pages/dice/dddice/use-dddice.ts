import { useNotifications } from '@/hooks';
import { DiceContext, useCurrentUser } from '@/stores';
import { ThreeDDice, ThreeDDiceRollEvent, type IRoll } from 'dddice-js';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  authenticateDddiceUser,
  createAuthCode,
  disconnect,
  getAuthCode,
  getThemes,
  joinRoom,
  logout,
  setToken,
} from './helpers';
import { standardTheme, type Dice, type DiceTheme, type Room, type UseDice } from './types';

interface Props {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const useDddice = ({ canvasRef }: Props): UseDice => {
  const { dicePanelOpen } = useContext(DiceContext);
  const dddiceRef = useRef<ThreeDDice | null>(null);

  const { currentUser } = useCurrentUser();

  const { addNotification } = useNotifications();

  console.log(canvasRef?.current);

  const dddice = dddiceRef.current;
  const dddiceRoomRef = useRef<string | null>(null);

  const [displayingRoll, setDisplayingRoll] = useState<boolean>(false);
  const [selectedTheme, setSelectedTheme] = useState<DiceTheme>(standardTheme);
  const [loading, setLoading] = useState<boolean>(false);
  const [userLoading, setUserLoading] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [roomPasscode, setRoomPasscode] = useState<string>('');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [error, setError] = useState<boolean>(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const userSecret = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const userTokenRef = useRef<string | null>(null);
  const usernameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!dddiceRef.current) {
      instantiateDddice();
    }
  }, [canvasRef, dicePanelOpen]);

  useEffect(() => {
    return () => {
      if (dddiceRoomRef.current && userTokenRef.current) {
        disconnect(dddiceRoomRef.current, userTokenRef.current);
      }
    };
  }, []);

  const instantiateDddice = async (overrideToken?: string) => {
    try {
      if (!canvasRef?.current) return;

      setUserLoading(true);

      if (dddiceRef.current) {
        dddiceRef.current.stop();
      }

      if (overrideToken) {
        setToken(overrideToken);
      }

      const diceUser = await authenticateDddiceUser();

      if (!diceUser) {
        setUserLoading(false);
        return;
      }

      const { roomSlug, roomName, roomPasscode, rooms, username, userToken, userId, lastTheme } =
        diceUser;

      userTokenRef.current = userToken;
      userIdRef.current = userId;
      usernameRef.current = username;
      dddiceRoomRef.current = roomSlug;

      setUsername(username);
      setRoomName(roomName);
      setAvailableRooms(rooms);

      if (roomPasscode) setRoomPasscode(roomPasscode);
      if (lastTheme) setSelectedTheme(lastTheme);

      if (canvasRef?.current) {
        dddiceRef.current = new ThreeDDice(canvasRef.current, userToken);
        dddiceRef.current.start();
      }

      dddiceRef.current?.on(ThreeDDiceRollEvent.RollFinished, (e: IRoll) => {
        if (!!userIdRef.current && e.user.uuid !== userIdRef.current) {
          // Someone else in the room rolled
          addNotification(`${e.user.username} rolled ${e.total_value}`, {
            type: 'info',
          });
        }

        setDisplayingRoll(true);
        setLoading(false);
      });

      if (roomSlug) {
        dddiceRef.current?.connect(roomSlug);
      }
      setError(false);
    } catch (e: any) {
      addNotification('Failed to connect to dddice', {
        type: 'error',
      });
      setError(true);
    } finally {
      setUserLoading(false);
    }
  };

  const roll = async (dice: Dice[]): Promise<Dice[]> => {
    try {
      setLoading(true);
      setDisplayingRoll(false);
      const diceToRoll = dice.filter((die) => !die.staticValue);

      console.log(diceToRoll);

      const res = await dddice?.roll(
        diceToRoll.map((die) => ({
          theme: selectedTheme.id,
          id: die.id,
          type: die.label ?? die.type,
          value: die.value,
        })),
      );

      const results = res?.data.values ?? [];

      const newRoomName = res?.data.room.name;
      if (!!newRoomName && !!roomName && newRoomName !== roomName) {
        setRoomName(newRoomName);
      }

      const finalResults: Dice[] = [
        ...results.map((res) => ({
          sides: parseInt(res.type.replace('d', '')),
          result: typeof res.value_to_display === 'number' ? res.value_to_display : res.value,
          displayResult:
            typeof res.value_to_display === 'number' || typeof res.value_to_display === 'string'
              ? res.value_to_display
              : undefined,
          displayImage: (res.value_to_display as { src: string })?.src ?? undefined,
          id: diceToRoll.find((d) => d.id === res.type)?.id ?? res.type,
          type: diceToRoll.find((d) => d.id === res.type)?.type ?? res.type,
          label: diceToRoll.find((d) => d.id === res.type)?.label ?? res.type,
        })),
        ...dice.filter((die) => die.staticValue),
      ];

      return finalResults;
    } catch (e: any) {
      setLoading(false);
      addNotification('Failed to roll dddice.', {
        type: 'error',
      });
      return [];
    }
  };

  const removeDice = async () => {
    if (!dddiceRef.current) return;
    dddiceRef.current.clear();
  };

  const handleCreateAuthCode = async () => {
    const { code, secret } = await createAuthCode({
      clearPoll,
    });
    userSecret.current = secret;
    return code;
  };

  const handleGetAuthCode = async (code: string) => {
    if (!userSecret.current) return;
    const { userToken: userAuthToken } = await getAuthCode({
      code,
      token: userSecret.current,
      clearPoll,
    });
    if (userAuthToken) {
      instantiateDddice(userAuthToken);
    }
  };

  const pollForAuth = async (code: string) => {
    pollRef.current = setInterval(async () => {
      handleGetAuthCode(code);
    }, 2000);
  };

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }
  };

  const handeGetThemes = async () => {
    if (!userTokenRef.current) return;
    const themes = await getThemes({ token: userTokenRef.current, clearPoll });
    return themes;
  };

  const handleJoinRoom = async (roomId: string, passcode?: string) => {
    if (!userTokenRef.current) return false;
    const { name, roomSlug } = await joinRoom({
      token: userTokenRef.current,
      clearPoll,
      roomId,
      passcode,
      username: currentUser?.username,
      userId: userIdRef.current ?? undefined,
    });

    setRoomName(name);

    if (dddiceRoomRef.current) {
      disconnect(dddiceRoomRef.current, userTokenRef.current);
      dddiceRef.current?.connect(roomSlug);
    }

    dddiceRoomRef.current = roomSlug;
    return true;
  };

  const handleSwapRoom = async (roomId: string) => {
    const room = availableRooms.find((r) => r.slug === roomId);
    if (!room) return;
    dddiceRef.current?.disconnect();
    dddiceRef.current?.connect(roomId);
    dddiceRoomRef.current = roomId;
    setRoomName(room.name);
    if (room.passcode) {
      setRoomPasscode(room.passcode);
    }
  };

  const handleLogout = () => {
    logout();
    setUsername('');
    setSelectedTheme(standardTheme);
  };

  const handleSetTheme = (theme: DiceTheme) => {
    localStorage.setItem('last-dice-theme', theme.id);
    setSelectedTheme(theme);
  };

  return {
    dddice,
    createAuthCode: handleCreateAuthCode,
    getThemes: handeGetThemes,
    joinRoom: handleJoinRoom,
    pollForAuth,
    roll,
    removeDice,
    clearPoll,
    displayingRoll,
    setDisplayingRoll,
    theme: selectedTheme,
    setTheme: handleSetTheme,
    loading,
    username,
    roomPasscode,
    roomName,
    availableRooms,
    logout: handleLogout,
    roomSlug: dddiceRoomRef.current ?? '',
    userLoading,
    error,
    swapRooms: handleSwapRoom,
  };
};
