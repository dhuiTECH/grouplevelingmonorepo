import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Admin: undefined;
  Avatar: undefined;
  ClassSelection: { avatarConfig?: any } | undefined;
  Dashboard: undefined;
  Dungeon: undefined;
  Home: undefined;
  Inventory: undefined;
  Login: undefined;
  Shop: undefined;
  Signup: undefined;
  Social: undefined;
  Temple: undefined;
  Training: undefined;
  WorldMap: undefined;
  PetDetail: { pet: any };
  Battle: { encounterId?: string; raidId?: string; isBoss?: boolean };
  DungeonTracker: { dungeon: any };
  RunComplete: { runData: any; dungeon: any };
  DungeonLeaderboard: { dungeon: any };
};

export type RootTabParamList = {
  Temple: undefined;
  Hunter: undefined;
  System: undefined;
  Shop: undefined;
  Social: undefined;
  WorldMap: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}