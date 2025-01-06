import { GameUpdateViewData } from "../GameView";
import { GameConfig, GameID, Turn } from "../Schemas";
import { PlayerID } from "../game/Game";

export type WorkerMessageType =
    | 'init'
    | 'initialized'
    | 'turn'
    | 'game_update'
    | 'shares_border'
    | 'shares_border_result';

// Base interface for all messages
interface BaseWorkerMessage {
    type: WorkerMessageType;
    id?: string;
}

// Messages from main thread to worker
export interface InitMessage extends BaseWorkerMessage {
    type: 'init';
    gameID: GameID;
    gameConfig: GameConfig;
}

export interface TurnMessage extends BaseWorkerMessage {
    type: 'turn';
    turn: Turn;
}

export interface SharesBorderMessage extends BaseWorkerMessage {
    type: 'shares_border';
    player1: PlayerID;
    player2: PlayerID;
}

// Messages from worker to main thread
export interface InitializedMessage extends BaseWorkerMessage {
    type: 'initialized';
}

export interface GameUpdateMessage extends BaseWorkerMessage {
    type: 'game_update';
    gameUpdate: GameUpdateViewData;
}

export interface SharesBorderResultMessage extends BaseWorkerMessage {
    type: 'shares_border_result';
    result: boolean;
}

// Union types for type safety
export type MainThreadMessage = InitMessage | TurnMessage | SharesBorderMessage;
export type WorkerMessage = InitializedMessage | GameUpdateMessage | SharesBorderResultMessage;