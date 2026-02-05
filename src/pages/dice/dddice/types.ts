import { ThreeDDice } from 'dddice-js';

export type AvailableDiceObject = {
  type: string;
  notation: string;
  id: string;
};

export type DiceTheme = {
  label: string;
  previews: Record<string, string>;
  bannerPreview: string;
  id: string;
  availableDice: Array<string | AvailableDiceObject>;
};

export type Dice = {
  type: string;
  id?: string;
  sides?: number;
  value?: number;
  result?: number;
  displayResult?: string;
  displayImage?: string;
  label?: string;
  staticValue?: number;
};

export type Arguments = {
  clearPoll: () => void;
  token: string;
  code?: string;
  userIsConnected?: boolean;
  roomId?: string;
  passcode?: string;
  username?: string;
  userId?: string;
};

export type Room = {
  name: string;
  slug: string;
  passcode?: string;
};

export type DiceUser = {
  username: string;
  userToken: string;
  userId: string;
  roomSlug: string;
  roomName: string;
  lastTheme?: DiceTheme;
  roomPasscode?: string;
  rooms: Room[];
};

export const standardTheme: DiceTheme = {
  label: 'Bees',
  availableDice: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'],
  previews: {
    d4: 'https://cdn.dddice.com/themes/dddice-bees/preview/d4-df142beff855c1b97673e73ebdd5f504.png',
    d6: 'https://cdn.dddice.com/themes/dddice-bees/preview/d6-487063ea4817fa186f66bd37e5058451.png',
    d8: 'https://cdn.dddice.com/themes/dddice-bees/preview/d8-32b98b546d06f94bea2d94807b716594.png',
    d10: 'https://cdn.dddice.com/themes/dddice-bees/preview/d10-b759cee28523cfb12595a9e243f3c2a0.png',
    d12: 'https://cdn.dddice.com/themes/dddice-bees/preview/d12-2ddc866bb2ec965569d4397fe76fdf50.png',
    d20: 'https://cdn.dddice.com/themes/dddice-bees/preview/d20-65347c7e76ec2a66c8a66b09631255f1.png',
  },
  bannerPreview:
    'https://cdn.dddice.com/themes/dddice-bees/preview/d20-65347c7e76ec2a66c8a66b09631255f1.png',
  id: 'dddice-bees',
};

export interface UseDice {
  dddice: ThreeDDice | null;
  displayingRoll: boolean;
  roll: (dice: Dice[]) => Promise<Dice[]>;
  removeDice: () => void;
  setDisplayingRoll: React.Dispatch<React.SetStateAction<boolean>>;
  getThemes: () => Promise<any>;
  theme: DiceTheme;
  setTheme: (theme: DiceTheme) => void;
  loading: boolean;
  createAuthCode: () => Promise<string>;
  pollForAuth: (code: string) => Promise<void>;
  clearPoll: () => void;
  username?: string;
  joinRoom: (roomId: string, passcode?: string) => Promise<boolean>;
  roomName: string;
  roomSlug: string;
  logout: () => void;
  availableRooms: Room[];
  userLoading: boolean;
  swapRooms: (roomSlug: string) => void;
  roomPasscode?: string;
  error: boolean;
}
