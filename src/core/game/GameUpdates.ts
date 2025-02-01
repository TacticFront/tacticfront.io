import { ClientID } from "../Schemas";
import {
  EmojiMessage,
  GameUpdates,
  MapPos,
  MessageType,
  NameViewData,
  PlayerID,
  PlayerType,
  Tick,
  UnitType,
} from "./Game";
import { TileUpdate } from "./GameMap";

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
  AllianceRequest,
  AllianceRequestReply,
  BrokeAlliance,
  AllianceExpired,
  TargetPlayer,
  EmojiUpdate,
  WinUpdate,
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
  | TargetPlayerUpdate
  | EmojiUpdate
  | WinUpdate;

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
  pos: MapPos;
  lastPos: MapPos;
  isActive: boolean;
  health?: number;
}

export interface PlayerUpdate {
  type: GameUpdateType.Player;
  nameViewData?: NameViewData;
  clientID: ClientID;
  name: string;
  displayName: string;
  id: PlayerID;
  smallID: number;
  playerType: PlayerType;
  isAlive: boolean;
  tilesOwned: number;
  gold: number;
  population: number;
  workers: number;
  troops: number;
  targetTroopRatio: number;
  allies: number[];
  isTraitor: boolean;
  targets: number[];
  outgoingEmojis: EmojiMessage[];
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
  type: GameUpdateType.EmojiUpdate;
  emoji: EmojiMessage;
}

export interface DisplayMessageUpdate {
  type: GameUpdateType.DisplayEvent;
  message: string;
  messageType: MessageType;
  playerID: number | null;
}

export interface WinUpdate {
  type: GameUpdateType.WinUpdate;
  winnerID: number;
}
