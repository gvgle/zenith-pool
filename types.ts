
export type Vector = {
  x: number;
  y: number;
};

export enum GameMode {
  PvP = 'PVP',
  PvE = 'PVE',
  EvE = 'EVE'
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export interface Ball {
  id: number;
  position: Vector;
  velocity: Vector;
  rotation: Vector; // 新增：用于记录球体在 X/Y 轴的旋转偏移
  radius: number;
  color: string;
  isStriped: boolean;
  number: number;
  inPocket: boolean;
}

export interface Pocket {
  position: Vector;
  radius: number;
}

export interface GameState {
  balls: Ball[];
  cueBall: Ball;
  currentPlayer: number;
  status: GameStatus;
  mode: GameMode;
  scores: [number, number];
  isMoving: boolean;
  pottedThisShot: boolean;
  winner: number | null;
}
