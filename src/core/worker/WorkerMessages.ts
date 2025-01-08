import { GameUpdateViewData, PlayerActions, PlayerInteraction } from "../GameView";
import { GameConfig, GameID, Turn } from "../Schemas";
import { PlayerID } from "../game/Game";

export type WorkerMessageType =
    | 'init'
    | 'initialized'
    | 'turn'
    | 'game_update'
    | 'player_actions'
    | 'player_actions_result';

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

// Messages from worker to main thread
export interface InitializedMessage extends BaseWorkerMessage {
    type: 'initialized';
}

export interface GameUpdateMessage extends BaseWorkerMessage {
    type: 'game_update';
    gameUpdate: GameUpdateViewData;
}

export interface PlayerActionsMessage extends BaseWorkerMessage {
    type: 'player_actions'
    playerID: PlayerID
    x: number,
    y: number
}

export interface PlayerActionsResultMessage extends BaseWorkerMessage {
    type: 'player_actions_result';
    result: PlayerActions;
}

// Union types for type safety
export type MainThreadMessage = InitMessage | TurnMessage | PlayerActionsMessage

// Message send from worker
export type WorkerMessage = InitializedMessage | GameUpdateMessage | PlayerActionsResultMessage;