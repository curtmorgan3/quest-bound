import type { Arguments, DiceTheme, DiceUser, Room } from '@/types';

const TOKEN_COOKIE_NAME = 'dddice-user-token';
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const getToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + TOKEN_COOKIE_NAME + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

export const setToken = (token: string) => {
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${TOKEN_COOKIE_MAX_AGE}; SameSite=Lax`;
};

const removeToken = () => {
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0`;
};

export const authenticateDddiceUser = async (): Promise<DiceUser | null> => {
  const token = getToken();

  if (token) {
    const user = await getUser(token);
    const { slug, name, passcode, rooms } = await getLastRoom(token);
    const theme = await getLastTheme(token);
    return {
      roomSlug: slug,
      roomName: name,
      lastTheme: theme ?? undefined,
      roomPasscode: passcode,
      userToken: token,
      username: user.data.username,
      userId: user.data.uuid,
      rooms,
    };
  }

  return null;
};

export const createAuthCode = async ({ clearPoll }: { clearPoll: () => void }) => {
  clearPoll();

  const res = await fetch('https://dddice.com/api/1.0/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  return {
    code: data.data.code,
    secret: data.data.secret,
  };
};

export const getAuthCode = async ({
  code,
  token,
  clearPoll,
}: Arguments): Promise<Partial<DiceUser>> => {
  const res = await fetch(`https://dddice.com/api/1.0/activate/${code}`, {
    headers: {
      Authorization: `Secret ${token}`,
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  if (data.data.token) {
    clearPoll();

    return {
      username: data.data.user.username,
      userToken: data.data.token,
      userId: data.data.user.uuid,
    };
  }

  return {
    username: '',
  };
};

export const getThemes = async ({ token }: Arguments) => {
  const res = await fetch('https://dddice.com/api/1.0/dice-box', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const getLastTheme = async (token: string): Promise<DiceTheme | null> => {
  const lastTheme = localStorage.getItem('last-dice-theme');
  if (!lastTheme) return null;

  const themes = await getThemes({ token, clearPoll: () => {} });
  const theme = themes.data.find((t: any) => t.id === lastTheme);
  if (!theme) return null;
  return {
    id: theme.id,
    label: theme.name,
    previews: theme.preview,
    availableDice: theme.available_dice ?? [],
    bannerPreview:
      theme.preview.preview ?? theme.preview.d20 ?? Object.values(theme.preview)[0] ?? '',
  };
};

export const disconnect = async (roomSlug: string, token: string) => {
  await fetch(`https://dddice.com/api/1.0/room/${roomSlug}/participant`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

let creatingRoom = false;

const getLastRoom = async (token: string): Promise<Room & { rooms: Room[] }> => {
  const rooms = await getRooms(token);
  const prevSlug = localStorage.getItem('dddice-room');
  if (prevSlug) {
    const prevRoom = rooms.find((r: any) => r.slug === prevSlug);
    if (prevRoom) {
      return {
        ...prevRoom,
        rooms,
      };
    }
  }

  if (!creatingRoom) {
    creatingRoom = true;
    const { slug, name } = await createRoom(token);
    const roomsWithNew = await getRooms(token);

    localStorage.setItem('dddice-room', slug);
    creatingRoom = false;
    return {
      slug,
      name,
      rooms: roomsWithNew,
    };
  }

  return {
    rooms: [],
    name: '',
    slug: '',
  };
};

const getUser = async (token: string) => {
  const res = await fetch('https://dddice.com/api/1.0/user', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export const getRooms = async (token: string): Promise<Room[]> => {
  const res = await fetch('https://dddice.com/api/1.0/room', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data;
};

const createRoom = async (token: string, name = 'Quest Bound'): Promise<Room> => {
  const res = await fetch('https://dddice.com/api/1.0/room', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { slug: data.data.slug, name: data.data.name };
};

export const joinRoom = async ({ token, roomId, passcode, username, userId }: Arguments) => {
  // User is already a member of the room
  const roomRes = await fetch(`https://dddice.com/api/1.0/room/${roomId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!roomRes.ok) throw new Error(`HTTP ${roomRes.status}`);
  const room = await roomRes.json();

  const currentParticipants = room.data.data.participants;
  let userParticipant = currentParticipants.find((p: any) => p.user.uuid === userId);

  if (userParticipant) {
    return {
      roomSlug: room.data.data.slug,
      numParticipants: room.data.data.participants.length,
      name: room.data.data.name,
    };
  }

  // Join room as new user
  const res = await fetch(`https://dddice.com/api/1.0/room/${roomId}/participant`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ passcode }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const resData = await res.json();

  const participants = room.data.data.participants;
  userParticipant = participants.find((p: any) => p.user.uuid === userId);

  // Update with QB username
  if (userParticipant && username) {
    const patchRes = await fetch(
      `https://dddice.com/api/1.0/room/${roomId}/participant/${userParticipant.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode, username }),
      },
    );
    if (!patchRes.ok) throw new Error(`HTTP ${patchRes.status}`);
  }

  return {
    roomSlug: resData.data.slug,
    numParticipants: resData.data.participants.length,
    name: resData.data.name,
  };
};

export const leaveRoom = async ({ token, roomId, userId }: Arguments) => {
  const roomRes = await fetch(`https://dddice.com/api/1.0/room/${roomId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!roomRes.ok) throw new Error(`HTTP ${roomRes.status}`);
  const room = await roomRes.json();

  const currentParticipants = room.data.data.participants;
  const userParticipant = currentParticipants.find((p: any) => p.user.uuid === userId);

  if (userParticipant) {
    const res = await fetch(
      `https://dddice.com/api/1.0/room/${roomId}/participant/${userParticipant.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  return true;
};

export const logout = () => {
  removeToken();
};
