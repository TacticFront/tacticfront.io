import { PlayerActions, PlayerID, Tile } from "../game/Game";
import { GameUpdateViewData } from "../GameView";
import { GameConfig, GameID, Turn } from "../Schemas";
import { generateID } from "../Util";
import { WorkerMessage } from "./WorkerMessages";

export class WorkerClient {
    private worker: Worker;
    private isInitialized = false;
    private messageHandlers: Map<string, (message: WorkerMessage) => void>;
    private gameUpdateCallback?: (update: GameUpdateViewData) => void;

    constructor(private gameID: GameID, private gameConfig: GameConfig) {
        this.worker = new Worker(new URL('./Worker.worker.ts', import.meta.url));
        this.messageHandlers = new Map();

        // Set up global message handler
        this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
    }

    private handleWorkerMessage(event: MessageEvent<WorkerMessage>) {
        const message = event.data;

        switch (message.type) {
            case 'game_update':
                if (this.gameUpdateCallback && message.gameUpdate) {
                    this.gameUpdateCallback(message.gameUpdate);
                }
                break;

            case 'initialized':
            case 'player_actions_result':
                if (message.id && this.messageHandlers.has(message.id)) {
                    const handler = this.messageHandlers.get(message.id)!;
                    handler(message);
                    this.messageHandlers.delete(message.id);
                }
                break;
        }
    }

    initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            const messageId = generateID()

            this.messageHandlers.set(messageId, (message) => {
                if (message.type === 'initialized') {
                    this.isInitialized = true;
                    resolve();
                }
            });

            this.worker.postMessage({
                type: 'init',
                id: messageId,
                gameID: this.gameID,
                gameConfig: this.gameConfig
            });

            // Add timeout for initialization
            setTimeout(() => {
                if (!this.isInitialized) {
                    this.messageHandlers.delete(messageId);
                    reject(new Error('Worker initialization timeout'));
                }
            }, 5000); // 5 second timeout
        });
    }

    start(gameUpdate: (gu: GameUpdateViewData) => void) {
        if (!this.isInitialized) {
            throw new Error('Failed to initialize pathfinder');
        }
        this.gameUpdateCallback = gameUpdate;
    }

    sendTurn(turn: Turn) {
        if (!this.isInitialized) {
            throw new Error('Worker not initialized');
        }

        this.worker.postMessage({
            type: 'turn',
            turn
        });
    }

    sendHeartbeat() {
        this.worker.postMessage({
            type: 'heartbeat'
        });
    }

    playerInteraction(playerID: PlayerID, tile: Tile): Promise<PlayerActions> {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const messageId = generateID()

            this.messageHandlers.set(messageId, (message) => {
                if (message.type === 'player_actions_result' && message.result !== undefined) {
                    resolve(message.result);
                }
            });

            this.worker.postMessage({
                type: 'player_actions',
                id: messageId,
                playerID: playerID,
                x: tile.cell().x,
                y: tile.cell().y
            });
        });
    }



    cleanup() {
        this.worker.terminate();
        this.messageHandlers.clear();
        this.gameUpdateCallback = undefined;
    }
}