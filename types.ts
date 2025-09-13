
export enum Role {
  VILLAIN = 'Office Villain',
  COLLEAGUE = 'Good Colleague',
}

export enum GamePhase {
  WELCOME,
  SETUP,
  DAY_INTRO,
  DAY_DISCUSSION,
  VOTING,
  VOTE_RESULT,
  NIGHT,
  END_WIN,
  END_LOSE,
}

export interface Character {
  name: string;
  title: string;
  role: Role;
  isPlayer: boolean;
  isAlive: boolean;
  avatarUrl: string;
}

export interface Dialogue {
  speaker: string; // 'system', or character name
  message: string;
}
