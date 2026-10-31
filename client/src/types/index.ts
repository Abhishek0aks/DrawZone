export type Phase = 'lobby' | 'choosing' | 'drawing' | 'summary' | 'final';

export interface PlayerView {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isDrawer: boolean;
  hasGuessed: boolean;
}

export interface RankedPlayer {
  id: string;
  name: string;
  score: number;
  rank: number;
}

export interface TurnSummary {
  word: string | null;
  drawerId: string;
  drawerName: string;
  durationSeconds: number;
  guessers: { id: string; name: string; points: number }[];
  drawerPoints: number;
  reason: 'time' | 'all_guessed' | 'drawer_left';
  scores: RankedPlayer[];
  round: number;
  totalRounds: number;
  isLastTurn: boolean;
}

export interface FinalResult {
  ranking: RankedPlayer[];
  winners: string[];
}

// The room as ONE player is allowed to see it (built by the server).
export interface RoomView {
  youId: string;
  code: string;
  hostId: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  settings: { minPlayers: number; maxPlayers: number; drawSeconds: number; chooseSeconds: number };
  players: PlayerView[];
  drawerId: string | null;
  drawerName: string | null;
  hint: string | null; // "_____" for guessers
  word: string | null; // only the drawer, only while drawing
  deadline: number | null; // server clock (ms since epoch)
  serverNow: number;
  summary: TurnSummary | null;
  final: FinalResult | null;
  message: string | null;
}

export interface ChatMessage {
  id: number;
  kind: 'guess' | 'system' | 'correct';
  name?: string;
  text: string;
}

export type Ack<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface Point {
  x: number;
  y: number;
}
