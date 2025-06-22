// src/core/game/GameUpdates.ts

import { AllPlayersStats, ClientID } from "../Schemas";
import { AttackStats } from "./AttackImpl";
import {
  EmojiMessage,
  GameUpdates,
  Gold,
  MessageType,
  NameViewData,
  PlayerID,
  PlayerTypeKey,
  Team,
  Tick,
  UnitType,
} from "./Game";
import { TileRef, TileUpdate } from "./GameMap";

export interface GameUpdateViewData {
  tick: number;
  updates: GameUpdates;
  packedTileUpdates: BigUint64Array;
  playerNameViewData: Record<number, NameViewData>;
}

export interface ErrorUpdate {
  errMsg: string;
  stack?: string;
}

export enum GameUpdateType {
  Tile,
  Unit,
  Player,
  DisplayEvent,
  DisplayChatEvent,
  AllianceRequest,
  AllianceRequestReply,
  BrokeAlliance,
  AllianceExpired,
  TargetPlayer,
  Emoji,
  Win,
  Hash,
  UnitIncoming,
}

export type GameUpdate =
  | TileUpdateWrapper
  | UnitUpdate
  | PlayerUpdate
  | AllianceRequestUpdate
  | AllianceRequestReplyUpdate
  | BrokeAllianceUpdate
  | AllianceExpiredUpdate
  | DisplayMessageUpdate
  | DisplayChatMessageUpdate
  | TargetPlayerUpdate
  | EmojiUpdate
  | WinUpdate
  | HashUpdate
  | UnitIncomingUpdate;

export interface TileUpdateWrapper {
  type: GameUpdateType.Tile;
  update: TileUpdate;
}

export interface UnitUpdate {
  type: GameUpdateType.Unit;
  unitType: UnitType;
  troops: number;
  id: number;
  ownerID: number;
  lastOwnerID?: number;
  // TODO: make these tilerefs
  pos: TileRef;
  lastPos: TileRef;
  isActive: boolean;
  reachedTarget: boolean;
  retreating: boolean;
  targetUnitId?: number; // Only for trade ships
  targetTile?: TileRef; // Only for nukes
  health?: number;
  constructionType?: UnitType;
  // ticksLeftInCooldown?: Tick;
  cooldownEndTick?: Tick;
  repairEndTick?: Tick;
  // isDamaged?: boolean;
  // repairCooldown?: number;
  stockpile: Map<string, number>;
}

export interface AttackUpdate {
  attkrid: number;
  tgt: number; //target id
  t: number; // troops
  id: string;
  re?: boolean; // retreating
  b: number; // border tile id
  stats?: AttackStats; // attack stats, if available
}

export interface PlayerUpdate {
  type: GameUpdateType.Player;
  vars?: Map<string, string | number | boolean | null>;
  nameViewData?: NameViewData;
  cid?: ClientID | null;
  f?: string | undefined;
  n: string;
  displayName?: string;
  id: PlayerID;
  team?: Team;
  sid: number;
  pt?: PlayerTypeKey;
  isAlive?: boolean;
  isDisconnected?: boolean;
  ti: number;
  g: Gold;
  ga?: Gold;
  pa?: number;
  mp: number;
  w: number;
  t: number;
  o?: number;
  // targetTroopRatio: number;
  // reserveTroopRatio: number;
  allies?: number[];
  embargoes?: Set<PlayerID>;
  isTraitor?: boolean;
  targets?: number[];
  outgoingEmojis?: EmojiMessage[]; // null means no emojis sent
  oa?: AttackUpdate[];
  ia?: AttackUpdate[];
  outgoingAllianceRequests?: PlayerID[];
  hasSpawned?: boolean;
  techLevel?: number | null; // null means no tech level
  unlockedTechnologies?: Set<string> | null; // null means no technologies unlocked
  betrayals?: number | null; // null means no betrayals
}

export interface AllianceRequestUpdate {
  type: GameUpdateType.AllianceRequest;
  requestorID: number;
  recipientID: number;
  createdAt: Tick;
}

export interface AllianceRequestReplyUpdate {
  type: GameUpdateType.AllianceRequestReply;
  request: AllianceRequestUpdate;
  accepted: boolean;
}

export interface BrokeAllianceUpdate {
  type: GameUpdateType.BrokeAlliance;
  traitorID: number;
  betrayedID: number;
}

export interface AllianceExpiredUpdate {
  type: GameUpdateType.AllianceExpired;
  player1ID: number;
  player2ID: number;
}

export interface TargetPlayerUpdate {
  type: GameUpdateType.TargetPlayer;
  playerID: number;
  targetID: number;
}

export interface EmojiUpdate {
  type: GameUpdateType.Emoji;
  emoji: EmojiMessage;
}

export interface DisplayMessageUpdate {
  type: GameUpdateType.DisplayEvent;
  message: string;
  messageType: MessageType;
  playerID: number | null;
}

export type DisplayChatMessageUpdate = {
  type: GameUpdateType.DisplayChatEvent;
  key: string;
  category: string;
  variables?: Record<string, string>;
  playerID: number | null;
  isFrom: boolean;
  recipient: string;
};

export interface WinUpdate {
  type: GameUpdateType.Win;
  allPlayersStats: AllPlayersStats;
  // Player id or team name.
  winner: ["player", number] | ["team", Team];
}

export interface HashUpdate {
  type: GameUpdateType.Hash;
  tick: Tick;
  hash: number;
}

export interface UnitIncomingUpdate {
  type: GameUpdateType.UnitIncoming;
  unitID: number;
  message: string;
  messageType: MessageType;
  playerID: number;
}
